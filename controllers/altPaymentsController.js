const { CREDIT_PAYMENT, GATEWAY_PAYMENT, EXTERNAL_PAYMENT, PAYMENT_COMPLETED, ORDER, PAID, RENTAL_TIME_FRAME_EXTENSION, PAYMENT, ADMIN, SUCCESS, COMPLETED } = require("../config/constants");
const Customer = require("../db/models/Customer");
const Notification = require("../db/models/notifications/Notification");
const Order = require("../db/models/Order");
const CreditPayment = require("../db/models/payments/CreditPayment");
const ExternalPayment = require("../db/models/payments/ExternalPayment");
const GatewayPayment = require("../db/models/payments/GatewayPayment");
const Payment = require("../db/models/payments/Payment");
const RentalItem = require("../db/models/RentalItem");
const RentalPackage = require("../db/models/RentalPackage");
const RentalTimeFrameExtension = require("../db/models/RentalTimeFrameExtension");
const User = require("../db/models/User");
const { arrayContainsValue, startWithUpperCase, getBaseDirPath, base64_encode, properlizeWords } = require("../helpers");
const email = require("../serviceProviders/email");
const { PAYMENT_COMPLETION } = require("../serviceProviders/socketIOManager");
const stripe = require("../serviceProviders/stripe");

class PaymentsController {
    async fetch1(req, res, next) {
        const payment = await Payment.findOne({ _id: req.params.id });

        if (payment) {
            res.status(200).send(await payment.getFields());
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async fetch(req, res, next) {

        let query = Payment.find();

        if (req?.query?.status) {
            query = query.where('status').equals(req.query.status);
        }

        if (req?.query?.orderId) {
            query = query.where('resourceId').equals(req.query.orderId);
        }

        if (req?.query?.customerId) {
            query = query.where('customerId').equals(req.query.customerId);
        }

        query = query.sort({ updatedAt: -1 });

        const payments = await query.exec();

        if (payments) {
            let objArr = [];

            for (let i = 0; i < payments.length; i++) {
                objArr[i] = payments[i].getEnumFields();
            }

            res.status(200).send(objArr);
            return;
        }


        next('Something went wrong. Please, try again.')
    }

    extractBankDetails(req) {
        if (!req.body?.accountNumber || req.body?.accountNumber === '') {
            return null;
        }

        return {
            bankName: req.body.bankName,
            accountName: req.body.accountName,
            accountNumber: req.body.accountNumber
        };
    }

    async tryEmailCustomer4Payment(template, emailAddr, subject, emailData) {
        return await email.send({
            template: template,
            message: {
                to: emailAddr,
                subject: subject
            },
            locals: emailData
        });
    }

    async tryEmailCustomer4GatewayPayment(emailData, emailAddr, attachments = null) {
        return await email.send({
            template: 'gatewayPaymentRequest4Order',
            message: {
                to: emailAddr,
                attachments,
                subject: 'Bill for Your Order'
            },
            locals: emailData
        });
    }

    async tryEmailCustomer4OrderGatewayPayment(emailData, emailAddr, attachments = null) {
        return await email.send({
            template: 'gatewayPaymentRequest4Order',
            message: {
                to: emailAddr,
                attachments,
                subject: 'Bill for Your Order'
            },
            locals: emailData
        });
    }

    async tryEmailCustomer4TimeFrameExtensionGatewayPayment(emailData, emailAddr) {
        return await email.send({
            template: 'gatewayPaymentRequest4TimeFrameExtension',
            message: {
                to: emailAddr,
                subject: 'Bill for Your Order Time-Frame Extension'
            },
            locals: emailData
        });
    }

    async tryEmailCustomer4ExternalPayment(emailData, emailAddr) {
        return await email.send({
            template: 'bankTransferRequest',
            message: {
                to: emailAddr,
                subject: 'Bill for Your Order'
            },
            locals: emailData
        });
    }

    async tryEmailCustomer4TimeFrameExtensionExternalPayment(emailData, emailAddr) {
        return await email.send({
            template: 'bankTransferRequest4TimeFrameExtension',
            message: {
                to: emailAddr,
                subject: 'Bill for Your Order Time-Frame Extension'
            },
            locals: emailData
        });
    }

    async mkOrderCreditPayment(order, amount2Pay = null) {

        try {
            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            const amount = amount2Pay ? amount2Pay : await rentalPackage.getTotalPrice();

            const payment = await Payment.create({
                customerId: order.customerId,
                type: CREDIT_PAYMENT,
                resourceType: ORDER,
                resourceId: order._id,
                amount,
                status: PAYMENT_COMPLETED
            });

            const creditPayment = await CreditPayment.create({
                paymentId: payment._id,
            });

            if (creditPayment) {
                return true;
            }
        } catch (err) {
            throw new Error(`while making payment from credit-balance: ${err}`);
        }

        return false;
    }

    async initOrderGatewayPayment(order, amount2Pay) {

        try {

            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            const amount = amount2Pay ? amount2Pay : await rentalPackage.getTotalPrice();
            const customer = await Customer.findOne({ _id: order.customerId });
            const user = await User.findOne({ _id: customer.userId });

            const emailData = {
                firstName: startWithUpperCase(user.firstName),
                rentalItems: [],
                rentalDays: rentalPackage.rentalDaysCount,
                transportationFee: rentalPackage.transportationFee,
                totalPrice: amount,
            };


            let line_items = [];
            let itr = 0;

            for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                emailData.rentalItems[i] = {
                    name: rentalItem.name,
                    count: rentalPackage.rentalItems[i].count,
                    imgCid: (rentalItem.imgSrc.split('/')[3]),
                    img: base64_encode(`${getBaseDirPath()}/public${rentalItem.imgSrc}`),
                    imgMime: `image/${rentalItem.imgSrc.split('.')[1]}`,
                    subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                };

                line_items[i] = {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: rentalItem.name
                        },
                        unit_amount: rentalItem.pricePerDay * rentalPackage.rentalDaysCount * 100
                    },
                    quantity: rentalPackage.rentalItems[i].count
                }
            }

            line_items[line_items.length] = {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Transportation Fee'
                    },
                    unit_amount: rentalPackage.transportationFee * 100
                },
                quantity: 1
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                line_items,
                success_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/cancel`
            })

            emailData.checkoutLink = session.url;

            const controller = new PaymentsController();

            if (await controller.tryEmailCustomer4GatewayPayment(emailData, user.email)) {

                const payment = await Payment.create({
                    customerId: customer._id,
                    type: GATEWAY_PAYMENT,
                    resourceType: ORDER,
                    resourceId: order._id,
                    amount
                });

                const gatewayPayment = await GatewayPayment.create({
                    paymentId: payment._id,
                    sessionId: session.id,
                });

                if (gatewayPayment) {
                    return true;
                }
            }
        } catch (err) {

            console.log('Error ', err);
            throw new Error(`while tring to initialize payment through ${GATEWAY_PAYMENT}: ${err}`);
        }

        return true;
    }

    async initTimeFrameExtensionGatewayPayment(timeFrameExtension, amount2Pay) {

        try {

            const rentalPackage = await RentalPackage.findOne({ _id: timeFrameExtension.rentalPackageId });

            const order = await Order.findOne({ rentalPackageId: rentalPackage._id });

            const amount = amount2Pay ? amount2Pay : await rentalPackage.getTotalPrice(timeFrameExtension.daysCount, true);

            const customer = await Customer.findOne({ _id: order.customerId });
            const user = await User.findOne({ _id: customer.userId });

            const emailData = {
                firstName: startWithUpperCase(user.firstName),
                rentalItems: [],
                rentalDays: timeFrameExtension.daysCount,
                transportationFee: rentalPackage.transportationFee,
                totalPrice: amount,
            };


            let line_items = [];
            let itr = 0;

            for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                emailData.rentalItems[i] = {
                    name: rentalItem.name,
                    count: rentalPackage.rentalItems[i].count,
                    imgCid: (rentalItem.imgSrc.split('/')[3]),
                    img: base64_encode(`${getBaseDirPath()}/public${rentalItem.imgSrc}`),
                    imgMime: `image/${rentalItem.imgSrc.split('.')[1]}`,
                    subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, timeFrameExtension.daysCount)
                };

                line_items[i] = {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: rentalItem.name
                        },
                        unit_amount: rentalItem.pricePerDay * timeFrameExtension.daysCount * 100
                    },
                    quantity: rentalPackage.rentalItems[i].count
                }
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                line_items,
                success_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/cancel`
            })

            emailData.checkoutLink = session.url;

            const controller = new PaymentsController();

            if (await controller.tryEmailCustomer4TimeFrameExtensionGatewayPayment(emailData, user.email)) {

                const payment = await Payment.create({
                    customerId: customer._id,
                    type: GATEWAY_PAYMENT,
                    resourceType: RENTAL_TIME_FRAME_EXTENSION,
                    resourceId: timeFrameExtension._id,
                    amount
                });

                const gatewayPayment = await GatewayPayment.create({
                    paymentId: payment._id,
                    sessionId: session.id,
                });

                if (gatewayPayment) {
                    return true;
                }
            }
        } catch (err) {

            console.log('Error ', err);
            throw new Error(`while tring to initialize payment through ${GATEWAY_PAYMENT}: ${err}`);
        }

        return true;
    }

    async completeGatewayPayment(req, res, next) {
        const session_id = req.query?.session_id;

        if (session_id) {
            const session = await stripe.checkout.sessions.retrieve(session_id);

            if (session && session.payment_status === PAID) {
                const gatewayPayment = await GatewayPayment.findOne({ sessionId: session_id });

                const payment = await Payment.findOneAndUpdate({ _id: gatewayPayment.paymentId }, { status: PAYMENT_COMPLETED });

                let order = null

                if (payment.resourceType) {
                    order = await Order.findOne({ _id: payment.resourceId });
                } else {
                    const timeExt = await RentalTimeFrameExtension.findOne({ _id: payment.resourceId });
                    order = await Order.find({ rentalPackageId: timeExt.rentalPackageId });
                }

                await Notification.create({
                    actorUserId: payment.customerId,
                    msg: `Payment for ${payment.resourceType} completed`,
                    action: PAYMENT_COMPLETION,
                    resourceType: PAYMENT,
                    resourceId: payment._id,
                    targetUserId: order.staffId,
                    orderId: order._id,
                    targetRole: ADMIN,
                    indicates: SUCCESS
                });

                if (payment && await payment.save()) {
                    //redirect to success page
                    await stripe.checkout.sessions.expire(session_id);
                    res.status(200).send({
                        msg: "Everywhere good."
                    });
                    return;
                }

            }
        }

        next('Something went wrong. Please, try again.')
    }

    /**
     * payment not linked to the system, but manually registered by staff into system after completion 
     * @param {*} order 
     */
    async initOrderExternalPayment(order, bankDetails, amount2Pay = null) {

        try {

            const controller = new PaymentsController();

            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            const amount = amount2Pay ? amount2Pay : await rentalPackage.getTotalPrice();

            const customer = await Customer.findOne({ _id: order.customerId });
            const user = await User.findOne({ _id: customer.userId });

            const emailData = {
                firstName: startWithUpperCase(user.firstName),
                rentalItems: [],
                rentalDays: rentalPackage.rentalDaysCount,
                transportationFee: rentalPackage.transportationFee,
                totalPrice: amount,
                bankName: bankDetails.bankName,
                accountName: bankDetails.accountName,
                accountNumber: bankDetails.accountNumber
            };

            for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                emailData.rentalItems[i] = {
                    name: rentalItem.name,
                    count: rentalPackage.rentalItems[i].count,
                    imgCid: (rentalItem.imgSrc.split('/')[3]),
                    img: base64_encode(`${getBaseDirPath()}/public${rentalItem.imgSrc}`),
                    imgMime: `image/${rentalItem.imgSrc.split('.')[1]}`,
                    subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                };

            }

            if (await controller.tryEmailCustomer4ExternalPayment(emailData, user.email)) {

                const payment = await Payment.create({
                    customerId: order.customerId,
                    type: EXTERNAL_PAYMENT,
                    resourceType: ORDER,
                    resourceId: order._id,
                    amount
                })

                const externalPayment = await ExternalPayment.create({
                    paymentId: payment._id,
                    ...bankDetails
                });

                if (externalPayment) {
                    return true;
                }
            }

        } catch (err) {
            console.log('Error ', err);
            throw new Error(`while tring to initialize payment through ${EXTERNAL_PAYMENT}: ${err}`);
        }


        return false;
    }

    /**
     * payment not linked to the system, but manually registered by staff into system after completion 
     * @param {*} timeFrameExtension 
     */
    async initTimeFrameExtensionExternalPayment(timeFrameExtension, bankDetails, amount2Pay = null) {

        try {

            const controller = new PaymentsController();

            const rentalPackage = await RentalPackage.findOne({ _id: timeFrameExtension.rentalPackageId });

            const order = await Order.findOne({ rentalPackageId: rentalPackage._id });

            const amount = amount2Pay ? amount2Pay : await rentalPackage.getTotalPrice(timeFrameExtension.daysCount, true);

            const customer = await Customer.findOne({ _id: order.customerId });
            const user = await User.findOne({ _id: customer.userId });

            const emailData = {
                firstName: startWithUpperCase(user.firstName),
                rentalItems: [],
                rentalDays: timeFrameExtension.daysCount,
                totalPrice: amount,
                bankName: bankDetails.bankName,
                accountName: bankDetails.accountName,
                accountNumber: bankDetails.accountNumber
            };

            for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                emailData.rentalItems[i] = {
                    name: rentalItem.name,
                    count: rentalPackage.rentalItems[i].count,
                    imgCid: (rentalItem.imgSrc.split('/')[3]),
                    img: base64_encode(`${getBaseDirPath()}/public${rentalItem.imgSrc}`),
                    imgMime: `image/${rentalItem.imgSrc.split('.')[1]}`,
                    subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, timeFrameExtension.daysCount)
                };

            }

            if (await controller.tryEmailCustomer4TimeFrameExtensionExternalPayment(emailData, user.email)) {

                const payment = await Payment.create({
                    customerId: order.customerId,
                    type: EXTERNAL_PAYMENT,
                    resourceType: RENTAL_TIME_FRAME_EXTENSION,
                    resourceId: timeFrameExtension._id,
                    amount
                })

                const externalPayment = await ExternalPayment.create({
                    paymentId: payment._id,
                    ...bankDetails
                });

                if (externalPayment) {
                    return true;
                }
            }

        } catch (err) {
            console.log('Error ', err);
            throw new Error(`while tring to initialize payment through ${EXTERNAL_PAYMENT}: ${err}`);
        }


        return false;
    }

    async completeExternalPayment(req, res, next) {

        const externalPayment = await ExternalPayment.findOneAndUpdate({ paymentId: req.params.id }, { referenceNumber: req.body.refNumber });

        if (externalPayment) {
            const payment = await Payment.findOneAndUpdate({ _id: req.params.id }, { status: PAYMENT_COMPLETED });

            if (payment) {

                let order = null;

                switch (payment.resourceType) {
                    case ORDER:
                        order = await Order.findOne({ _id: payment.resourceId });
                        break;
                    case RENTAL_TIME_FRAME_EXTENSION:
                        const timeExt = await RentalTimeFrameExtension.findOne({ _id: payment.resourceId });
                        order = await Order.findOne({ rentalPackageId: timeExt.rentalPackageId });
                        break;
                    default:
                        break;
                }


                await Notification.create({
                    actorUserId: payment.customerId,
                    msg: `Payment for ${payment.resourceType} completed`,
                    action: PAYMENT_COMPLETION,
                    resourceType: PAYMENT,
                    resourceId: payment._id,
                    targetUserId: order.staffId,
                    orderId: order._id,
                    targetRole: ADMIN,
                    indicates: SUCCESS
                });

                res.status(200).send({
                    msg: 'Success!`'
                });
                return;
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async mkCreditPayment4Resource(customerId, resourceType, resourceId, amount2Pay) {
        const payment = await Payment.create({
            customerId,
            type: CREDIT_PAYMENT,
            resourceType,
            resourceId,
            amount: amount2Pay,
            status: PAYMENT_COMPLETED
        });

        if (payment) {

            let order = null;

            switch (payment.resourceType) {
                case ORDER:
                    order = await Order.findOne({ _id: payment.resourceId });
                    break;
                case RENTAL_TIME_FRAME_EXTENSION:
                    const timeExt = await RentalTimeFrameExtension.findOne({ _id: payment.resourceId });
                    order = await Order.findOne({ rentalPackageId: timeExt.rentalPackageId });
                    break;
                default:
                    break;
            }


            await Notification.create({
                actorUserId: payment.customerId,
                msg: `Payment for ${payment.resourceType} completed`,
                action: PAYMENT_COMPLETION,
                resourceType: PAYMENT,
                resourceId: payment._id,
                targetUserId: order.staffId,
                orderId: order._id,
                targetRole: ADMIN,
                indicates: SUCCESS
            });

            const creditPayment = await CreditPayment.create({
                paymentId: payment._id,
            });

            if (creditPayment) {
                return true;
            }

        }

        return false;
    }


    async regExternalPayment4Resource(customerId, resourceType, resourceId, amount, bankDetails) {
        const payment = await Payment.create({
            customerId: customerId,
            type: EXTERNAL_PAYMENT,
            resourceType: resourceType,
            resourceId: resourceId,
            amount
        })

        const externalPayment = await ExternalPayment.create({
            paymentId: payment._id,
            ...bankDetails
        });

        if (externalPayment) {
            return true;
        }

        return false;
    }

    async regGatewayPayment4Resource(customerId, resourceId, resourceType, items) {
        let line_items = [];
        let itr = 0;

        for (const item of items) {
            line_items[itr++] = {
                price_data: {
                    currency: item.currency,
                    product_data: {
                        name: item.name
                    },
                    unit_amount: item.unitAmount * 100
                },
                quantity: item.count
            }
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items,
            success_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/cancel`
        })

        const payment = await Payment.create({
            customerId: customerId,
            type: GATEWAY_PAYMENT,
            resourceType: resourceType,
            resourceId: resourceId,
            amount: amount2Pay
        });

        const gatewayPayment = await GatewayPayment.create({
            paymentId: payment._id,
            sessionId: session.id,
        });

        if (gatewayPayment) {
            return session;
        }

        return false;
    }

    async initGatewayPayment4Balance(customerId, resourceId, resourceType, amount2Pay) {

        let itemName = `Balance for ${properlizeWords(resourceType)}`;

        const line_items = [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: itemName
                    },
                    unit_amount: amount2Pay * 100
                },
                quantity: 1
            }
        ]

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items,
            success_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/cancel`
        })

        const payment = await Payment.create({
            customerId: customerId,
            type: GATEWAY_PAYMENT,
            resourceType: resourceType,
            resourceId: resourceId,
            amount: amount2Pay
        });

        const gatewayPayment = await GatewayPayment.create({
            paymentId: payment._id,
            sessionId: session.id,
        });

        if (gatewayPayment) {
            return session;
        }

        return false;
    }

    async mkOrderCreditPaymentAndInitGatewayPayment(order) {
        const controller = new PaymentsController();

        const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

        const amount2Pay = await rentalPackage.getTotalPrice();

        const customer = await Customer.findOne({ _id: order.customerId });

        if (amount2Pay <= customer.creditBalance) {
            // return await controller.mkOrderCreditPayment(order, amount2Pay);
            return await controller.mkCreditPayment4Resource(order.customerId, ORDER, order._id, amount2Pay);
        } else if (customer.creditBalance === 0) {
            return await controller.initOrderGatewayPayment(order, amount2Pay);
        } else {
            const balance = amount2Pay - customer.creditBalance;

            await controller.mkCreditPayment4Resource(order.customerId, ORDER, order._id, customer.creditBalance);

            const paymentSession = await controller.initGatewayPayment4Balance(order.customerId, order._id, ORDER, balance);

            if (paymentSession) {
                const user = await User.findOne({ _id: customer.userId });

                const emailData = {
                    firstName: startWithUpperCase(user.firstName),
                    rentalItems: [],
                    rentalDays: rentalPackage.rentalDaysCount,
                    transportationFee: rentalPackage.transportationFee,
                    totalPrice: amount2Pay,
                    checkoutLink: paymentSession.url,
                    amountPaid: amount2Pay - balance,
                    balance
                };

                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
                        // imgCid: (rentalItem.imgSrc.split('/')[3]),
                        // img: base64_encode(`${getBaseDirPath()}/public${rentalItem.imgSrc}`),
                        // imgMime: `image/${rentalItem.imgSrc.split('.')[1]}`,
                        subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                    };
                }

                return await controller.tryEmailCustomer4Payment(
                    'gatewayPaymentRequest4OrderBalance',
                    user.email,
                    'Pay Balance for Order',
                    emailData
                )
            }
        }
    }

    async mkTimeExtCreditPaymentAndInitGatewayPayment(timeExt) {
        const controller = new PaymentsController();

        const rentalPackage = await RentalPackage.findOne({ _id: timeExt.rentalPackageId });

        const order = await Order.findOne({ rentalPackageId: rentalPackage._id });

        const amount2Pay = await rentalPackage.getTotalPrice(timeExt.daysCount, true);

        const customer = await Customer.findOne({ _id: order.customerId });

        if (amount2Pay <= customer.creditBalance) {
            return await controller.mkCreditPayment4Resource(customer._id, RENTAL_TIME_FRAME_EXTENSION, timeExt._id, amount2Pay);
        } else if (customer.creditBalance === 0) {
            return await controller.initTimeFrameExtensionGatewayPayment(timeExt, amount2Pay);
        } else {

            const balance = amount2Pay - customer.creditBalance;

            await controller.mkCreditPayment4Resource(customer._id, RENTAL_TIME_FRAME_EXTENSION, timeExt._id, customer.creditBalance);

            const paymentSession = await controller.initGatewayPayment4Balance(customer._id, timeExt._id, RENTAL_TIME_FRAME_EXTENSION, balance);

            if (paymentSession) {
                const user = await User.findOne({ _id: customer.userId });

                const emailData = {
                    firstName: startWithUpperCase(user.firstName),
                    rentalItems: [],
                    rentalDays: timeExt.daysCount,
                    totalPrice: amount2Pay,
                    amountPaid: amount2Pay - balance,
                    balance,
                    checkoutLink: paymentSession.url,
                };

                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
                        // imgCid: (rentalItem.imgSrc.split('/')[3]),
                        // img: base64_encode(`${getBaseDirPath()}/public${rentalItem.imgSrc}`),
                        // imgMime: `image/${rentalItem.imgSrc.split('.')[1]}`,
                        subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, timeExt.daysCount)
                    };

                }

                return await controller.tryEmailCustomer4Payment(
                    'gatewayPaymentRequest4TimeFrameExtensionBalance',
                    user.email,
                    'Pay Balance for Order Time-Frame Extension',
                    emailData
                )
            }

        }
    }

    async mkOrderCreditPaymentAndInitExternalPayment(order, bankDetails) {
        const controller = new PaymentsController();

        const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

        const amount2Pay = await rentalPackage.getTotalPrice();

        const customer = await Customer.findOne({ _id: order.customerId });

        if (amount2Pay <= customer.creditBalance) {
            // return await controller.mkOrderCreditPayment(order, amount2Pay)
            return await controller.mkCreditPayment4Resource(order.customerId, ORDER, order._id, amount2Pay);
        } else if (customer.creditBalance === 0) {
            return await controller.initOrderExternalPayment(order, bankDetails, amount2Pay)
        } else {
            try {

                const balance = amount2Pay - customer.creditBalance;

                await controller.mkCreditPayment4Resource(customer._id, ORDER, order._id, customer.creditBalance);

                await controller.regExternalPayment4Resource(customer._id, ORDER, order._id, balance, bankDetails);

                const user = await User.findOne({ _id: customer.userId });

                const emailData = {
                    firstName: startWithUpperCase(user.firstName),
                    rentalItems: [],
                    rentalDays: rentalPackage.rentalDaysCount,
                    transportationFee: rentalPackage.transportationFee,
                    totalPrice: amount2Pay,
                    amountPaid: amount2Pay - balance,
                    balance,
                    bankName: bankDetails.bankName,
                    accountName: bankDetails.accountName,
                    accountNumber: bankDetails.accountNumber
                };

                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
                        // imgCid: (rentalItem.imgSrc.split('/')[3]),
                        // img: base64_encode(`${getBaseDirPath()}/public${rentalItem.imgSrc}`),
                        // imgMime: `image/${rentalItem.imgSrc.split('.')[1]}`,
                        subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                    };
                }

                return await controller.tryEmailCustomer4Payment(
                    'externalPaymentRequest4OrderBalance',
                    user.email,
                    'Pay Balance for Order',
                    emailData
                )

            } catch (err) {
                console.log('Error ', err);
                throw new Error(`while tring to initialize payment through ${EXTERNAL_PAYMENT}: ${err}`);
            }

        }

        return false;
    }


    async mkTimeExtCreditPaymentAndInitExternalPayment(timeExt, bankDetails) {
        const controller = new PaymentsController();

        const rentalPackage = await RentalPackage.findOne({ _id: timeExt.rentalPackageId });

        const order = await Order.findOne({ rentalPackageId: rentalPackage._id });

        const amount2Pay = await rentalPackage.getTotalPrice(timeExt.daysCount, true);

        const customer = await Customer.findOne({ _id: order.customerId });

        if (amount2Pay <= customer.creditBalance) {
            return await controller.mkCreditPayment4Resource(customer._id, RENTAL_TIME_FRAME_EXTENSION, timeExt._id, amount2Pay);
        } else if (customer.creditBalance === 0) {
            return await controller.initTimeFrameExtensionExternalPayment(timeExt, bankDetails);
        } else {
            try {

                const balance = amount2Pay - customer.creditBalance;

                await controller.mkCreditPayment4Resource(customer._id, RENTAL_TIME_FRAME_EXTENSION, timeExt._id, customer.creditBalance);

                await controller.regExternalPayment4Resource(customer._id, RENTAL_TIME_FRAME_EXTENSION, timeExt._id, balance, bankDetails);

                const user = await User.findOne({ _id: customer.userId });

                const emailData = {
                    firstName: startWithUpperCase(user.firstName),
                    rentalItems: [],
                    rentalDays: timeExt.daysCount,
                    totalPrice: amount2Pay,
                    amountPaid: amount2Pay - balance,
                    balance,
                    bankName: bankDetails.bankName,
                    accountName: bankDetails.accountName,
                    accountNumber: bankDetails.accountNumber
                };

                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
                        // imgCid: (rentalItem.imgSrc.split('/')[3]),
                        // img: base64_encode(`${getBaseDirPath()}/public${rentalItem.imgSrc}`),
                        // imgMime: `image/${rentalItem.imgSrc.split('.')[1]}`,
                        subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, timeExt.daysCount)
                    };

                }

                return await controller.tryEmailCustomer4Payment(
                    'externalPaymentRequest4TimeFrameExtensionBalance',
                    user.email,
                    'Pay Balance for Order Time-Frame Extension.',
                    emailData
                )

            } catch (err) {
                console.log('Error ', err);
                throw new Error(`while tring to initialize payment through ${EXTERNAL_PAYMENT}: ${err}`);
            }


            return false;

        }
    }

    /**
     * Initializes the payment process for the passed Order
     * @param {*} order 
     */
    async autoInitPayment4Order(order, bankDetails = null) {

        const controller = new PaymentsController();

        const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });
        const amount2Pay = await rentalPackage.getTotalPrice();

        if (order.paymentTypes.length === 1) {
            switch (order.paymentTypes[0]) {
                case CREDIT_PAYMENT:
                    // return await controller.mkOrderCreditPayment(order);
                    return await controller.mkCreditPayment4Resource(order.customerId, ORDER, order._id, amount2Pay);
                case EXTERNAL_PAYMENT:
                    return await controller.initOrderExternalPayment(order, bankDetails)
                case GATEWAY_PAYMENT:
                default:
                    return await controller.initOrderGatewayPayment(order);
            }
        } else if (arrayContainsValue(order.paymentTypes, EXTERNAL_PAYMENT) && bankDetails) {
            return await controller.mkOrderCreditPaymentAndInitExternalPayment(order, bankDetails);
        } else {
            return await controller.mkOrderCreditPaymentAndInitGatewayPayment(order);
        }
    }

    /**
     * Initializes the payment process for the passed RentalTimeFrameExtension
     * @param {*} timeFrameExtension 
     * @returns 
     */
    async autoInitPayment4RentalTimeFrameExtension(timeFrameExtension, bankDetails = null) {
        //TODO implement logic
        const controller = new PaymentsController();

        if (timeFrameExtension.paymentTypes.length === 1) {
            switch (timeFrameExtension.paymentTypes[0]) {
                case CREDIT_PAYMENT:
                    const order = await Order.findOne({ rentalPackageId: timeFrameExtension.rentalPackageId });
                    const rentalPackage = await RentalPackage.findOne({ _id: timeFrameExtension.rentalPackageId });
                    return await controller.mkCreditPayment4Resource(order.customerId, RENTAL_TIME_FRAME_EXTENSION, timeFrameExtension._id, await rentalPackage.getTotalPrice());
                case EXTERNAL_PAYMENT:
                    return await controller.initTimeFrameExtensionExternalPayment(timeFrameExtension, bankDetails)
                case GATEWAY_PAYMENT:
                default:
                    return await controller.initTimeFrameExtensionGatewayPayment(timeFrameExtension);
            }
        } else if (arrayContainsValue(timeFrameExtension.paymentTypes, EXTERNAL_PAYMENT) && bankDetails) {
            return await controller.mkTimeExtCreditPaymentAndInitExternalPayment(timeFrameExtension, bankDetails);
        } else {
            return await controller.mkTimeExtCreditPaymentAndInitGatewayPayment(timeFrameExtension);
        }

        return true;
    }

    async cancelPaymentById(_id) {

        const payment = await Payment.findOne({ _id });
        const customer = await Customer.findOne({ _id: payment.customerId });

        if (payment.status === PAYMENT_COMPLETED) {
            customer.creditBalance += payment.amount;
            await customer.save();
        }

        switch (payment.type) {
            case CREDIT_PAYMENT:
                await CreditPayment.deleteOne({ paymentId: payment._id });
                break;
            case EXTERNAL_PAYMENT:
                await ExternalPayment.deleteOne({ paymentId: payment._id });
                break;
            case GATEWAY_PAYMENT:
                const gWPayment = await GatewayPayment.findOne({ paymentId: payment._id });

                await stripe.checkout.sessions.expire(gWPayment.sessionId);
                await GatewayPayment.deleteOne({ _id: gWPayment._id });
                break;
            default:
                break;
        }

        return await Payment.deleteOne({ _id });
    }

}

const paymentsController = new PaymentsController();

module.exports = paymentsController;
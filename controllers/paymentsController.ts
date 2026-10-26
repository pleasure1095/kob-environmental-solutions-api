import { NextFunction, Request, Response } from "express";
import { ADMIN, APPROVED, CREDIT_PAYMENT, CUSTOMER, EXTERNAL_PAYMENT, GATEWAY_PAYMENT, ORDER, PAID, PAYMENT, PAYMENT_COMPLETED, RENTAL_TIME_FRAME_EXTENSION, SUCCESS } from "../config/constants";
import Notification from "../db/models/notifications/Notification";
import Order, { IOrder } from "../db/models/Order";
import OrderUpdateLog from "../db/models/OrderUpdateLog";
import CreditPayment from "../db/models/payments/CreditPayment";
import ExternalPayment from "../db/models/payments/ExternalPayment";
import GatewayPayment from "../db/models/payments/GatewayPayment";
import Payment from "../db/models/payments/Payment";
import RentalItem from "../db/models/RentalItem";
import RentalPackage from "../db/models/RentalPackage";
import RentalTimeFrameExtension from "../db/models/RentalTimeFrameExtension";
import TokenedGatewayPaymentEmailData from "../db/models/TokenedGatewayPaymentEmailData";
import Customer from "../db/models/users/Customer";
import User from "../db/models/users/User";
import { setPaymentLink } from "../globalVariables";
import { arrayContainsValue, properlizeWords, startWithUpperCase } from "../helpers";
import { email } from "../serviceProviders/emailer";
import { PAYMENT_COMPLETION } from "../serviceProviders/socketIOManager";
import stripe from "../serviceProviders/stripe";
import { tryCreateCharge, tryRetrieveCharge } from "../serviceProviders/Tap";
import authController from "./authController";

class PaymentsController {
    async fetch1(req: Request, res: Response, next: NextFunction) {
        const payment = await Payment.findOne({ _id: req.params.id });

        if (payment) {
            res.status(200).send(await payment.getFields());
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async fetch(req: Request, res: Response, next: NextFunction) {

        let query = Payment.find();

        if (req?.query?.status) {
            query = query.where('status').equals(req.query.status);
        }

        if (req?.query?.orderId) {
            query = query.where('resourceId').equals(req.query.orderId);
        }

        const authUser = await authController.getAuthUser(req);

        if (authUser && (authUser.getFields()).role.name === CUSTOMER) {
            const customer = await Customer.findOne({ userId: authUser._id });

            if (customer) {
                query = query.where('customerId').equals(customer._id.toString());
            }
        } else if (req?.query?.customerId) {
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

    extractBankDetails(req: Request) {
        if (!req.body?.accountNumber || req.body?.accountNumber === '') {
            return null;
        }

        return {
            bankName: req.body.bankName,
            accountName: req.body.accountName,
            accountNumber: req.body.accountNumber
        };
    }


    async tryReEmailCustomer4Payment(storedData: any) {      //TODO: define the exact type of storedData

        if (storedData.locals?.sessionId) {
            await TokenedGatewayPaymentEmailData.create({
                sessionId: storedData.locals.sessionId,
                emailData: storedData
            })
        }

        return await email.send(storedData);
    }

    async tryEmailCustomer4Payment(template: string, emailAddr: string, subject: string, emailData: any) {      //TODO: defint the exact type of storedData

        const storedData = {
            template: template,
            message: {
                to: emailAddr,
                subject: subject
            },
            locals: emailData
        };

        if (emailData?.sessionId) {
            await TokenedGatewayPaymentEmailData.create({
                sessionId: emailData.sessionId,
                emailData: storedData
            })
        }

        return await email.send(storedData);
    }

    async tryEmailCustomer4GatewayPayment(emailData: any, emailAddr: string, attachments = null) {


    }

    async tryEmailCustomer4OrderGatewayPayment(emailData: any, emailAddr: string, attachments = null) {

        const storedData = {
            template: 'gatewayPaymentRequest4Order',
            message: {
                to: emailAddr,
                attachments,
                subject: 'Bill for Your Order'
            },
            locals: emailData
        };

        await TokenedGatewayPaymentEmailData.create({
            sessionId: emailData.sessionId,
            emailData: storedData
        });

        return await email.send(storedData);
    }

    async tryEmailCustomer4TimeFrameExtensionGatewayPayment(emailData: any, emailAddr: string) {
        const storedEmailData = {
            template: 'gatewayPaymentRequest4TimeFrameExtension',
            message: {
                to: emailAddr,
                subject: 'Bill for Your Order Time-Frame Extension'
            },
            locals: emailData
        };

        await TokenedGatewayPaymentEmailData.create({
            sessionId: emailData.sessionId,
            emailData: storedEmailData
        });

        return await email.send(storedEmailData);
    }

    async tryEmailCustomer4ExternalPayment(emailData: any, emailAddr: string) {
        return await email.send({
            template: 'bankTransferRequest',
            message: {
                to: emailAddr,
                subject: 'Bill for Your Order'
            },
            locals: emailData
        });
    }

    async tryEmailCustomer4TimeFrameExtensionExternalPayment(emailData: any, emailAddr: string) {
        return await email.send({
            template: 'bankTransferRequest4TimeFrameExtension',
            message: {
                to: emailAddr,
                subject: 'Bill for Your Order Time-Frame Extension'
            },
            locals: emailData
        });
    }

    async mkOrderCreditPayment(order: any, amount2Pay = null) {

        try {
            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            if (!rentalPackage) {
                throw new Error('Could not fetch the rental package.');
            }

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

    async initOrderGatewayPayment(order: any, amount2Pay: number | null = null, discount: number = 0, amountPaid: number = 0) {

        try {

            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            if (!rentalPackage) {
                throw new Error('could not fetch the renal package');
            }

            const amount = (amount2Pay ? amount2Pay - discount : (await rentalPackage.getTotalPrice()) - discount) - amountPaid;
            const customer = await Customer.findOne({ _id: order.customerId });

            if (!customer) {
                throw new Error('could not fetch the customer details');
            }

            const user = await User.findOne({ _id: customer.userId });

            if (!user) {
                throw new Error('could not fetch the customer details');
            }

            const emailData: any = {
                orderID: order.ref,
                firstName: startWithUpperCase(user.firstName),
                rentalItems: [],
                rentalDays: rentalPackage.rentalDaysCount,
                transportationFee: rentalPackage.transportationFee,
                amountPaid: amountPaid ? amountPaid : undefined,
                totalPrice: amount,
            };

            // for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
            //     const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

            //     if (!rentalItem) {
            //         throw new Error('could not fetch the rental item details');
            //     }

            //     emailData.rentalItems[i] = {
            //         name: rentalItem.name,
            //         count: rentalPackage.rentalItems[i].count,
            //         subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
            //     };
            // }

            let line_items = [];
            let itr = 0;

            for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                if (!rentalItem) {
                    throw new Error('could not fetch the rental item details');
                }

                emailData.rentalItems[i] = {
                    name: rentalItem.name,
                    count: rentalPackage.rentalItems[i].count,
                    subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                };

                const tempDiscount = (i === 0) ? amountPaid : 0

                line_items[i] = {
                    price_data: {
                        currency: 'ngn',
                        product_data: {
                            name: (tempDiscount ? 'Balance for ' : '') + rentalItem.name
                        },
                        unit_amount: ((rentalItem.pricePerDay * rentalPackage.rentalDaysCount) - tempDiscount) * 100
                    },
                    quantity: rentalPackage.rentalItems[i].count
                }
            }



            // line_items[line_items.length] = {
            //     price_data: {
            //         currency: 'ngn',
            //         product_data: {
            //             name: 'Transportation Fee'
            //         },
            //         unit_amount: rentalPackage.transportationFee * 100
            //     },
            //     quantity: 1
            // }

            console.log(line_items);

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                line_items,
                success_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/cancel?session_id={CHECKOUT_SESSION_ID}`
            });

            if (!session) {
                throw new Error('Could not complete payment with gateway. Try another payment method or try again in 10 seconds.');
            }

            emailData.checkoutLink = session.url;
            emailData.sessionId = session.id;

            setPaymentLink(session?.url ?? '');


            // const charge = await tryCreateCharge({
            //     amount,
            //     currency: 'ngn',
            //     customer_initiated: true,
            //     customer: {
            //         firstName: user.firstName,
            //         email: user.email
            //     },
            //     source: { id: 'src_card' },
            //     redirect: { url: `${process.env.APP_HOST_NAME}/api/payments/gateway/success` }
            // });

            // emailData.checkoutLink = charge.transaction.url;
            // emailData.sessionId = charge.id;


            // setPaymentLink(charge.transaction.url);

            const controller = new PaymentsController();

            // if (await controller.tryEmailCustomer4OrderGatewayPayment(emailData, user.email)) {
            if (true) {

                const payment = await Payment.create({
                    customerId: customer._id,
                    type: GATEWAY_PAYMENT,
                    resourceType: ORDER,
                    resourceId: order._id,
                    amount
                });

                const gatewayPayment = await GatewayPayment.create({
                    paymentId: payment._id,
                    sessionId: session.id
                    // sessionId: charge.id,

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

    async initTimeFrameExtensionGatewayPayment(timeFrameExtension: any, amount2Pay?: number) {

        try {

            const rentalPackage = await RentalPackage.findOne({ _id: timeFrameExtension.rentalPackageId });

            if (!rentalPackage) {
                throw new Error('Could not fetch the rental package.');
            }

            const order = await Order.findOne({ rentalPackageId: rentalPackage._id });

            const amount = amount2Pay ? amount2Pay : await rentalPackage.getTotalPrice(timeFrameExtension.daysCount, true);

            if (!order) {
                throw new Error('Could not fetch the Order.');
            }

            const customer = await Customer.findOne({ _id: order.customerId });

            if (!customer) {
                throw new Error('could not fetch the customer details');
            }

            const user = await User.findOne({ _id: customer.userId });

            if (!user) {
                throw new Error('could not fetch the customer details');
            }

            const emailData: any = {        //TODO: define the exact type of emailData
                orderId: order.ref,
                firstName: startWithUpperCase(user.firstName),
                rentalItems: [],
                rentalDays: timeFrameExtension.daysCount,
                transportationFee: rentalPackage.transportationFee,
                totalPrice: amount,
            };

            // const charge = await tryCreateCharge({
            //     amount,
            //     currency: 'ngn',
            //     customer_initiated: true,
            //     customer: {
            //         firstName: user.firstName,
            //         email: user.email
            //     },
            //     source: { id: 'src_card' },
            //     redirect: { url: `${process.env.APP_HOST_NAME}/api/payments/gateway/success` }
            // });

            let line_items = [];
            let itr = 0;

            for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                if (!rentalItem) {
                    throw new Error('rental item cannot be found');
                }

                emailData.rentalItems[i] = {
                    name: rentalItem.name,
                    count: rentalPackage.rentalItems[i].count,
                    subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, timeFrameExtension.daysCount)
                };

                line_items[i] = {
                    price_data: {
                        currency: 'ngn',
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
                cancel_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/cancel?session_id={CHECKOUT_SESSION_ID}`
            });

            emailData.checkoutLink = session.url;
            emailData.sessionId = session.id;

            for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                if (!rentalItem) {
                    throw new Error('Could not fetch the rental items');
                }

                emailData.rentalItems[i] = {
                    name: rentalItem.name,
                    count: rentalPackage.rentalItems[i].count,
                    subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, timeFrameExtension.daysCount)
                };
            }

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


    async initGatewayPaymentAbortion(req: Request, res: Response, next: NextFunction) {
        const charge_id = req.query?.tap_id;
        const session_id = req.query?.session_id;

        const controller = new PaymentsController();

        const gatewayPayment = await GatewayPayment.findOne({ sessionId: session_id as string });


        res.status(200).redirect(`/abortions/payments/${gatewayPayment?.paymentId}`);
    }

    async cancelGatewayPayment(req: Request, res: Response, next: NextFunction) {
        const charge_id = req.query?.tap_id;
        const session_id = req.query?.session_id;

        const controller = new PaymentsController();

        const gatewayPayment = await GatewayPayment.findOne({ sessionId: session_id as string });

        const payment = await Payment.findOne({ _id: gatewayPayment?.paymentId });

        if (payment && (payment.resourceType === ORDER)) {

            const orderLogs = await OrderUpdateLog.find({ orderId: payment.resourceId }).sort({ createAt: -1 }).exec();

            if (orderLogs && (orderLogs.length > 0)) {
                const latestOrderLogData = await orderLogs[0].getFields();

                const order = await Order.findOne({ _id: payment.resourceId });

                if (order) {
                    //reverse the changes made to the order if any was made
                    const packageFields = ["rentalDaysCount", "transportationFee"];
                    const orderFields = ["siteId", "deliveryDueDate", "remarks", "paymentTypes", "discount"];

                    const oldOrderData = latestOrderLogData.oldData;

                    if (oldOrderData?.rentalPackage) {
                        const oldPackageData = oldOrderData?.rentalPackage;


                        let oldRentalItems: any[] = [];

                        for (const rentalItemData of oldOrderData.rentalPackage.rentalItems) {
                            oldRentalItems = [...oldRentalItems, {
                                _id: rentalItemData._id,
                                count: rentalItemData.count
                            }];
                        }

                        let newPackageData: any = {
                            oldRentalItems
                        }

                        for (const packageField of packageFields) {
                            if (oldPackageData[packageField as keyof typeof oldPackageData]) {
                                newPackageData = {
                                    ...newPackageData,
                                    [packageField]: oldPackageData[packageField as keyof typeof oldPackageData]
                                }
                            }
                        }

                        await RentalPackage.findOneAndUpdate({ _id: order.rentalPackageId }, newPackageData);

                    }

                    let newOrderData: any = {};

                    for (const orderField of orderFields) {
                        if (oldOrderData[orderField as keyof typeof oldOrderData]) {
                            newOrderData = {
                                ...newOrderData,
                                [orderField]: oldOrderData[orderField as keyof typeof oldOrderData]
                            }
                        }
                    }

                    let updateOrder = false;

                    for (const key in newOrderData) {
                        updateOrder = true;
                        break;
                    }

                    if (updateOrder) {

                        newOrderData = {
                            approvalTimeStamp: oldOrderData?.approvalTimeStamp ?? undefined,
                            status: oldOrderData.status
                        }

                        await Order.findOneAndUpdate({ _id: payment.resourceId }, newOrderData);
                    }
                }
            }
        }


        if (gatewayPayment) {
            await controller.cancelPaymentById(gatewayPayment.paymentId);
        }

        res.status(200).send({
            msg: 'successful!!'
        })
    }



    async completeGatewayPayment(req: Request, res: Response, next: NextFunction) {
        const charge_id = req.query?.tap_id;
        const session_id = req.query?.session_id;

        if (session_id) {
            // if (charge_id) {

            const session = await stripe.checkout.sessions.retrieve(session_id as string);

            if (!session) {
                throw new Error('gateway payment could not be fetched')
            }


            // if (charge && charge.status === 'CAPTURED') {
            if (session.payment_status === PAID) {

                const gatewayPayment = await GatewayPayment.findOne({ sessionId: session_id as string });

                if (!gatewayPayment) {
                    throw new Error('gateway payment could not be fetched')
                }

                const payment = await Payment.findOne({ _id: gatewayPayment.paymentId });

                // const charge = await tryRetrieveCharge(charge_id as string);

                if (!payment) {
                    throw new Error('gateway payment could not be fetched')
                }


                payment.status = PAYMENT_COMPLETED;
                await payment.save();

                let order: IOrder | null = null;
                let servicePlan = null;

                switch (payment.resourceType) {
                    case ORDER:
                        order = await Order.findOne({ _id: payment.resourceId });
                        break;
                    case RENTAL_TIME_FRAME_EXTENSION:
                        const timeExt = await RentalTimeFrameExtension.findOne({ _id: payment.resourceId });

                        if (!timeExt) {
                            throw new Error('gateway payment could not be fetched')
                        }

                        order = await Order.findOne({ rentalPackageId: timeExt.rentalPackageId });
                        break;
                    // case SERVICE_PLAN:
                    //     servicePlan = await ServicePlan.findOne({ _id: payment.resourceId });
                    //     break;
                    // case SERVICE_PLAN_PERIOD:
                    //     const period = await ServicePlanPeriod.findOne({ _id: payment.resourceId });
                    //     servicePlan = await ServicePlan.findOne({ _id: period.servicePlanId });
                    default:
                        break;
                }

                if (order) {
                    const packageFields = ["rentalDaysCount", "transportationFee"];
                    const orderFields = ["siteId", "deliveryDueDate", "remarks", "paymentTypes", "discount"];


                    const orderUpdateLogs = await OrderUpdateLog.find({ orderId: order._id.toString() }).sort({ createdAt: -1 }).exec();

                    if (orderUpdateLogs && (orderUpdateLogs.length > 0)) {

                        let latestOrderUpdateData: any = {}

                        latestOrderUpdateData = (await orderUpdateLogs[0].getFields()).newData;

                        let newRentalItemsData: any[] = [];

                        for (const rentalItemData of latestOrderUpdateData.rentalPackage.rentalItems) {
                            newRentalItemsData = [
                                ...newRentalItemsData,
                                {
                                    _id: rentalItemData._id,
                                    count: rentalItemData.count
                                }
                            ]
                        }

                        let newPackageData: any = {
                            rentalItems: newRentalItemsData
                        }

                        for (const packageField of packageFields) {

                            if (latestOrderUpdateData.rentalPackage[packageField as keyof typeof latestOrderUpdateData.rentalPackage]) {
                                newPackageData = {
                                    ...newPackageData,
                                    [packageField]: latestOrderUpdateData.rentalPackage[packageField as keyof typeof latestOrderUpdateData.rentalPackage]
                                }
                            }
                        }

                        await RentalPackage.findOneAndUpdate({ _id: latestOrderUpdateData.rentalPackage._id }, newPackageData);

                        let newOrderData: any = {};

                        for (const orderField of orderFields) {
                            if (latestOrderUpdateData[orderField as keyof typeof latestOrderUpdateData]) {
                                newOrderData = {
                                    ...newOrderData,
                                    [orderField]: latestOrderUpdateData[orderField as keyof typeof latestOrderUpdateData]
                                }
                            }
                        }


                        newOrderData = {
                            ...newOrderData,
                            status: APPROVED,
                            approvalTimeStamp: (new Date()).getTime()
                        }

                        await Order.findOneAndUpdate({ _id: order._id.toString() }, newOrderData);
                    } else {
                        const newOrderData = {
                            status: APPROVED,
                            approvalTimeStamp: (new Date()).getTime()
                        }

                        await Order.findOneAndUpdate({ _id: order._id.toString() }, newOrderData);
                    }


                    await Notification.create({
                        actorUserId: payment.customerId,
                        msg: `Payment for ${payment.resourceType} completed`,
                        action: PAYMENT_COMPLETION,
                        resourceType: PAYMENT,
                        resourceId: payment._id,
                        targetUserId: order?.staffId ?? undefined,
                        orderId: order._id,
                        targetRole: ADMIN,
                        indicates: SUCCESS
                    });
                    // } else if (servicePlan) {
                    //     await Notification.create({
                    //         actorUserId: payment.customerId,
                    //         msg: `Payment for ${payment.resourceType} completed`,
                    //         action: PAYMENT_COMPLETION,
                    //         resourceType: SERVICE_PLAN,
                    //         resourceId: servicePlan._id,
                    //         targetUserId: servicePlan.staffId,
                    //         targetRole: ADMIN,
                    //         indicates: SUCCESS
                    //     });
                }

                res.status(200).redirect(`/confirmations/payments/${payment._id}`);
                return;
            } else {


                const gatewayPayment = await GatewayPayment.findOne({ sessionId: session_id as string });

                if (!gatewayPayment) {
                    throw new Error('gateway payment could not be fetched')
                }

                const payment = await Payment.findOne({ _id: gatewayPayment.paymentId });

                if (!payment) {
                    throw new Error('gateway payment could not be fetched')
                }

                //Delete the concerned payment, create a new one, then re-email the new on to the customer
                const controller = new PaymentsController();

                const session = await controller.regGatewayPayment4Resource(payment.customerId, payment.resourceType, payment.resourceId, payment.amount, 0);

                const gwPayment = await GatewayPayment.findOne({ paymentId: payment._id });

                if (gwPayment) {
                    const newEmailData = await TokenedGatewayPaymentEmailData.findOne({ sessionId: gwPayment.sessionId });

                    if (!newEmailData) {
                        throw new Error('Could not confirm the payment. Please, try again.');
                    }

                    await controller.tryReEmailCustomer4Payment({
                        ...newEmailData.emailData,
                        locals: {
                            ...(newEmailData.emailData.locals),
                            checkoutLink: session.url,
                            sessionId: session.id,
                        }
                    });

                    await TokenedGatewayPaymentEmailData.findOneAndDelete({ _id: newEmailData._id });
                }

                await controller.cancelPaymentById(payment._id);

                const newGWPayment = await GatewayPayment.findOne({ sessionId: session.id });

                if (!newGWPayment) {
                    throw new Error('could not generate new payment');
                }

                await Payment.findOneAndUpdate({ _id: newGWPayment.paymentId }, { isReplacement: true });

                res.status(200).redirect(`/rejections/payments/${newGWPayment.paymentId}`);
                return;
            }
        }

        res.status(200).redirect(`/notfoundnotfound`);
        return;
    }

    /**
     * payment not linked to the system, but manually registered by staff into system after completion 
     * @param {*} order 
     */
    async initOrderExternalPayment(order: any, bankDetails: any, amount2Pay: number | null = null, discount: number = 0, amountPaid: number = 0) {

        try {

            const controller = new PaymentsController();

            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            if (!rentalPackage) {
                throw new Error('Could not fetch rental package');
            }

            const amount = (amount2Pay ? amount2Pay - discount : (await rentalPackage.getTotalPrice()) - discount) - amountPaid;

            const customer = await Customer.findOne({ _id: order.customerId });

            if (!customer) {
                throw new Error('Could not fetch customer');
            }

            const user = await User.findOne({ _id: customer.userId });

            if (!user) {
                throw new Error('Could not fetch customer');
            }

            const emailData: any = {
                orderId: order.ref,
                firstName: startWithUpperCase(user.firstName),
                rentalItems: [],
                rentalDays: rentalPackage.rentalDaysCount,
                transportationFee: rentalPackage.transportationFee,
                amountPaid: amountPaid ? amountPaid : undefined,
                totalPrice: amount,
                bankName: bankDetails.bankName,
                accountName: bankDetails.accountName,
                accountNumber: bankDetails.accountNumber
            };

            for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                if (!rentalItem) {
                    throw new Error('Could not fetch rental item');
                }

                emailData.rentalItems[i] = {
                    name: rentalItem.name,
                    count: rentalPackage.rentalItems[i].count,
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
    }

    /**
     * payment not linked to the system, but manually registered by staff into system after completion 
     * @param {*} timeFrameExtension 
     */
    async initTimeFrameExtensionExternalPayment(timeFrameExtension: any, bankDetails: any, amount2Pay: number | null = null) {

        try {

            const controller = new PaymentsController();

            const rentalPackage = await RentalPackage.findOne({ _id: timeFrameExtension.rentalPackageId });

            if (!rentalPackage) {
                throw new Error('Could not fetch Rental Package');
            }

            const order = await Order.findOne({ rentalPackageId: rentalPackage._id });

            const amount = amount2Pay ? amount2Pay : await rentalPackage.getTotalPrice(timeFrameExtension.daysCount, true);

            if (!order) {
                throw new Error('Could not fetch Order');
            }

            const customer = await Customer.findOne({ _id: order.customerId });

            if (!customer) {
                throw new Error('Could not fetch customer details');
            }

            const user = await User.findOne({ _id: customer.userId });

            if (!user) {
                throw new Error('Could not fetch customer details');
            }

            const emailData: any = {
                orderId: order.ref,
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

                if (!rentalItem) {
                    throw new Error('could not fetch the rental Item');
                }

                emailData.rentalItems[i] = {
                    name: rentalItem.name,
                    count: rentalPackage.rentalItems[i].count,
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

    async completeExternalPayment(req: Request, res: Response, next: NextFunction) {

        //TODO: the amount confirmed is needed in order to confirm whether or not the client payed the total. 
        //TODO: if lesser than the total is confirmed, a new Invoice (for the balance) is generated and emailed to the client

        const externalPayment = await ExternalPayment.findOneAndUpdate({ paymentId: req.params.id }, { referenceNumber: req.body.refNumber });

        if (externalPayment) {
            const payment = await Payment.findOneAndUpdate({ _id: req.params.id }, { status: PAYMENT_COMPLETED });

            if (payment) {

                let order = null;
                let servicePlan = null;

                switch (payment.resourceType) {
                    case ORDER:
                        order = await Order.findOne({ _id: payment.resourceId });
                        break;
                    case RENTAL_TIME_FRAME_EXTENSION:
                        const timeExt = await RentalTimeFrameExtension.findOne({ _id: payment.resourceId });

                        if (!timeExt) {
                            throw new Error('Could not fetch the time-extension');
                        }

                        order = await Order.findOne({ rentalPackageId: timeExt.rentalPackageId });
                        break;
                    // case SERVICE_PLAN_PERIOD:
                    //     const period = await ServicePlanPeriod.findOne({ _id: payment.resourceId });
                    //     servicePlan = await ServicePlan.findOne({ _id: period.servicePlanId });
                    default:
                        break;
                }


                if (order) {
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
                }

                // if (servicePlan) {

                //     await Notification.create({
                //         actorUserId: payment.customerId,
                //         msg: `Some payment for Service Agreement #${servicePlan.ref} completed`,
                //         action: PAYMENT_COMPLETION,
                //         resourceType: SERVICE_PLAN_PERIOD,
                //         resourceId: payment._id,
                //         targetUserId: servicePlan.staffId,
                //         servicePlanId: servicePlan._id,
                //         targetRole: ADMIN,
                //         indicates: SUCCESS
                //     });
                // }

                res.status(200).send({
                    msg: 'Success!`'
                });
                return;
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async mkCreditPayment4Resource(customerId: string, resourceType: string, resourceId: string, amount: number, discount: number = 0, amountPaid: number = 0) {
        const amount2Pay = (amount - discount) - amountPaid;

        const payment = await Payment.create({
            customerId,
            type: CREDIT_PAYMENT,
            resourceType,
            resourceId,
            amount: amount2Pay,
            status: PAYMENT_COMPLETED
        });

        if (payment) {

            let order: IOrder | null = null;
            let staffId = null;
            let plan = null;
            let servicePlanPeriod = null;

            switch (payment.resourceType) {
                case ORDER:
                    order = await Order.findOne({ _id: payment.resourceId });
                    break;
                case RENTAL_TIME_FRAME_EXTENSION:
                    const timeExt = await RentalTimeFrameExtension.findOne({ _id: payment.resourceId });

                    if (!timeExt) {
                        throw new Error('Could not fetch the time-extension');
                    }

                    order = await Order.findOne({ rentalPackageId: timeExt.rentalPackageId });
                    break;
                // case SERVICE_PLAN:
                //     plan = await ServicePlan.findOne({ _id: resourceId });
                //     staffId = plan.staffId;
                //     break;
                // case SERVICE_PLAN_PERIOD:
                //     servicePlanPeriod = await ServicePlanPeriod.findOne({ _id: resourceId });
                //     plan = await ServicePlan.findOne({ _id: servicePlanPeriod.servicePlanId });
                //     staffId = plan.staffId;
                //     break;
                default:
                    break;
            }

            if (payment.resourceType === ORDER) {

                await Notification.create({
                    actorUserId: payment.customerId,
                    msg: `Payment for ${payment.resourceType} completed`,
                    action: PAYMENT_COMPLETION,
                    resourceType: PAYMENT,
                    resourceId: payment._id,
                    targetUserId: order ? order.staffId : undefined,
                    orderId: order ? order._id : undefined,
                    targetRole: ADMIN,
                    indicates: SUCCESS
                });
                // } else if (payment.resourceType === SERVICE_PLAN) {
                //     await Notification.create({
                //         actorUserId: payment.customerId,
                //         msg: `Payment for ${payment.resourceType} completed`,
                //         action: PAYMENT_COMPLETION,
                //         resourceType: PAYMENT,
                //         resourceId: payment._id,
                //         targetUserId: staffId,
                //         servicePlanId: plan._id,
                //         targetRole: ADMIN,
                //         indicates: SUCCESS
                //     });

                //     await Notification.create({
                //         actorUserId: payment.customerId,
                //         msg: `Payment for ${payment.resourceType} completed`,
                //         action: PAYMENT_COMPLETION,
                //         resourceType: PAYMENT,
                //         resourceId: payment._id,
                //         targetUserId: payment.customerId,
                //         servicePlanId: plan._id,
                //         targetRole: ADMIN,
                //         indicates: SUCCESS
                //     });
                // } else if (payment.resourceType === SERVICE_PLAN_PERIOD) {
                //     await Notification.create({
                //         actorUserId: payment.customerId,
                //         msg: `Payment for service(s) from Service Agreement #${plan.ref} completed`,
                //         action: PAYMENT_COMPLETION,
                //         resourceType: PAYMENT,
                //         resourceId: payment._id,
                //         targetUserId: staffId,
                //         servicePlanId: plan._id,
                //         targetRole: ADMIN,
                //         indicates: SUCCESS
                //     });

                //     await Notification.create({
                //         actorUserId: payment.customerId,
                //         msg: `Payment for service(s) from Service Agreement #${plan.ref} completed`,
                //         action: PAYMENT_COMPLETION,
                //         resourceType: PAYMENT,
                //         resourceId: payment._id,
                //         targetUserId: payment.customerId,
                //         servicePlanId: plan._id,
                //         targetRole: ADMIN,
                //         indicates: SUCCESS
                //     });
            }

            const creditPayment = await CreditPayment.create({
                paymentId: payment._id,
            });

            if (creditPayment) {
                return true;
            }

        }

        console.log('in PaymentsController.mkCreditPayment: Something went wrong. Please try again.')
        throw new Error('Something went wrong. Please try again.');
    }


    async regExternalPayment4Resource(customerId: string, resourceType: string, resourceId: string, amount: number, bankDetails: any, discount: number = 0) {

        const amount2Pay = amount - discount;

        const payment = await Payment.create({
            customerId: customerId,
            type: EXTERNAL_PAYMENT,
            resourceType: resourceType,
            resourceId: resourceId,
            amount2Pay
        })

        const externalPayment = await ExternalPayment.create({
            paymentId: payment._id,
            ...bankDetails
        });

        if (externalPayment) {
            return true;
        }

        console.log('in PaymentsController.regExternalPayment: Something went wrong. Please try again.')
        throw new Error('Something went wrong. Please try again.');
    }

    async regGatewayPayment4Resource(customerId: string, resourceType: string, resourceId: string, amount: number, discount: number) {

        switch (resourceType) {
            case ORDER:
                break;
            default:
                throw new Error('resource-type is unknown');
        }

        const order = await Order.findOne({ _id: resourceId });

        if (!order) {
            throw new Error('The order could not be foound.');
        }


        const customer = await Customer.findOne({ _id: customerId });

        if (!customer) {
            throw new Error('Could not fetch the customer details');
        }

        const customerData = await customer.getFields();

        const amount2Pay = amount - discount;

        // const charge = await tryCreateCharge({
        //     amount2Pay,
        //     currency: 'ngn',
        //     customer_initiated: true,
        //     customer: {
        //         firstName: customerData.firstName,
        //         email: customerData.email
        //     },
        //     source: { id: 'src_card' },
        //     redirect: { url: `${process.env.APP_HOST_NAME}/api/payments/gateway/success` }
        // });

        let line_items = [];
        let itr = 0;

        const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

        if (!rentalPackage) {
            throw new Error('Could not find rental package!');
        }


        for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
            const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

            if (!rentalItem) {
                throw new Error('could not fetch the rental item details');
            }

            // emailData.rentalItems[i] = {
            //     name: rentalItem.name,
            //     count: rentalPackage.rentalItems[i].count,
            //     subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
            // };

            line_items[i] = {
                price_data: {
                    currency: 'ngn',
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
                currency: 'ngn',
                product_data: {
                    name: 'Transportation Fee'
                },
                unit_amount: rentalPackage.transportationFee * 100
            },
            quantity: 1
        }

        // for (const item of items) {
        //     line_items[itr++] = {
        //         price_data: {
        //             currency: item.currency,
        //             product_data: {
        //                 name: item.name
        //             },
        //             unit_amount: item.unitAmount * 100
        //         },
        //         quantity: item.count
        //     }
        // }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items,
            success_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/cancel?session_id={CHECKOUT_SESSION_ID}`
        })

        const payment = await Payment.create({
            customerId,
            type: GATEWAY_PAYMENT,
            resourceType: resourceType,
            resourceId: resourceId,
            amount2Pay
        })

        const gatewayPayment = await GatewayPayment.create({
            paymentId: payment._id,
            sessionId: session.id,
        });

        if (gatewayPayment) {
            return session;
        }

        console.log('in PaymentsController.regGatewayPayment: Something went wrong. Please try again.')
        throw new Error('Something went wrong. Please try again.');
    }

    async initGatewayPayment4Balance(customerId: string, resourceId: string, resourceType: string, amount2Pay: number) {

        const customer = await Customer.findOne({ _id: customerId });

        if (!customer) {
            throw new Error('could not fetch customer');
        }

        const customerData = await customer.getFields();


        let itemName = `Balance for ${properlizeWords(resourceType)}`;

        const line_items = [
            {
                price_data: {
                    currency: 'ngn',
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
            cancel_url: `${process.env.APP_HOST_NAME}/api/payments/gateway/cancel?session_id={CHECKOUT_SESSION_ID}`
        });

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
            setPaymentLink(session?.url ?? '');
            return session;
        }

        console.log('in PaymentsController.initGatewayPayment4Balance: Something went wrong. Please try again.')
        throw new Error('Something went wrong. Please try again.');
    }

    async mkOrderCreditPaymentAndInitGatewayPayment(order: any, discount: number = 0, amountPaid: number = 0) {
        const controller = new PaymentsController();

        const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

        if (!rentalPackage) {
            throw new Error('Could not fetch rental package');
        }

        const amount2Pay = ((await rentalPackage.getTotalPrice()) - discount) - amountPaid;

        const customer = await Customer.findOne({ _id: order.customerId });

        if (!customer) {
            throw new Error('Could not fetch customer');
        }

        if (amount2Pay <= customer.creditBalance) {
            // return await controller.mkOrderCreditPayment(order, amount2Pay);
            return await controller.mkCreditPayment4Resource(order.customerId, ORDER, order._id, amount2Pay);
        } else if (customer.creditBalance === 0) {
            return await controller.initOrderGatewayPayment(order, amount2Pay);
        } else {
            const balance = amount2Pay - customer.creditBalance;

            await controller.mkCreditPayment4Resource(order.customerId, ORDER, order._id, customer.creditBalance);

            const session = await controller.initGatewayPayment4Balance(order.customerId, order._id, ORDER, balance);

            if (session) {
                const user = await User.findOne({ _id: customer.userId });

                if (!user) {
                    throw new Error('Could not fetch customer');
                }

                const emailData: any = {
                    orderId: order.ref,
                    firstName: startWithUpperCase(user.firstName),
                    rentalItems: [],
                    rentalDays: rentalPackage.rentalDaysCount,
                    transportationFee: rentalPackage.transportationFee,
                    totalPrice: amount2Pay,
                    checkoutLink: session.url,
                    sessionId: session.id,
                    amountPaid: (amount2Pay - balance) + amountPaid,
                    balance
                };

                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    if (!rentalItem) {
                        throw new Error('Could not fetch rental item');
                    }

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
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

    async mkTimeExtCreditPaymentAndInitGatewayPayment(timeExt: any) {
        const controller = new PaymentsController();

        const rentalPackage = await RentalPackage.findOne({ _id: timeExt.rentalPackageId });

        if (!rentalPackage) {
            throw new Error('could not fetch rental package');
        }

        const order = await Order.findOne({ rentalPackageId: rentalPackage._id });

        const amount2Pay = await rentalPackage.getTotalPrice(timeExt.daysCount, true);

        if (!order) {
            throw new Error('could not fetch order');
        }

        const customer = await Customer.findOne({ _id: order.customerId });

        if (!customer) {
            throw new Error('Could not fetch customer');
        }

        if (amount2Pay <= customer.creditBalance) {
            return await controller.mkCreditPayment4Resource(customer._id, RENTAL_TIME_FRAME_EXTENSION, timeExt._id, amount2Pay);
        } else if (customer.creditBalance === 0) {
            return await controller.initTimeFrameExtensionGatewayPayment(timeExt, amount2Pay);
        } else {

            const balance = amount2Pay - customer.creditBalance;

            await controller.mkCreditPayment4Resource(customer._id, RENTAL_TIME_FRAME_EXTENSION, timeExt._id, customer.creditBalance);

            const session = await controller.initGatewayPayment4Balance(customer._id, timeExt._id, RENTAL_TIME_FRAME_EXTENSION, balance);

            if (session) {
                const user = await User.findOne({ _id: customer.userId });

                if (!user) {
                    throw new Error('Could not fetch customer');
                }

                const emailData: any = {
                    orderId: order.ref,
                    firstName: startWithUpperCase(user.firstName),
                    rentalItems: [],
                    rentalDays: timeExt.daysCount,
                    totalPrice: amount2Pay,
                    amountPaid: amount2Pay - balance,
                    balance,
                    checkoutLink: session.url,
                    sessionId: session.id,
                };

                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    if (!rentalItem) {
                        throw new Error('Could not fetch rental item');
                    }

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
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

    async mkOrderCreditPaymentAndInitExternalPayment(order: any, bankDetails: any, discount: number = 0, amountPaid: number = 0) {
        const controller = new PaymentsController();

        const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

        if (!rentalPackage) {
            throw new Error('Could not fetch rental package');
        }

        const amount2Pay = ((await rentalPackage.getTotalPrice()) - discount) - amountPaid;

        const customer = await Customer.findOne({ _id: order.customerId });

        if (!customer) {
            throw new Error('Could not fetch customer');
        }

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

                if (!user) {
                    throw new Error('Could not fetch User');
                }

                const emailData: any = {
                    orderId: order.ref,
                    firstName: startWithUpperCase(user.firstName),
                    rentalItems: [],
                    rentalDays: rentalPackage.rentalDaysCount,
                    transportationFee: rentalPackage.transportationFee,
                    totalPrice: amount2Pay,
                    amountPaid: (amount2Pay - balance) + amountPaid,
                    balance,
                    bankName: bankDetails.bankName,
                    accountName: bankDetails.accountName,
                    accountNumber: bankDetails.accountNumber
                };

                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {
                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    if (!rentalItem) {
                        throw new Error('Could not fetch rental item');
                    }

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
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
    }


    async mkTimeExtCreditPaymentAndInitExternalPayment(timeExt: any, bankDetails: any) {
        const controller = new PaymentsController();

        const rentalPackage = await RentalPackage.findOne({ _id: timeExt.rentalPackageId });

        if (!rentalPackage) {
            throw new Error('Could not fetch rental package');
        }

        const order = await Order.findOne({ rentalPackageId: rentalPackage._id });

        if (!order) {
            throw new Error('Could not fetch order');
        }

        const amount2Pay = await rentalPackage.getTotalPrice(timeExt.daysCount, true);

        const customer = await Customer.findOne({ _id: order.customerId });

        if (!customer) {
            throw new Error('Could not fetch customer');
        }

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

                if (!user) {
                    throw new Error('Could not fetch customer');
                }

                const emailData: any = {
                    orderId: order.ref,
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

                    if (!rentalItem) {
                        throw new Error('Could not fetch rental package');
                    }

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
                        subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, timeExt.daysCount)
                    };

                }

                return await controller.tryEmailCustomer4Payment(
                    'externalPaymentRequest4TimeFrameExtensionBalance',
                    user.email,
                    'Pay Balance for Order Time-Frame Extension.',
                    emailData
                );

            } catch (err) {
                console.log('Error ', err);
                throw new Error(`while tring to initialize payment through ${EXTERNAL_PAYMENT}: ${err}`);
            }
        }
    }

    /**
     * Initializes the payment process for the passed Order
     * @param {*} order 
     */
    async autoInitPayment4Order(order: any, bankDetails: any = null, amountPaid: number = 0) {

        const controller = new PaymentsController();

        const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

        if (!rentalPackage) {
            throw new Error('Could not fetch rental package');
        }

        const amount2Pay = await rentalPackage.getTotalPrice();

        if (amountPaid) {       //because the money has already been refunded to the customer's credit balance, we must deduct it from that balance
            const customer = await Customer.findOne({ _id: order.customerId });

            if (customer) {
                customer.creditBalance -= amountPaid;

                await customer.save();

                const payment = await Payment.create({
                    customerId: customer._id.toString(),
                    type: CREDIT_PAYMENT,
                    amount: amountPaid,
                    resourceType: ORDER,
                    resourceId: order._id,
                    status: PAYMENT_COMPLETED
                });

                await CreditPayment.create({
                    paymentId: payment._id.toString()
                });
            }
        }

        if (order.paymentTypes.length === 1) {
            switch (order.paymentTypes[0]) {
                case CREDIT_PAYMENT:
                    // return await controller.mkOrderCreditPayment(order);
                    return await controller.mkCreditPayment4Resource(order.customerId, ORDER, order._id, amount2Pay, order?.discount ?? 0, amountPaid);
                case EXTERNAL_PAYMENT:
                    return await controller.initOrderExternalPayment(order, bankDetails, null, order?.discount ?? 0, amountPaid);
                case GATEWAY_PAYMENT:
                default:
                    return await controller.initOrderGatewayPayment(order, null, order?.discount ?? 0, amountPaid);
            }
        } else if (arrayContainsValue(order.paymentTypes, EXTERNAL_PAYMENT) && bankDetails) {
            return await controller.mkOrderCreditPaymentAndInitExternalPayment(order, bankDetails, order?.discount ?? 0, amountPaid);
        } else {
            return await controller.mkOrderCreditPaymentAndInitGatewayPayment(order, order?.discount ?? 0);
        }
    }

    /**
     * Initializes the payment process for the passed RentalTimeFrameExtension
     * @param {*} timeFrameExtension 
     * @returns 
     */
    async autoInitPayment4RentalTimeFrameExtension(timeFrameExtension: any, bankDetails: any = null) {
        const controller = new PaymentsController();

        if (timeFrameExtension.paymentTypes.length === 1) {
            switch (timeFrameExtension.paymentTypes[0]) {
                case CREDIT_PAYMENT:
                    const order = await Order.findOne({ rentalPackageId: timeFrameExtension.rentalPackageId });

                    if (!order) {
                        throw new Error('Could not fetch order');
                    }

                    const rentalPackage = await RentalPackage.findOne({ _id: timeFrameExtension.rentalPackageId });

                    if (!rentalPackage) {
                        throw new Error('Could not fetch rental package');
                    }

                    return await controller.mkCreditPayment4Resource(order.customerId, RENTAL_TIME_FRAME_EXTENSION, timeFrameExtension._id, await rentalPackage.getTotalPrice());
                case EXTERNAL_PAYMENT:
                    return await controller.initTimeFrameExtensionExternalPayment(timeFrameExtension, bankDetails)
                case GATEWAY_PAYMENT:
                default:
                    return await controller.initTimeFrameExtensionGatewayPayment(timeFrameExtension,);
            }
        } else if (arrayContainsValue(timeFrameExtension.paymentTypes, EXTERNAL_PAYMENT) && bankDetails) {
            return await controller.mkTimeExtCreditPaymentAndInitExternalPayment(timeFrameExtension, bankDetails);
        } else {
            return await controller.mkTimeExtCreditPaymentAndInitGatewayPayment(timeFrameExtension);
        }
    }

    async cancelPaymentById(_id: string) {

        const payment = await Payment.findOne({ _id });

        if (!payment) {
            throw new Error('Could not fetch payment');
        }

        const customer = await Customer.findOne({ _id: payment.customerId });

        if (!customer) {
            throw new Error('Could not fetch customer');
        }

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

                if (!gWPayment) {
                    throw new Error('Could not fetch Gateway payment');
                }

                //TODO: nullify the transaction url of the charge associated with this Payment
                const sessionId = gWPayment.sessionId;

                const session = await stripe.checkout.sessions.retrieve(sessionId as string);


                if (session && (session.status === 'open')) {
                    const session2 = await stripe.checkout.sessions.expire(sessionId);
                    console.log('Checkout session expired:', session);
                }

                await GatewayPayment.deleteOne({ _id: gWPayment._id });
                break;
            default:
                break;
        }

        return await Payment.deleteOne({ _id });
    }

    async exportHistory(req: Request, res: Response, next: NextFunction) {

        const authUser = await authController.getAuthUser(req);

        const startTimeStamp: number | null = req?.query?.startTimeStamp ? parseFloat(req?.query?.startTimeStamp as string) : null;
        const endTimeStamp: number | null = req?.query?.endTimeStamp ? parseFloat(req?.query?.endTimeStamp as string) : null;

        const paymentFilter: any = {
            customerId: req?.query?.customerId ?? undefined,
        }

        let query = Payment.find();

        let ors: any[] = req?.query?.resourceId ? [
            { resourceId: req?.query?.resourceId }
        ] : [];

        if (ors.length > 0) {
            query = query.or(ors);
        }

        if (authUser) {
            switch ((await authUser.getFields()).role.name) {
                case CUSTOMER:
                    query.where("customerId").equals(authUser._id.toString());
                    break;
                default:
                    break;
            }
        }

        if (startTimeStamp !== null) {

            query.where("creationTimeStamp").gte(startTimeStamp)

            if (endTimeStamp !== null) {

                query.where("creationTimeStamp").lte(endTimeStamp);

            }
        }

        for (const key in paymentFilter) {
            if (paymentFilter[key] !== undefined) {
                query.where(`${key}`).equals(paymentFilter[key]);
            }
        }

        const payments = await query.exec();

        if (payments) {
            let collection = [];
            let itr = 0;

            for (const payment of payments) {
                collection[itr++] = await payment.getFields4Export();
            }

            res.status(200).send(collection);
            return;
        }

        next("Something went wrong. Please, try again.");
    }
}

const paymentsController = new PaymentsController();

export default paymentsController;
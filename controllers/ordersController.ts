import { NextFunction, Request, Response } from "express";
import { ADMIN, APPROVED, AWAITING_DELIVERY, COMPLETED, CUSTOMER, DEPARTED, EXTERNAL_PAYMENT, GATEWAY_PAYMENT, INITIALIZED, IS_HISTORY, ORDER, PAYMENT_COMPLETED, STAFF, SUCCESS, UNAPPROVED, WARNING } from "../config/constants";
import Notification from "../db/models/notifications/Notification";
import Order from "../db/models/Order";
import OrderUpdateLog from "../db/models/OrderUpdateLog";
import GatewayPayment from "../db/models/payments/GatewayPayment";
import Payment from "../db/models/payments/Payment";
import RentalItem from "../db/models/RentalItem";
import RentalPackage from "../db/models/RentalPackage";
import RentalTimeFrameExtension from "../db/models/RentalTimeFrameExtension";
import Customer from "../db/models/users/Customer";
import User, { IUser } from "../db/models/users/User";
import { paymentLink } from "../globalVariables";
import { csvToArray, properlizeWords, valuesMatchSomeOptions } from "../helpers";
import { email } from "../serviceProviders/emailer";
import { DELIVERY_DRIVER_ASSIGNMENT, ORDER_DELETION, ORDER_REQUEST_ASSIGNED, RETRIEVAL_CONFIRMATION, RETRIEVAL_DRIVER_ASSIGNMENT } from "../serviceProviders/socketIOManager";
import authController from "./authController";
import emailsController from "./emailsController";
import paymentsController from "./paymentsController";
import rentalPackagesController from "./rentalPackagesController";
import rentalsTimeFramesExtensionsController from "./rentalsTimeFramesExtensionsController";

class OrdersController {

    async tryEmail(template: string, emailAddr: string, subject: string, emailData: any) {
        return await email.send({
            template: template,
            message: {
                to: emailAddr,
                subject: subject
            },
            locals: emailData
        });
    }

    /**
     * Make a new Order-Request: An Order with status "unapproved"
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    async mkRequest(req: Request, res: Response, next: NextFunction) {

        const rentalItem = await RentalItem.findOne({ _id: (req.body.rentalItems)[0]._id });

        if (rentalItem) {

            let staffId = rentalItem.staffId;

            const rentalPackage = await rentalPackagesController.mkRentalPackage({
                rentalItems: req.body.rentalItems,
                rentalDaysCount: req.body.rentalDaysCount,
                transportationFee: req?.body?.transportationFee ?? '0'
            });

            if (rentalPackage) {

                const user = (await authController.getAuthUser(req));

                if (user) {

                    const order = await Order.create({
                        customerAddress: req.body?.customerAddress ?? undefined,
                        creatorUserId: user._id.toString(),
                        customerId: req.body.customerId,
                        staffId,
                        rentalPackageId: rentalPackage._id,
                        siteId: req?.body?.siteId ?? '66no85365a02n99s8085w7a9',
                        paymentTypes: req.body.paymentTypes,
                        deliveryDueDate: req.body.deliveryDueDate,
                        remarks: req.body?.remarks ?? undefined,
                        discount: req.body?.discount ?? undefined
                    });

                    if (order) {
                        //TODO implement properly, after payment logic has been well-established.
                        try {

                            if (await paymentsController.autoInitPayment4Order(order, paymentsController.extractBankDetails(req))) {

                                let user = await authController.getAuthUser(req);

                                if (!user) {
                                    throw new Error('could not fetch user');
                                }

                                await Notification.create({
                                    msg: 'A new  rental order request was assigned to you.',
                                    actorUserId: user._id,
                                    action: ORDER_REQUEST_ASSIGNED,
                                    resourceType: ORDER,
                                    resourceId: order._id,
                                    targetUserId: staffId,
                                    indicates: WARNING
                                })

                                user = await User.findOne({ _id: staffId });

                                if (!user) {
                                    throw new Error('could not fetch customer');
                                }

                                const userData = await user.getFields();

                                let emailData: any = {
                                    orderId: order.ref,
                                    firstName: properlizeWords(userData.firstName),
                                    rentalItems: [],
                                    rentalDays: rentalPackage.rentalDaysCount

                                }

                                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {

                                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                                    if (!rentalItem) {
                                        throw new Error('could not fetch customer');
                                    }

                                    emailData.rentalItems[i] = {
                                        name: rentalItem.name,
                                        count: rentalPackage.rentalItems[i].count,
                                        subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                                    }
                                }

                                try {

                                    const controller = new OrdersController();

                                    // if (await controller.tryEmail('orderRequestAssignment', userData.email, ' Rental Order Request Assignment', emailData)) {
                                    //     res.status(200).send({
                                    //         msg: 'Successful!!',
                                    //         paymentLink
                                    //     });
                                    //     return;
                                    // }

                                    res.status(200).send({
                                        msg: 'Successful!!',
                                        paymentLink
                                    });
                                    return;

                                } catch (err) {
                                    console.log(`Error on attempt to email order-request assignment message. ${err}`);
                                    res.status(400);
                                    next('Order-request assigned, but email could not be sent to staff for notification.');
                                    return;
                                }
                            }
                        } catch (err) {

                            await RentalPackage.findOneAndDelete({ _id: rentalPackage._id });
                            await Order.findOneAndDelete({ _id: order._id });

                            console.log('AutoInitPayment for Oder: ', err);
                            res.status(500);
                            next(`Order could not be requested: Please, try again with another payment method.`);
                            return;
                        }
                    }
                }
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async fetchOrders(req: Request, res: Response, next: NextFunction) {
        const auth: IUser | null = await authController.getAuthUser(req);

        const ordersStatus = req?.query?.status ?? null;

        let query = Order.find();

        if (!auth) {
            throw new Error('could not fetch the authenticated user');
        }

        if ((await auth.getFields()).role.name === CUSTOMER) {
            const customer = await Customer.findOne({ userId: auth._id });

            if (!customer) {
                throw new Error('Could not find the customer')
            }

            query = query.where('customerId').equals(customer._id);
        } else if (req?.query?.customerId) {
            query = query.where('customerId').equals(req.query.customerId);
        }

        if (req?.query?.creatorUserId) {
            query = query.where('creatorUserId').equals(req.query.creatorUserId);
        }

        if (req?.query?.staffId) {
            query = query.where('staffId').equals(req.query.staffId);
        }

        if (req?.query?.rentalItemId) {
            const rentalPackages = await RentalPackage.find({ 'rentalItems._id': req?.query?.rentalItemId }).exec();

            let ors: any[] = [];

            for (const rentalPackage of rentalPackages) {
                ors = [
                    ...ors,
                    {
                        rentalPackageId: rentalPackage._id.toString()
                    }
                ];
            }

            query = query.and([{ $or: ors }]);
        }

        if ((await auth.getFields()).role.name === STAFF) {      //get the orders only assigned to the concerned staff
            query = query.where('staffId').equals(auth._id);
        }

        if (ordersStatus) {
            query = query.where('status').equals(ordersStatus);
        } else if (req.query.statuses) {
            const statuses = csvToArray(req.query.statuses as string);

            let ors = [];
            let itr = 0;

            for (const status of statuses) {
                ors[itr++] = { status }
            }
            query = query.and([{ $or: ors }])
        }

        if (req?.query?.deliveryDriverId) {
            const rentalPackagesIds = await rentalPackagesController.getRentalPackagesIdsForDeliveryDriverId(req.query.deliveryDriverId as string);

            if (rentalPackagesIds.length === 0) {
                res.status(200).send([]);
                return;
            }
            let ors = [];
            let itr = 0;


            for (const rentalPackageId of rentalPackagesIds) {
                ors[itr++] = { rentalPackageId }
            }

            query = query.and([{ $or: ors }]);
        }

        if (req?.query?.retrievalDriverId) {
            const rentalPackagesIds = await rentalPackagesController.getRentalPackagesIdsForRetrievalDriverId(req.query.retrievalDriverId as string);

            if (rentalPackagesIds.length === 0) {
                res.status(200).send([]);
                return;
            }

            let ors = [];
            let itr = 0;

            for (const rentalPackageId of rentalPackagesIds) {
                ors[itr++] = { rentalPackageId }
            }
            query = query.and([{ $or: ors }]);
        }


        query = query.sort({ createdAt: -1 });

        const orders = await query.exec();

        if (orders) {

            let completeOrders = [];
            let itr = 0;

            for (const order of orders) {
                completeOrders[itr++] = await order.getFields4Enum();
            }


            res.status(200).send(completeOrders);
            return;
        }


        next("Something went wrong. Please, try again.");
    }

    async fetch1(req: Request, res: Response, next: NextFunction) {
        const order = await Order.findOne({ _id: req.params.id });

        if (order) {
            res.status(200).send(await order.getFields());
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async getLatestOrder4User(user: IUser, rentalItemType: string) {

        const customer = await Customer.findOne({ userId: user._id ?? '' });

        if (customer) {
            const orders = await Order.find({ customerId: customer._id }).sort({ createdAt: -1 }).exec();

            if (orders) {

                for (const order of orders) {

                    const orderData = await order.getFields();

                    if (orderData?.rentalPackage?.rentalItems && (orderData?.rentalPackage?.rentalItems.length > 0)) {
                        const rentalItem = orderData?.rentalPackage?.rentalItems[0];

                        if (rentalItem && rentalItem.type === rentalItemType) {

                            if ((orderData.status === APPROVED) || (orderData.status === COMPLETED)) {

                                if ((order.status === APPROVED) && await order.completed()) {
                                    order.status = COMPLETED;

                                    const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

                                    if (rentalPackage) {
                                        rentalPackage.retrievalTimeStamp = (new Date()).getTime();

                                        await rentalPackage.save();
                                        await order.save();
                                    }
                                }

                                return (order.status === APPROVED) ? (await order.getFields()) : null;
                            }
                        }
                    }
                }
            }

            return null;
        }
    }

    async fetchLatestOrder(req: Request, res: Response, next: NextFunction) {

        try {
            const user: IUser | null = await authController.getAuthUser(req);
            const customer = await Customer.findOne({ userId: user?._id ?? '' });


            if (user && customer) {
                const orders = await Order.find({ customerId: customer._id }).sort({ createdAt: -1 }).exec();

                if (orders) {

                    for (const order of orders) {

                        const orderData = await order.getFields();

                        if (orderData?.rentalPackage?.rentalItems && (orderData?.rentalPackage?.rentalItems.length > 0)) {
                            const rentalItem = orderData?.rentalPackage?.rentalItems[0];

                            if (rentalItem && rentalItem.type === req.query.rentalItemType) {

                                if ((orderData.status === APPROVED) || (orderData.status === COMPLETED)) {

                                    if ((order.status === APPROVED) && await order.completed()) {
                                        order.status = COMPLETED;

                                        const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

                                        if (rentalPackage) {
                                            rentalPackage.retrievalTimeStamp = (new Date()).getTime();

                                            await rentalPackage.save();
                                            await order.save();
                                        }
                                    }

                                    res.status(200).send((order.status === APPROVED) ? (await order.getFields()) : null);
                                    return;
                                }
                            }
                        }
                    }
                }

                res.status(200).send(null);
                return;
            }
        } catch (err: any) {
            console.log('Error: ', err);
        }

        next('Something went wrong. Please, try again.');
    }

    async update1(req: Request, res: Response, next: NextFunction) {
        const packageFields = ["rentalItems", "rentalDaysCount", "transportationFee"];
        const orderFields = ["siteId", "deliveryDueDate", "remarks", "paymentTypes", "discount"];
        let updatedOrderFields: any[] = [];
        let updatedPackageFields: any[] = [];
        let toUpdatePayment = false;

        const orderId = req.params.id;

        const order = await Order.findOne({ _id: orderId });

        if (order) {
            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            if (rentalPackage) {

                const originalOrderData = order.getRawFields();
                const originalPackageData = rentalPackage.getRawFields();


                const user = await authController.getAuthUser(req);

                if (!user) {
                    throw new Error('Could not fetch the user')
                }

                let updateData: any = {
                    userId: user._id.toString(),
                    orderId: order._id.toString(),
                    oldData: await order.getLoggableData()
                }

                let packageData = {};
                let toUpdateRentalPackage = false;

                for (const field of packageFields) {
                    if (req.body[field]) {

                        updatedPackageFields = [...updatedPackageFields, field];

                        toUpdatePayment = true;

                        toUpdateRentalPackage = true;

                        packageData = {
                            ...packageData,
                            [field]: req.body[field]
                        }
                    }
                }

                if (toUpdateRentalPackage) {
                    try {
                        await RentalPackage.findOneAndUpdate({ _id: order.rentalPackageId }, packageData);
                    } catch (err) {
                        console.log(err);
                    }
                }

                let orderData = {};
                let toUpdateOrder = false;

                for (const field of orderFields) {
                    if (req.body[field]) {

                        updatedOrderFields = [...updatedOrderFields, field];

                        toUpdateOrder = true;

                        orderData = {
                            ...orderData,
                            [field]: req.body[field]
                        }
                    }
                }

                if (toUpdateOrder) {
                    await Order.findOneAndUpdate({ _id: orderId }, orderData);

                    const newOrder = await Order.findOne({ _id: orderId });

                    if (newOrder) {
                        updateData = {
                            ...updateData,
                            orderFields: updatedOrderFields,
                            packageFields: updatedPackageFields,
                            newData: await newOrder.getLoggableData()
                        };

                        const orderUpdate = await OrderUpdateLog.create(updateData);

                        //undo the changes because payment has not been made
                        await RentalPackage.findOneAndUpdate({ _id: rentalPackage._id.toString() }, originalPackageData);
                        await Order.findOneAndUpdate({ _id: order._id.toString() }, originalOrderData);
                    }
                }

                if (toUpdatePayment) {

                    try {
                        const gatewaySession = await paymentsController.initGatewayPayment4Balance(order.customerId, order._id.toString(), ORDER, parseFloat(req.body.totalCost));

                    } catch (err) {
                        console.log('AutoInitPayment for Oder: ', err);
                        res.status(500);
                        next('Online payment is currently not available. Try another payment method');
                        return;
                    }
                }

                res.status(200).send({
                    msg: 'Successful!!',
                    paymentLink
                });
                return;
            }

        }

        next('Something went wrong. Please, try again.');
    }


    /**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
    async approveRequest(req: Request, res: Response, next: NextFunction) {
        let order = await Order.findOne({ _id: req.params.id });

        if (order) {
            const oldOrder = order;
            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            if (rentalPackage) {
                order.status = APPROVED;
                order.approvalTimeStamp = (new Date()).getTime();

                rentalPackage.status = AWAITING_DELIVERY;

                if (req?.body?.driverId) {
                    rentalPackage.deliveryDriverId = req.body.driverId;
                }

                if (await order.save()) {
                    if (await rentalPackage.save()) {

                        const customer = await Customer.findOne({ _id: order.customerId });

                        if (!customer) {
                            throw new Error('Could not fetch customer details');
                        }

                        const customerData = await customer.getFields();
                        const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

                        if (!rentalPackage) {
                            throw new Error('Could not fetch rental package');
                        }

                        let emailData: any = {
                            orderId: order.ref,
                            firstName: properlizeWords(customerData.firstName),
                            rentalItems: [],
                            rentalDays: rentalPackage.rentalDaysCount

                        }

                        for (let i = 0; i < rentalPackage.rentalItems.length; i++) {

                            const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                            if (!rentalItem) {
                                throw new Error('Could not fetch rental item');
                            }

                            emailData.rentalItems[i] = {
                                name: rentalItem.name,
                                count: rentalPackage.rentalItems[i].count,
                                subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                            }
                        }

                        try {
                            const controller = new OrdersController();
                            if (await controller.tryEmail('orderRequestApproval', customerData.email, 'Rental Order Request Approval', emailData)) {
                                res.status(200).send({
                                    msg: 'Successful!'
                                });
                                return;
                            }
                        } catch (err) {
                            console.log(`Error on attempt to email order-request approval message. ${err}`);
                            res.status(400);
                            next('Order-request approved, but email could not be sent to customer for notification.');
                            return;
                        }
                    } else {
                        order = oldOrder;

                        await order.save();
                    }
                }

            }
        }


        next('Something went wrong. Please, try again.');

    }

    async assignDeliveryDriver(req: Request, res: Response, next: NextFunction) {
        const order = await Order.findOne({ _id: req.params.id });

        const user = await authController.getAuthUser(req);

        if (!order || !user) {
            throw new Error('Could not fetch the order.');
        }

        let updateData: any = {
            userId: user._id,
            orderId: order._id,
            oldData: await order.getLoggableData(),
            packageFields: ["deliveryDriver", "retrievalDriver"]
        }

        if (order) {
            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            if (!rentalPackage) {
                throw new Error('Could not fetch the rental package.');
            }

            rentalPackage.deliveryDriverId = req.body.driverId;
            rentalPackage.retrievalDriverId = req.body.driverId;

            if (await rentalPackage.save()) {

                if (!user) {
                    throw new Error('Could not fetch the order.');
                }

                await Notification.create({
                    msg: 'You have been assinged as the delivery Driver',
                    actorUserId: user._id,
                    action: DELIVERY_DRIVER_ASSIGNMENT,
                    resourceType: ORDER,
                    resourceId: order._id,
                    targetUserId: req.body.driverId,
                    indicates: WARNING
                });

                await Notification.create({
                    msg: 'You have been assinged as the pick-up Driver',
                    actorUserId: user._id,
                    action: RETRIEVAL_DRIVER_ASSIGNMENT,
                    resourceType: ORDER,
                    resourceId: order._id,
                    targetUserId: req.body.driverId,
                    indicates: WARNING
                });

                const driver = await User.findOne({ _id: req.body.driverId });

                if (!driver) {
                    throw new Error('Could not fetch the driver');
                }

                const userData = driver.getFields();

                let emailData: any = {
                    orderId: order.ref,
                    firstName: properlizeWords(userData.firstName),
                    rentalItems: [],
                    rentalDays: rentalPackage.rentalDaysCount

                }

                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {

                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    if (!rentalItem) {
                        throw new Error('Could not fetch rental item');
                    }

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
                        subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                    }
                }

                try {

                    const controller = new OrdersController();

                    if (await controller.tryEmail('deliveryAssignment', userData.email, 'Rental Delivery Assignment', emailData)) {

                        const newOrder = await Order.findOne({ _id: order._id });

                        if (!newOrder) {
                            throw new Error('Could not fetch the new order');
                        }

                        updateData = {
                            ...updateData,
                            newData: await newOrder.getLoggableData()
                        }

                        await OrderUpdateLog.create(updateData);

                        res.status(200).send({
                            msg: 'Successful!!'
                        });
                        return;
                    }
                } catch (err) {
                    console.log(`Error on attempt to email order-delivery assignment message. ${err}`);
                    res.status(400);
                    next('Order-delivery assigned, but email could not be sent to customer for notification.');
                    return;
                }

            }
        }

        next('Something went wrong. Please, try again.');
    }

    /**
     * Confirm the departure of an order from the company's warehouse
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    async confirmDepartureOf1(req: Request, res: Response, next: NextFunction) {
        const order = await Order.findOne({ _id: req.params.id });

        if (order) {
            order.status = DEPARTED;
            order.departureTimeStamp = (new Date()).getTime();

            if (await order.save()) {
                res.status(200).send({
                    msg: 'Departure from warehouse confirmed'
                });
                return;
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async assignRetrievalDriver(req: Request, res: Response, next: NextFunction) {
        const order = await Order.findOne({ _id: req.params.id });

        const user = await authController.getAuthUser(req);


        if (!user || !order) {
            throw new Error('Could not fetch the user or order');
        }

        let updateData: any = {
            userId: user._id,
            orderId: order._id,
            oldData: await order.getLoggableData(),
            packageFields: ["retrievalDriver"]
        }

        if (order) {
            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            if (!rentalPackage) {
                throw new Error('Could not fetch the rental package');
            }

            rentalPackage.retrievalDriverId = req.body.driverId;

            if (await rentalPackage.save()) {

                await Notification.create({
                    msg: 'You have been assinged as the pick-up Driver',
                    actorUserId: user._id,
                    action: RETRIEVAL_DRIVER_ASSIGNMENT,
                    resourceType: ORDER,
                    resourceId: order._id,
                    targetUserId: req.body.driverId,
                    indicates: WARNING
                });

                const driver = await User.findOne({ _id: req.body.driverId });

                if (!driver) {
                    throw new Error('Could not fetch the driver');
                }

                const userData = driver.getFields();

                let emailData: any = {
                    orderId: order.ref,
                    firstName: properlizeWords(userData.firstName),
                    rentalItems: [],
                    rentalDays: rentalPackage.rentalDaysCount

                }

                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {

                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    if (!rentalItem) {
                        throw new Error('Could not fetch the driver');
                    }

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
                        subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                    }
                }

                try {

                    const controller = new OrdersController();

                    if (await controller.tryEmail('retrievalAssignment', userData.email, 'Rental Return Assignment', emailData)) {

                        const newOrder = await Order.findOne({ _id: order._id });

                        if (!newOrder) {
                            throw new Error('Could not fetch the new order');
                        }

                        updateData = {
                            ...updateData,
                            newData: await newOrder.getLoggableData()
                        }

                        await OrderUpdateLog.create(updateData);

                        res.status(200).send({
                            msg: 'Successful!!'
                        });
                        return;
                    }
                } catch (err) {
                    console.log(`Error on attempt to email order pick-up assignment message. ${err}`);
                    res.status(400);
                    next('Order pick-up assigned, but email could not be sent to customer for notification.');
                    return;
                }
            }
        }

        next('Something went wrong. Please, try again.');
    }

    /**
     * confirm completion for one
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    async confirmCompletion41(req: Request, res: Response, next: NextFunction) {
        const order = await Order.findOneAndUpdate({ _id: req.params.id }, { status: COMPLETED });

        if (order) {
            const rentalPackage = await RentalPackage.findOneAndUpdate({ _id: order.rentalPackageId }, {
                status: IS_HISTORY,
                retrievalTimeStamp: (new Date()).getTime()
            });

            if (rentalPackage) {

                for (const itemEntry of rentalPackage.rentalItems) {
                    const item = await RentalItem.findOne({ _id: itemEntry._id });

                    if (!item) {
                        throw new Error('Could not fetch rental item');
                    }

                    item.unavailableCount -= itemEntry.count;

                    if (item.unavailableCount < 0) {
                        item.unavailableCount = 0;
                    }

                    await item.save();
                }

                const user = await authController.getAuthUser(req);

                if (!user) {
                    throw new Error('Could not fetch the user');
                }

                await Notification.create({
                    msg: 'Rental Package picked-up successfully',
                    actorUserId: user._id,
                    action: RETRIEVAL_CONFIRMATION,
                    resourceType: ORDER,
                    resourceId: order._id,
                    targetUserId: order.staffId,
                    targetRole: ADMIN,
                    indicates: SUCCESS
                })

                res.status(200).send({
                    msg: 'Order completed!!!'
                });
                return;
            } else {
                order.status = INITIALIZED;
                await order.save();
            }
        }


        next('Something went wrong. Please, try again.');
    }

    async delete1(req: Request, res: Response, next: NextFunction) {

        const orderId = req.params.id;

        const order = await Order.findOne({ _id: orderId });

        if (order) {

            const customer = await Customer.findOne({ _id: order.customerId });

            if (!customer) {
                throw new Error('Could not fetch the customer');
            }

            const customerData = await customer.getFields();
            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });

            const payments = await Payment.find({ resourceId: orderId });

            for (const payment of payments) {
                await paymentsController.cancelPaymentById(payment._id.toString());
            }


            const timeExtensions = await RentalTimeFrameExtension.find({ rentalPackageId: order.rentalPackageId });


            for (const timeExt of timeExtensions) {
                await rentalsTimeFramesExtensionsController.delete1ById(timeExt._id.toString());
            }

            if (await rentalPackagesController.delete1ById(order.rentalPackageId)) {
                await Order.deleteOne({ _id: orderId });

                const user = await authController.getAuthUser(req);

                if (!rentalPackage) {
                    throw new Error('Could not fetch the customer');
                }

                let emailData: any = {
                    orderId: order.ref,
                    firstName: properlizeWords(customerData.firstName),
                    rentalItems: [],
                    rentalDays: rentalPackage.rentalDaysCount

                }

                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {

                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    if (!rentalItem) {
                        throw new Error('Could not fetch the rental item');
                    }

                    emailData.rentalItems[i] = {
                        name: rentalItem.name,
                        count: rentalPackage.rentalItems[i].count,
                        subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                    }
                }

                try {
                    await emailsController.tryEmail("orderCancelation", customerData.email, "Rental Order Canceled", emailData);
                } catch (err) {
                    console.log(`Error on attempt to email order-cancelation message. ${err}`);
                    res.status(400);
                    next('Order canceled, but email could not be sent to customer for notification.');
                    return;
                }

                if (!user) {
                    throw new Error('Could not fetch the customer');
                }

                await Notification.create({
                    msg: 'An order your were assigned to has been canceled.',
                    actorUserId: user._id,
                    action: ORDER_DELETION,
                    resourceType: ORDER,
                    resourceId: order._id,
                    targetUserId: order.staffId,
                    indicates: SUCCESS
                })

                res.status(200).send({
                    msg: 'Deleted!! All payments made have been loaded into the Customer\'s credit balance'
                });
                return;
            }
        }

        next('Something went wrong. Please try again');
    }

    async exportHistory(req: Request, res: Response, next: NextFunction) {

        const authUser = await authController.getAuthUser(req);

        if (!authUser) {
            throw new Error('Could not fetch the customer');
        }

        const startTimeStamp: number | null = req?.query?.startTimeStamp ? parseFloat(req?.query?.startTimeStamp as string) : null;
        const endTimeStamp: number | null = req?.query?.endTimeStamp ? parseFloat(req?.query?.endTimeStamp as string) : null;

        const isCustomer = ((await authUser.getFields()).role.name === CUSTOMER);

        const orderFilter: any = {
            creatorUserId: isCustomer ? authUser._id.toString() : (req?.query?.creatorUserId ?? undefined),
            customerId: isCustomer ? authUser._id.toString() : (req?.query?.customerId ?? undefined),
            staffId: isCustomer ? undefined : (req?.query?.staffId ?? undefined)
        }

        const rentalPackageFilter = {
            deliveryDriverId: isCustomer ? undefined : (req?.query?.deliveryDriverId ?? undefined),
            retrievalDriverId: isCustomer ? undefined : (req?.query?.retrievalDriverId ?? undefined)
        }

        let query = Order.find();

        const rentalPackages = await rentalPackagesController.filterPackages(rentalPackageFilter);

        let ors = [];
        let orsItr = 0;     //the number of iterations of the ors

        if (rentalPackages.length > 0) {
            for (const rentalPackage of rentalPackages) {
                ors[orsItr++] = {
                    rentalPackageId: rentalPackage._id.toString()
                }
            }
        }


        //NOTE: all modification to ors should be done bofore the new line
        if (ors.length > 0) {
            query.or(ors);
        }

        if (startTimeStamp !== null) {

            query.where("creationTimeStamp").gte(startTimeStamp);

            if (endTimeStamp !== null) {

                query.where("creationTimeStamp").lte(endTimeStamp);

            }
        }


        for (const key in orderFilter) {
            if (orderFilter[key] !== undefined) {
                query.where(`${key}`).equals(orderFilter[key]);
            }
        }


        const orders = await query.exec();

        if (orders) {
            let collection = [];
            let itr = 0;

            for (const order of orders) {
                collection[itr++] = await order.getFields4Export();
            }

            res.status(200).send(collection);
            return;
        }


        next("Something went wrong. Please, try again.");
    }
}

const ordersController = new OrdersController();

export default ordersController;
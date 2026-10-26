import { NextFunction, Request, Response } from "express";
import { ADMIN, ORDER, SUCCESS } from "../config/constants";
import DeliveryNote from "../db/models/DeliveryNote";
import Notification from "../db/models/notifications/Notification";
import Order from "../db/models/Order";
import RentalItem from "../db/models/RentalItem";
import { email } from "../serviceProviders/emailer";
import { DELIVERY_CONFIRMATION } from "../serviceProviders/socketIOManager";
import authController from "./authController";

class DeliveryNotesController {

    async tryEmailCustomerWithDeliveryNote(emailData: any, emailAddr: string) {

        return await email.send({
            template: 'deliveryNote',
            message: {
                to: emailAddr,
                subject: 'Delivery Note for your Order'
            },
            locals: emailData
        });
    }


    async register(req: Request, res: Response, next: NextFunction) {
        const deliveryNote = await DeliveryNote.create({
            orderId: req.body.orderId,
            customerSign: req.body.customerSign,
            customerComment: (req.body?.customerComment && (req.body?.customerComment !== '')) ? req.body.customerComment : undefined,
            remarks: req?.body?.remarks ?? undefined,
            driverSign: req.body.driverSign
        });

        if (deliveryNote) {
            const data = await deliveryNote.getFields();
            const rentalPackage = data.rentalPackage;

            const order = await Order.findOne({_id: req.body.orderId})

            if (data && order) {
                const emailData: any = {
                    orderId: order?.ref ?? "#ask_admin",
                    firstName: data.customer.firstName,
                    rentalDays: data.rentalPackage.rentalDaysCount,
                    rentalItems: []
                }


                for (let i = 0; i < rentalPackage.rentalItems.length; i++) {

                    const rentalItem = await RentalItem.findOne({ _id: rentalPackage.rentalItems[i]._id });

                    if (!rentalItem) {
                        throw new Error('could not fetch the rental item.');
                    }

                    emailData.rentalItems[i] = {
                        name: rentalPackage.rentalItems[i].name,
                        count: rentalPackage.rentalItems[i].count,
                        subTotalPrice: rentalItem.getRentPrice(rentalPackage.rentalItems[i].count, rentalPackage.rentalDaysCount)
                    }
                }

                const controller = new DeliveryNotesController();

                const emailAddr = data.customer.email;

                try {

                    if (await controller.tryEmailCustomerWithDeliveryNote(emailData, emailAddr)) {

                        const user = await authController.getAuthUser(req);
                        const order = await Order.findOne({ _id: req.body.orderId });

                        if (!user || !order) {
                            throw new Error('could not fetch the user or order.');
                        }

                        await Notification.create({
                            msg: 'Order delivered successfully',
                            actorUserId: user._id,
                            action: DELIVERY_CONFIRMATION,
                            resourceType: ORDER,
                            resourceId: req.body.orderId,
                            targetUserId: order.staffId,
                            targetRole: ADMIN,
                            indicates: SUCCESS
                        })

                        res.status(200).send({
                            msg: 'Delivery confirmed!!'
                        });
                        return;
                    } else {
                        throw new Error('Could not email invoice.')
                    }
                } catch (err) {
                    console.log(`Emailing err: `, err);
                    res.status(500);
                    next('Delivery note registered but could not mail invoice to customer.');
                    return;
                }
            }
        }

        next('Something went wrong. Please, try again;')
    }

    async fetch4POrder(req: Request, res: Response, next: NextFunction) {
        const deliveryNote = await DeliveryNote.findOne({ orderId: req.params.id });

        if (deliveryNote) {
            const data = await deliveryNote.getFields();

            res.status(200).json(data);
            return;
        }

        next('Something went wrong. Please, try again;')
    }

}

const deliveryNotesController = new DeliveryNotesController();

export default deliveryNotesController;
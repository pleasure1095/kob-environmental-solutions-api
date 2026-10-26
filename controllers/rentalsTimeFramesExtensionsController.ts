import { NextFunction, Request, Response } from "express";
import { ADMIN, APPROVED, ORDER, SUCCESS } from "../config/constants";
import Notification from "../db/models/notifications/Notification";
import Order from "../db/models/Order";
import Payment from "../db/models/payments/Payment";
import RentalPackage from "../db/models/RentalPackage";
import RentalTimeFrameExtension from "../db/models/RentalTimeFrameExtension";
import { TIME_FRAME_EXTENSION_APPROVAL } from "../serviceProviders/socketIOManager";
import authController from "./authController";
import paymentsController from "./paymentsController";

class RentalsTimeFramesExtensionsController {

    /**
     * Make a request for RentalTimeFrameExtension
     * @param {*} res 
     * @param {*} res 
     * @param {*} next 
     */
    async mkRequest(req: Request, res: Response, next: NextFunction) {

        const timeFrameExtension = await RentalTimeFrameExtension.create({
            rentalPackageId: req.body.rentalPackageId,
            daysCount: req.body.daysCount,
            paymentTypes: req.body.paymentTypes
        });


        if (timeFrameExtension) {
            if (await paymentsController.autoInitPayment4RentalTimeFrameExtension(timeFrameExtension, paymentsController.extractBankDetails(req))) {

                const user = await authController.getAuthUser(req)
                const order = await Order.findOne({ rentalPackageId: timeFrameExtension.rentalPackageId });

                res.status(200).send({
                    msg: 'Ready player 2'
                });
                return;
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async approveRequest(req: Request, res: Response, next: NextFunction) {

        const timeExt = await RentalTimeFrameExtension.findOneAndUpdate({ _id: req.params.id }, { status: APPROVED });

        if (timeExt) {
            const user = await authController.getAuthUser(req);
            const order = await Order.findOne({ rentalPackageId: timeExt.rentalPackageId });

            if (!order) {
                throw new Error('could not fetch order');
            }

            const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });
            
            if (!user) {
                throw new Error('could not fetch order');
            }


            if (rentalPackage?.retrievalDriverId) {
                await Notification.create({
                    msg: 'Order rental time-frame extension approved.',
                    actorUserId: user._id,
                    action: TIME_FRAME_EXTENSION_APPROVAL,
                    resourceType: ORDER,
                    resourceId: order._id,
                    targetRole: ADMIN,
                    targetUserId: rentalPackage.retrievalDriverId,
                    indicates: SUCCESS
                });
            }

            res.status(200).send({
                msg: "Approved!!!"
            });
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async delete1ById(_id: string) {
        const timeExt = await RentalTimeFrameExtension.findOne({    });

        if (!timeExt) {
            throw new Error('Could not fetch the time extension');
        }

        const payments = await Payment.find({ resourceId: timeExt._id });

        for (const payment of payments) {
            await paymentsController.cancelPaymentById(payment._id.toString());
        }

        return await RentalTimeFrameExtension.deleteOne({ _id });
    }
}

const rentalsTimeFramesExtensionsController = new RentalsTimeFramesExtensionsController();

export default rentalsTimeFramesExtensionsController;
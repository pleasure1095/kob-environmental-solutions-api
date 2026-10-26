import { NextFunction, Request, Response } from "express";
import { ORDER, STAFF } from "../config/constants";
import authController from "../controllers/authController";
import Order from "../db/models/Order";
import Payment from "../db/models/payments/Payment";


const pPaymentAssigned2AuthStaff = async (req: Request, res: Response, next: NextFunction) => {
    const paymentId = req.params.id;

    const staff = await authController.getAuthUser(req);

    const payment = await Payment.findOne({ _id: paymentId });

    if (!staff || !payment) {
        throw new Error('could not fetch the payment or the staff');
    }

    if ((await staff.getFields()) !== STAFF) {
        next();
        return;
    }

    if (payment.resourceType === ORDER) {
        const order = await Order.findOne({ _id: payment.resourceId });

        if (order?.staffId === staff._id.toString()) {
            next();
            return;
        }
    } else {
        next();
        return;
    }

    res.status(401);
    next('Unauthorized: the concerned payment is not for an order assigned to you.');
}

export default pPaymentAssigned2AuthStaff;

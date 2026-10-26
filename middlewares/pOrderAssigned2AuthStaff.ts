import { NextFunction, Request, Response } from "express";
import { STAFF } from "../config/constants";
import authController from "../controllers/authController";
import Order, { IOrder } from "../db/models/Order";
import { IUser } from "../db/models/users/User";

const pOrderAssigned2AuthStaff = async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;

    const staff: IUser | null = await authController.getAuthUser(req);

    const order: IOrder | null = await Order.findOne({ _id: orderId });

    if (staff && (await staff.getFields()).role.name !== STAFF) {
        next();
        return;
    }

    if (order && staff && (order?.staffId === staff?._id.toString())) {
        next();
        return;
    }

    res.status(401);
    next('Unauthorized: the concerned order is not assigned to you.');
}

export default pOrderAssigned2AuthStaff;
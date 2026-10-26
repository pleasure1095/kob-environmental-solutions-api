import { NextFunction, Request, Response } from "express";
import { STAFF } from "../config/constants";
import authController from "../controllers/authController";
import Order, { IOrder } from "../db/models/Order";
import { IUser } from "../db/models/users/User";

const pOrderAssigned2AuthStaffIfAuthRoleIsStaff = async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;

    const user: IUser | null = await authController.getAuthUser(req);

    const order: IOrder | null = await Order.findOne({ _id: orderId });

    if (user && (await user.getFields()).role.name !== STAFF) {
        next();
        return;
    }

    if (order && user && (order.staffId === user._id.toString())) {
        next();
        return;
    }

    res.status(401);
    next('Unauthorized: the concerned order is not assigned to you.');
}

export default pOrderAssigned2AuthStaffIfAuthRoleIsStaff;
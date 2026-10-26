import { NextFunction, Request, Response } from "express";
import { DRIVER } from "../config/constants";
import authController from "../controllers/authController";
import Order, { IOrder } from "../db/models/Order";
import RentalPackage, { IRentalPackage } from "../db/models/RentalPackage";
import { IUser } from "../db/models/users/User";

const pOrderRetrievalAssigned2AuthDriver = async (req: Request, res: Response, next: NextFunction
    ) => {
    const order: IOrder | null = await Order.findOne({ _id: req.params.id });

    const rentalPackage: IRentalPackage | null = await RentalPackage.findOne({ _id: order?.rentalPackageId ?? "" });

    const auth: IUser | null = await authController.getAuthUser(req);

    if (auth && (await auth.getFields()).role.name !== DRIVER) {

        next();
        return;
    }

    if (auth && rentalPackage && (auth._id.toString() === rentalPackage?.retrievalDriverId?.toString())) {
        next();
        return;
    }

    res.status(401);
    next('unauthorized: you are not the assigned pick-up driver for the order.');
}

export default pOrderRetrievalAssigned2AuthDriver;
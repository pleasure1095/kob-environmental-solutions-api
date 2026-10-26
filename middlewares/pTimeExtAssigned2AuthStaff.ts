import { NextFunction, Request, Response } from "express";
import { STAFF } from "../config/constants";
import authController from "../controllers/authController";
import Order from "../db/models/Order";
import RentalPackage from "../db/models/RentalPackage";
import RentalTimeFrameExtension from "../db/models/RentalTimeFrameExtension";

const pTimeExtAssigned2AuthStaff = async (req: Request, res: Response, next: NextFunction) => {

    const authUser = await authController.getAuthUser(req);

    const isStaff = (authUser && (authUser.getFields().role.name === STAFF));

    if (isStaff) {
        next();
        return;
    }

    const timeExt = await RentalTimeFrameExtension.findOne({ _id: req.params.id });

    const rentalPackage = await RentalPackage.findOne({ _id: timeExt?.rentalPackageId ?? "" });

    const order = await Order.findOne({ rentalPackageId: rentalPackage?._id ?? "" });


    if (authUser?._id.toString() === order?.staffId.toString()) {
        next();
        return;
    }

    res.status(401);
    next('unauthorized: The concerned order is not assigned to you.');
}

export default pTimeExtAssigned2AuthStaff;
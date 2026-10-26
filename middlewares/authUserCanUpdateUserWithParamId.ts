import { NextFunction, Request, Response } from "express";
import authController from "../controllers/authController";

const authUserCanUpdateUserWithParamId = async (req: Request, res: Response, next: NextFunction) => {
    const authUser = await authController.getAuthUser(req);

    if (authUser) {
        if (authUser._id.toString() === req?.params?.id) {      //The authenticated user is attempting to update his/her own account
            next();
            return;
        } else {

            if (await authUser.isAdmin()) {
                next();
                return;
            }


            //TODO: validate that this authenticated user has the privilege to perform this action

        }
    }

    res.status(401);
    next("Unauthorized: you are not allowed to modify this user's profile.");
}

export default authUserCanUpdateUserWithParamId;
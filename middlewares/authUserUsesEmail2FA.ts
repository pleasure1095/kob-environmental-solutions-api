import { NextFunction, Request, Response } from "express";
import authController from "../controllers/authController";

const authUserUsesEmail2FA = async (req: Request, res: Response, next: NextFunction) => {
    const user = await authController.getAuthUser(req);

    if (user && user.usesEmail2FA) {
        next();
        return;
    }

    res.status(400);
    next("This user does not use E-mail 2FA.");
}

export default authUserUsesEmail2FA;
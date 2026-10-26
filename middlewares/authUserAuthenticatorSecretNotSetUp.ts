import { NextFunction, Request, Response } from "express";
import authController from "../controllers/authController";

const authUserAuthenticatorSecretNotSetUp = async (req: Request, res: Response, next: NextFunction) => {
    const authUser = await authController.getAuthUser(req);
    const userData = await authUser?.getFields() ?? null;

    if (userData && !userData?.authenticatorSecret) {
        next();
        return;
    }

    res.status(400);
    next('Authenticator secret already exists for this user.');
}

export default authUserAuthenticatorSecretNotSetUp;
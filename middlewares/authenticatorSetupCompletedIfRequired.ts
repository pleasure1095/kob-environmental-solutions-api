import { NextFunction, Request, Response } from "express";
import User from "../db/models/users/User";
import AuthenticatorSecret from "../db/models/AuthenticatorSecret";
import { APP_ERR_AUTHENTICATOR_SETUP_NOT_COMPLETED } from "../config/errorCodes";

const authenticatorSetupCompletedIfRequired = async (req: Request, res: Response, next: NextFunction) => {


    const user = await User.findOne({ email: req?.body?.email ?? "" });

    if (user && user.usesAuthenticator2FA) {

        const authenticatorSecret = await AuthenticatorSecret.findOne({userId: user._id.toString()});

        if (!authenticatorSecret || (authenticatorSecret && !authenticatorSecret?.confirmedAt)) {

            res.status(401).send({
                errMsg: "Unauthorized: Your account uses Authenticator 2FA, but you have not setup your authenticator app.",
                errCode: APP_ERR_AUTHENTICATOR_SETUP_NOT_COMPLETED
            });
            return;

        }

    }

    next();
}

export default authenticatorSetupCompletedIfRequired;
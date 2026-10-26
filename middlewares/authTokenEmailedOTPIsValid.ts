import { NextFunction, Request, Response } from "express";
import { body } from "express-validator";
import { EMAIL_OTP } from "../config/constants";
import AuthToken from "../db/models/AuthToken";
import AuthTokenOTP from "../db/models/AuthTokenOTP";
import { extractAuthToken } from "../helpers";

const authTokenEmailedOTPIsValid = async (req: Request, res: Response, next: NextFunction) => {
    
    if (req.body.type !== EMAIL_OTP) {
        next();
        return;
    }
    
    const authToken = await AuthToken.findOne({ value: extractAuthToken(req) ?? "" });
    const validSeconds4OTP = 60;

    if (authToken) {
        const otp = await AuthTokenOTP.findOne({ authTokenId: authToken._id.toString(), value: req.body.otp });

        if (otp) {
            if (!otp.hasExpired(validSeconds4OTP)) {
                next();
                return;
            } else {
                res.status(400);
                next("This O.T.P. has expired.");
                return;
            }
        }
    }

    res.status(400);
    next("Invalid O.T.P.");
}

export default authTokenEmailedOTPIsValid;
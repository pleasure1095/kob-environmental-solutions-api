import { NextFunction, Request, Response } from "express";
import EmailVerificationToken from "../db/models/EmailVerificationToken";

const paramEmailTokenIsValid = async (req: Request, res: Response, next: NextFunction) => {

    if (await EmailVerificationToken.findOne({ value: req.params.emailToken })) {
        next();
        return;
    }

    res.status(400);
    next('email-token expired.');
}

export default paramEmailTokenIsValid;
import { NextFunction, Request, Response } from "express";
import EmailVerificationToken from "../db/models/EmailVerificationToken";
import User from "../db/models/users/User";

class EmailVerificationTokensController {

    async fetchUser41(req: Request, res: Response, next: NextFunction) {

        const token = await EmailVerificationToken.findOne({ value: req.params.value });

        const user = await User.findOne({_id: token?.userId ?? ""});

        if (user) {
            res.status(200).send(user.getFields4EmailToken());
            return;
        }

        next("Something went wrong. Please, try again.");
    }

}

const emailVerificationTokensController = new EmailVerificationTokensController();

export default emailVerificationTokensController;
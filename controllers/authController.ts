import * as bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
import { AUTHENTICATOR_OTP, CUSTOMER, EMAIL_OTP, EMAIL_VERIFICATION_TOKEN, PASSWORD_RESET_TOKEN, AUTHENTICATOR_SETUP_TOKEN } from "../config/constants";
import AuthToken, { IAuthToken } from "../db/models/AuthToken";
import AuthTokenOTP from "../db/models/AuthTokenOTP";
import EmailVerificationToken from "../db/models/EmailVerificationToken";
import RentalItem from "../db/models/RentalItem";
import Role from "../db/models/Role";
import Customer from "../db/models/users/Customer";
import User, { IUser } from "../db/models/users/User";
import { days2MillSecs, extractAuthToken, generateRandomStr, generateRandPassword, properlizeWords, startWithUpperCase } from "../helpers";
import { tryEmail } from "../serviceProviders/emailer";
import authenticatorsSecretsController from "./authenticatorsSecretsController";
var jwt = require('jsonwebtoken');

class AuthController {

    async mkUserEmailVerificationLink(userId: string) {
        const token = generateRandomStr("abcdefghijklmnopqrstuvwxyz123456789&!0", 10);

        await EmailVerificationToken.deleteMany({ userId, type: EMAIL_VERIFICATION_TOKEN });

        await EmailVerificationToken.create({ userId, value: token, validSeconds: (60 * 5) });

        return `${process.env.APP_HOST_NAME}/api/email-verification-tokens/${token}/confirmation`;
    }

    async emailUser4EmailVerification(user: IUser, password: string | undefined = undefined) {

        const controller = new AuthController();

        const url = await controller.mkUserEmailVerificationLink(user._id.toString());

        const emailData = {
            firstName: startWithUpperCase(user.firstName),
            password,
            url,
            btnTxt: "Verify"
        }

        await tryEmail("userEmailVerification", user.email, "E-mail Verification", emailData);
    }

    async reEmailUser4EmailVerification(req: Request, res: Response, next: NextFunction) {

        const controller = new AuthController();

        let user = await User.findOne({ _id: req.body.userId });

        if (user) {

            try {

                const role = await Role.findOne({ _id: user.roleId });

                let needsNewPassword = false;

                if (role && (role.name !== CUSTOMER)) {
                    needsNewPassword = true;
                }

                if (needsNewPassword) {
                    let newPassword = generateRandPassword();

                    user.updatePassword(newPassword);

                    await user.save();

                    await controller.emailUser4EmailVerification(user, newPassword);
                } else {
                    await controller.emailUser4EmailVerification(user);
                }

                res.status(200).send({
                    msg: 'successful'
                });
                return;

            } catch (err) {
                console.log(`Error: ${err}`);
                next(`Could not send verification e-mail. Please, try again. If this error persists, contact an admin to get it resolved.`);
                return;
            }
        }

        next('Something went wrong. Please, try again');
    }

    async signUp(req: Request, res: Response, next: NextFunction) {

        const role = await Role.findOne({ name: CUSTOMER });

        if (role) {

            const requiredFields = ["firstName", "lastName", "email", "phone", "password"];
            const optionalsFields = ["otherName", "nickName", "preferredName", "dateOfBirth", "gender", "mobile", "status", "usesEmail2FA", "usesAuthenticator2FA"];

            let data: any = {
                roleId: role._id.toString()
            }

            for (const field of requiredFields) {
                data = {
                    ...data,
                    [field]: req.body[field]
                }
            }

            for (const field of optionalsFields) {
                if ((req.body[field] !== undefined) && (req.body[field] !== "")) {
                    data = {
                        ...data,
                        [field]: req.body[field]
                    }
                }

            }

            const user = await User.create(data);

            if (user) {

                const customer = await Customer.create({ userId: user._id.toString(), phoneNumber: user.phone, deliveryAddress: 'NA' });

                if (customer) {

                    try {
                        const controller = new AuthController();

                        await controller.emailUser4EmailVerification(user);

                        if (user.usesAuthenticator2FA) {
                            const secret = await authenticatorsSecretsController.setUpUserAuthenticatorSecret(user._id.toString());

                            const emailToken = await EmailVerificationToken.create({ userId: user._id.toString(), value: generateRandomStr(), type: AUTHENTICATOR_SETUP_TOKEN });

                            if (emailToken) {
                                const emailData = {
                                    firstName: startWithUpperCase(user.firstName),
                                    qrCodeData: secret.qrCodeData,
                                    url: `${process.env.APP_HOST_NAME}/api/authenticator-setup-page?emailToken=${emailToken.value}`,
                                    btnTxt: 'Setup Authenticator App'
                                };

                                await tryEmail("authenticatorSetUp", user.email, '2-Factor Authentication Setup', emailData);
                            }


                        }

                        res.status(200).send({
                            msg: "Success"
                        });
                        return;
                    } catch (err) {
                        console.log(`Error: ${err}`);
                        next(`Could not send email-verification e-mail. Please, try again. If this error persists, contact an admin to get it resolved.`);
                        return;
                    }
                }
            }
        }

        next("Something went wrong. Please, try again.");
    }

    async emailUser2VerifyEmail(req: Request, res: Response, next: NextFunction) {

        const user = await User.findOne({ email: req.body.email });

        if (user) {
            try {
                const controller = new AuthController();

                await controller.emailUser4EmailVerification(user);

                res.status(200).send({
                    msg: "Success"
                });
                return;
            } catch (err) {
                console.log(`Error: ${err}`);
                next(`Could not send verification e-mail. Please, try again. If this error persists, contact an admin to get it resolved.`);
                return;
            }
        }

        next("Something went wrong. Please, try again.");
    }

    async fetchEmailVerificationConfirmationPage(req: Request, res: Response, next: NextFunction) {
        const token = await EmailVerificationToken.findOne({ value: req.params.token });

        if (token) {
            res.status(200).redirect(`${process.env.APP_HOST_NAME}${process.env.EMAIL_VERIFICATION_SUCCESS_PAGE_URL}?emailToken=${req.params.token}`);
            return;
        }

        res.status(400).redirect(`${process.env.APP_HOST_NAME}${process.env.INVALID_EMAIL_VERIFICATION_TOKEN_PAGE_URL}?emailToken=${req.params.token}`)
    }

    async confirmEmailVerificationToken(req: Request, res: Response, next: NextFunction) {

        const token = await EmailVerificationToken.findOne({ value: req.params.token });

        if (token) {
            const user = await User.findOneAndUpdate({ _id: token.userId }, { emailVerifiedAt: (new Date()).getTime() });

            if (user) {
                await EmailVerificationToken.deleteMany({ userId: user._id, type: EMAIL_VERIFICATION_TOKEN });
            }

            res.status(200).send({
                msg: "Success"
            })
            return;
        }

        next("Something went wrong. Please, try again");
    }

    async login(req: Request, res: Response, next: NextFunction) {
        const user = await User.findOne({ email: req.body.email }, '-password');

        try {
            if (user) {
                const authTokenValue = jwt.sign({ userId: user._id }, process.env.JWT_KEY, { expiresIn: `3d` });

                const now = new Date();
                now.setTime(now.getTime() + days2MillSecs(3));

                const authToken = await AuthToken.create({
                    userId: user._id.toString(),
                    value: authTokenValue,
                    validTill: now.getTime()
                });

                if (authToken) {

                    if (user.usesEmail2FA) {
                        const controller = new AuthController();

                        try {
                            controller.tryEmail2FAOTP4AuthToken(authToken);
                        } catch (err) {
                            AuthToken.deleteMany({ _id: authToken._id });
                            console.log(`in AuthTokensOTPsController.initAndSend41: ${err}`);
                            next(`Could not email 2FA OTP. Try again. If this error persists, contact an admin of this system.`);
                            return;
                        }
                    }

                    res.status(200).send({
                        ...user.getFields42FA(),
                        ...authToken.getFields42FA()
                    });
                    return;
                }

            }

        } catch (err) {
            console.log(`Error: ${err}`);
        }
        next('Something went wrong. Please, try again.');
    }

    /**
* get authenticated user
* @param {*} req 
* @returns 
*/
    async getAuthUser(req: Request) {
        const authToken = await AuthToken.findOne({ value: extractAuthToken(req) ?? "" });

        if (authToken) {
            return await User.findOne({ _id: authToken.userId }, '-password');
        }

        throw new Error('Something went wrong. Please, try again.');
    }

    async fetchAuthUser(req: Request, res: Response, next: NextFunction) {

        const controller = new AuthController();

        const user = await controller.getAuthUser(req);

        if (user) {

            let userData = await user.getFields();
            const authToken = await AuthToken.findOne({ value: extractAuthToken(req) ?? "" });

            if (userData.role?.name === CUSTOMER) {
                const customer = await Customer.findOne({ userId: userData._id });

                if (customer) {
                    userData = {
                        ...userData,
                        customerId: customer._id.toString()
                    }
                }
            }

            if (authToken) {

                if ((user.usesEmail2FA && !authToken.email2FADone) || (user.usesAuthenticator2FA && !authToken.authenticator2FADone)) {
                    res.status(200).send({
                        ...user.getFields42FA(),
                        ...authToken.getFields42FA()
                    });
                } else {

                    let favouriteRentalItems: any[] = [];

                    if (user?.favouriteRentalItemsIds) {
                        for (const rentalItemId of user.favouriteRentalItemsIds) {
                            const item = await RentalItem.findOne({ _id: rentalItemId, deletedAt: undefined });

                            if (item) {
                                const staff = await User.findOne({ _id: item?.staffId ?? '' });

                                favouriteRentalItems = [
                                    ...favouriteRentalItems,
                                    {
                                        ...await item.getFields(),
                                        staff: staff ? (await staff.getFields()) : undefined
                                    }
                                ]
                            }
                        }
                    }

                    res.status(200).send({
                        ...userData,
                        ...(authToken.getFields()),
                        favouriteRentalItems
                    });
                }

            }
            return;
        }

        next("Something went wrong. Please, try again");
    }

    async tryEmail2FAOTP4AuthToken(authToken: IAuthToken) {
        const owner = await User.findOne({ _id: authToken.userId });

        await AuthTokenOTP.deleteMany({ authTokenId: authToken._id.toString(), type: EMAIL_OTP });

        const authTokenOTP = await AuthTokenOTP.create({
            authTokenId: authToken._id.toString(),
            value: generateRandomStr(),
            type: EMAIL_OTP,
        });

        if (owner && authTokenOTP) {

            const emailData = {
                firstName: owner.firstName,
                otp: authTokenOTP.value
            }

            await tryEmail("email_2fa_otp", owner.email, "O.T.P for 2 Factor Authentication", emailData);
        }
    }

    async tryEmail2FAOTP(req: Request, res: Response, next: NextFunction) {

        const authToken = await AuthToken.findOne({ value: extractAuthToken(req) ?? "" });

        if (authToken) {

            const owner = await User.findOne({ _id: authToken.userId });

            await AuthTokenOTP.deleteMany({ authTokenId: authToken._id.toString(), type: EMAIL_OTP });

            const authTokenOTP = await AuthTokenOTP.create({
                authTokenId: authToken._id.toString(),
                value: generateRandomStr(),
                type: EMAIL_OTP,
            });

            if (owner && authTokenOTP) {

                try {

                    const emailData = {
                        firstName: owner.firstName,
                        otp: authTokenOTP.value
                    }

                    await tryEmail("email_2fa_otp", owner.email, "O.T.P for 2 Factor Authentication", emailData);
                    res.status(200).send({
                        msg: "Success"
                    });
                } catch (err) {
                    console.log(`in AuthTokensOTPsController.initAndSend41: ${err}`);
                    next(`Could not email otp. Try again. If this error persists, contact an admin of this system.`);
                    return;
                }

            }
        }

        next("Something went wrong. Please, try again.");

    }

    async validateEmail2FAOTP(req: Request) {
        let authenticated = false;

        try {
            const authTokenOTP = await AuthTokenOTP.findOne({ value: req.body.otp, type: req.body.type });

            if (authTokenOTP) {
                await AuthTokenOTP.deleteMany({ value: req.body.otp, type: req.body.type });
                authenticated = true;

                const authToken = await AuthToken.findOne({ value: extractAuthToken(req) ?? "" });

                if (authToken) {
                    authToken.email2FADone = true;
                    await authToken.save();
                }
            }
        } catch (err) {
            console.log(`Error: ${err}`);
            throw new Error("Could not validate the e-mailed O.T.P.");
        }

        return authenticated;
    }

    async validateAuthenticator2FAOTP(req: Request) {
        let authenticated = false;

        authenticated = await authenticatorsSecretsController.validateOTP(req);

        const authToken = await AuthToken.findOne({ value: extractAuthToken(req) ?? "" });

        if (authToken) {
            authToken.authenticator2FADone = true;
            await authToken.save();
        }

        return authenticated;
    }

    async validate2FAOTP(req: Request, res: Response, next: NextFunction) {

        const controller = new AuthController();
        let authenticated = false;

        try {
            switch (req.body.type) {
                case EMAIL_OTP:
                    authenticated = await controller.validateEmail2FAOTP(req);
                    break;
                case AUTHENTICATOR_OTP:
                    authenticated = await controller.validateAuthenticator2FAOTP(req);
                default:
                    break;
            }
        } catch (err) {
            console.log(err);
            res.status(400);
            next(new String(err));
            return;
        }

        if (authenticated) {

            const authToken = await AuthToken.findOne({ value: extractAuthToken(req) ?? "" });
            const user = await User.findOne({ _id: authToken?.userId ?? "" });

            if (authToken && user) {
                res.status(200).send({
                    ...user.getFields42FA(),
                    ...authToken.getFields42FA()
                });
            }
        }

        next("Something went wrong. Please, try again.");
    }

    async mkUserLink4PasswordReset(userId: string) {
        const token = generateRandomStr("abcdefghijklmnopqrstuvwxyz123456789&!0", 10);

        await EmailVerificationToken.create({ userId, value: token, type: PASSWORD_RESET_TOKEN });

        return `${process.env.APP_HOST_NAME}/api/password-reset-page?token=${token}`;
    }

    async emailLink4PasswordReset(req: Request, res: Response, next: NextFunction) {
        const controller = new AuthController();
        const user = await User.findOne({ email: req.body.email });

        if (user) {
            const emailData = {
                firstName: properlizeWords(user?.firstName),
                url: await controller.mkUserLink4PasswordReset(user._id.toString()),
                btnTxt: 'Reset Password'
            };

            try {
                await tryEmail("passwordReset", user.email, "Reset Your Password", emailData);

                res.status(200).send({
                    msg: "Success"
                });
                return;
            } catch (err) {
                console.log(`Error: ${err}`);
            }

        }
        next('Something went wrong. Please, try again.');
    }

    async fetchPasswordResetPage4Token(req: Request, res: Response) {

        if (req?.query.token) {
            const token = await EmailVerificationToken.findOne({ value: req.query.token as string, type: PASSWORD_RESET_TOKEN });

            if (token) {
                const user = await User.findOne({ _id: token.userId });

                if (user) {

                    res.status(200).redirect(`${process.env.PASSWORD_RESET_PAGE_URL}/${token.value}`);
                    return;
                }
            }
        }

        res.status(400).redirect(`${process.env.INVALID_PASSWORD_RESET_TOKEN_PAGE_URL}`);

    }

    async resetPassword41(req: Request, res: Response, next: NextFunction) {

        const emailToken = await EmailVerificationToken.findOne({ value: req.body.token, type: PASSWORD_RESET_TOKEN });

        if (emailToken) {

            const salt = bcrypt.genSaltSync(10);

            const newPassword = bcrypt.hashSync(req.body.newPassword, salt);

            const user = await User.findOneAndUpdate({ _id: emailToken.userId }, { password: newPassword });

            if (user) {
                await emailToken.deleteOne();
                await EmailVerificationToken.deleteMany({ userId: user._id });

                res.status(200).send({
                    msg: "Success"
                });
                return;
            }

        }

        next('Something went wrong. Please, try again.')
    }

    async logout(req: Request, res: Response, next: NextFunction) {
        if (await AuthToken.deleteMany({ value: extractAuthToken(req) ?? "" })) {
            res.status(200).send({
                msg: "Success"
            });
            return;
        }
        next("Something went wrong. Please, try again.");
    }
}

const authController = new AuthController();

export default authController;
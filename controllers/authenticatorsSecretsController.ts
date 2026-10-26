import { NextFunction, Request, Response } from "express";
import * as speakEasy from 'speakeasy';
import * as qrCode from 'qrcode';
import AuthenticatorSecret from "../db/models/AuthenticatorSecret";
import User from "../db/models/users/User";
import { extractAuthToken, generateRandomStr, startWithUpperCase } from "../helpers";
import EmailVerificationToken from "../db/models/EmailVerificationToken";
import { AUTHENTICATOR_OTP, AUTHENTICATOR_SETUP_TOKEN } from "../config/constants";
import { tryEmail } from "../serviceProviders/emailer";
import AuthToken from "../db/models/AuthToken";

class AuthenticatorsSecretsController {

    async setUpUserAuthenticatorSecret(userId: string) {

        {
            const authenticatorSecret = await AuthenticatorSecret.findOne({ userId });

            if (authenticatorSecret) {
                return authenticatorSecret;
            }
        }

        try {
            const secret = speakEasy.generateSecret({
                name: process.env.APP_NAME,
            });

            if (secret?.otpauth_url) {
                const qrCodeData = await qrCode.toDataURL(secret.otpauth_url);

                const authenticatorSecret = await AuthenticatorSecret.create({
                    userId,
                    secret: secret.base32,
                    qrCodeData
                });

                if (authenticatorSecret) {
                    return authenticatorSecret;
                }
            }

            throw new Error('Could not generate QRcode to scan with Authenticator App.');

        } catch (err) {
            throw new Error(err as string);
        }
    }

    async redirect2AuthenticatorSetUpPage(req: Request, res: Response) {
        const token = req.query?.emailToken ?? null;

        if (token) {
            res.redirect(`${process.env.APP_HOST_NAME}${process.env.AUTHENTICATOR_SETUP_PAGE_URL}?emailToken=${token}`);
            return;
        }

        //Invalid path will redirect to "Not Found" page on the consuming app.
        res.redirect('/olaindsoidasndsa');
    }

    async fetchAuthenticatorSecret4EmailedToken(req: Request, res: Response, next: NextFunction) {

        const emailVerificationToken = await EmailVerificationToken.findOne({ value: req.query?.emailedToken as string ?? "", type: AUTHENTICATOR_SETUP_TOKEN });

        if (emailVerificationToken) {
            const authenticatorSecret = await AuthenticatorSecret.findOne({ userId: emailVerificationToken.userId });

            if (authenticatorSecret) {
                res.status(200).send({
                    ...authenticatorSecret.getFields()
                });
                return;
            }


        }

        next("Something went wrong. Please, try again.");
    }

    async setUpAuthUserAuthenticatorSecret(req: Request, res: Response, next: NextFunction) {
        let authUser = null

        const authToken = await AuthToken.findOne({ value: extractAuthToken(req) ?? "" });

        if (authToken) {
            authUser = await User.findOne({ _id: authToken.userId }, '-password');
        }

        if (authUser) {
            const controller = new AuthenticatorsSecretsController();

            const secret = await controller.setUpUserAuthenticatorSecret(authUser._id);

            if (secret) {
                res.status(200).send(secret.getFields());
                return;
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async setUpAuthenticatorSecret41User(req: Request, res: Response, next: NextFunction) {

        let user: any = null;

        if (req?.body?.email) {
            user = await User.findOne({ email: req.body.email });

        } else {
            user = await User.findOne({ _id: req.body.userId });

        }

        if (user) {
            const controller = new AuthenticatorsSecretsController();

            const secret = await controller.setUpUserAuthenticatorSecret(user._id);

            if (secret) {

                try {
                    await EmailVerificationToken.deleteMany({ userId: user._id.toString(), type: AUTHENTICATOR_SETUP_TOKEN });
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
                } catch (err) {
                    console.log('Mail err ', err);
                    next('authenticator-setup details could not be mailed.');
                    return;
                }

                res.status(200).send({
                    msg: "Success: the registered e-mail has been mailed on steps to follow for the authenticator setup"
                });
                return;
            }
        }
    }

    verifyOTP(otp: string, secret: string) {
        const isValid = speakEasy.totp.verify({
            secret,
            encoding: 'base32',
            token: otp
        });

        if (isValid) {
            return true;
        }

        return false;
    }

    async validateOTP(req: Request) {
        try {
            let userId: string | null = null;

            if (req.body?.emailToken) {
                const token = await EmailVerificationToken.findOne({ value: req.body?.emailToken ?? (req.body?.emailedToken ?? "") });
                if (token) {
                    userId = token.userId;
                }
            } else {
                const authToken = await AuthToken.findOne({ value: extractAuthToken(req) ?? "" });
                userId = authToken?.userId ?? null;
            }

            if (!userId) {
                throw new String("Email verification token is missing in the request.");
            }

            const authenticatorSecret = await AuthenticatorSecret.findOne({ userId });

            if (authenticatorSecret) {
                const secret = authenticatorSecret.secret;

                const controller = new AuthenticatorsSecretsController();

                if (controller.verifyOTP(req.body.otp, secret)) {
                    if (req.body?.emailToken) {
                        await EmailVerificationToken.deleteOne({ value: req.body.emailToken });
                    }

                    if (!authenticatorSecret?.confirmedAt) {
                        authenticatorSecret.confirmedAt = (new Date()).getTime();
                        await authenticatorSecret.save();
                    }

                    return true;

                } else {
                    throw new String('The O.T.P is invalid or the O.T.P has expired');
                }
            }

        } catch (err) {
            throw new String(err as string);
        }

        return false;
    }

    /**
     * 
     * @param req confirm Setup for one
     * @param res 
     * @param next 
     * @returns 
     */
    async confirmSetup41(req: Request, res: Response, next: NextFunction) {

        try {

            const authenticatorsSecretsController = new AuthenticatorsSecretsController();

            if (await authenticatorsSecretsController.validateOTP(req)) {

                if (req?.body?.emailToken) {
                    await EmailVerificationToken.deleteMany({ value: req.body.emailToken, type: AUTHENTICATOR_SETUP_TOKEN });
                }

                res.status(200).send({
                    msg: "Success"
                });
                return;
            }
        } catch (err) {
            res.status(400);
            next(err);
            return;
        }

        next("Something went wrong. Please, try again.");
    }
}

const authenticatorsSecretsController = new AuthenticatorsSecretsController();

export default authenticatorsSecretsController;
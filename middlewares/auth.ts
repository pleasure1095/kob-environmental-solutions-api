import { NextFunction, Request, response, Response } from "express";
import { AUTHENTICATOR_2FA_PAGE, C, D, EMAIL_2FA_PAGE, EMAIL_OTP, LOGIN_PAGE, R, U, USER_ACTIVE } from "../config/constants";
import { APP_ERR_EMAIL_UNVERIFIED } from "../config/errorCodes";
import authController from "../controllers/authController";
import AuthToken from "../db/models/AuthToken";
import AuthTokenOTP from "../db/models/AuthTokenOTP";
import User, { IUser } from "../db/models/users/User";
import { decodeJWTToken, extractAuthToken } from "../helpers";
import { getAbilities4User } from "../serviceProviders/caslAbilitiesProvider";

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    const authTokenValue = extractAuthToken(req);

    let email2FA = false;
    let authenticator2FA = false;

    if (authTokenValue) {
        const authToken = await AuthToken.findOne({ value: authTokenValue });

        if (authToken) {
            const user = await User.findOne({ _id: authToken.userId });

            if (user) {
                let authenticated = true;

                if (user.usesEmail2FA) {
                    authenticated = authToken.email2FADone;

                    email2FA = !authenticated;
                }

                if (authenticated && user.usesAuthenticator2FA) {
                    authenticated = authToken.authenticator2FADone;
                    authenticator2FA = !authenticated;
                }

                if (authenticated) {
                    next();
                    return;
                }
            }
        }
    }

    res.status(401).send({
        errMsg: "Unauthorized: Complete your authentication to continue.",
        errCode: undefined,
        redirect: email2FA ? EMAIL_2FA_PAGE : (authenticator2FA ? AUTHENTICATOR_2FA_PAGE : LOGIN_PAGE)
    });
}

export const hasValidAuthToken = async (req: Request, res: Response, next: NextFunction) => {
    let authTokenValue = extractAuthToken(req);

    try {
        decodeJWTToken(authTokenValue ?? '');

        if (await AuthToken.findOne({ value: authTokenValue ?? "" })) {
            next();
            return;
        }
    } catch (err) {
        await AuthToken.findOneAndDelete({ value: authTokenValue ?? "" });
     }

    res.status(401);
    next('Unauthorized: only logged-in users can perform this action.');
    return;
}

export const hasNoAuthToken = (req: Request, res: Response, next: NextFunction) => {
    let authTokenValue = extractAuthToken(req);

    if (authTokenValue && decodeJWTToken(authTokenValue)) {
        res.status(401);
        next('Unauthorized: only unauthenticated users can perform this action.');
        return;
    }

    next();
}


export const loginCredentialsCorrect = async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user || !user.passwordMatches(user, req?.body?.password ?? "")) {
        res.status(400);

        next('Email or password incorrect. Please, try again');
        return;
    }

    next();
}

export const loginEmailVerified = async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findOne({ email: req.body.email }, '-password');

    if (user) {
        if (user?.emailVerifiedAt) {
            next();
            return;
        } else {        //This user's email is not verified
            res.status(401).send({
                errMsg: "Unauthorized: verify your email to complete this action.",
                errCode: APP_ERR_EMAIL_UNVERIFIED,
            });
            return;
        }
    }

    res.status(400);
    next(`Invalid credentials.`);
}

export const userIsActive = async (req: Request, res: Response, next: NextFunction) => {

    const user = await User.findOne({ email: req.body.email }, '-password');

    if (user) {
        if (user.status === USER_ACTIVE) {
            next();
            return;
        }

        res.status(401);
        next("Unauthorized: your account has been disabled. Contact an admin to re-activate it.");
        return;
    }

    next('Something went wrong. Please, try again.');
}

export const oldEmail2FAOTPExpired = async (req: Request, res: Response, next: NextFunction) => {
    const authToken = await AuthToken.findOne({ value: extractAuthToken(req) ?? "" });
    const validSeconds4OTP = 60 + 60;

    if (authToken) {
        const otp = await AuthTokenOTP.findOne({ type: EMAIL_OTP, authTokenId: authToken._id.toString() });

        if (otp && !otp.hasExpired(validSeconds4OTP)) {
            res.status(400).send({
                errMsg: `Bad request: O.T.P already sent. Check your mail-box or try again in ${otp.getValidSecondsLeft(validSeconds4OTP)} second${(otp.getValidSecondsLeft(validSeconds4OTP) > 1) ? "s" : ""}.`
            });
            return;
        }
    }

    next();
}


export const mkAuthUserCanPerformActionOnModel = async (action: string, modelName: string) => {

    return async (req: Request, res: Response, next: NextFunction) => {
        const user = await authController.getAuthUser(req);

        if (user) {
            const { customAbilities, userAbilities, roleAbilities } = await getAbilities4User(user);

            if (customAbilities?.cannot(action, modelName)) {
                response.status(401).send({
                    errMsg: `Unauthorized: you are not privileged to perform this action on this resource.`
                });
                return;
            } else if (customAbilities?.can(action, modelName)) {
                next();
                return;
            }

            if (userAbilities?.cannot(action, modelName)) {
                response.status(401).send({
                    errMsg: `Unauthorized: you are not privileged to perform this action on this resource.`
                });
                return;
            } else if (userAbilities?.can(action, modelName)) {
                next();
                return;
            }

            if (roleAbilities?.cannot(action, modelName)) {
                response.status(401).send({
                    errMsg: `Unauthorized: you are not privileged to perform this action on this resource.`
                });
                return;
            } else if (roleAbilities?.can(action, modelName)) {
                next();
                return;
            } else {
                //TODO: set default abilities for this user
            }


        }

        response.status(401).send({
            errMsg: `Unauthorized: you are not privileged to perform this action on this resource.`
        });
        return;

    }
}

export const mkPlaysRole = (role: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {     //playsRole
        const authToken = extractAuthToken(req);

        if (authToken) {        //an authorization token is coupled with the passed request
            const decoded = decodeJWTToken(authToken);

            if (decoded?.userId) {      //the user is authenticated
                const user: IUser | null = await User.findById(decoded.userId);

                if (user && ((await user.getFields()).role.name === role)) {      //the user plays the passed role
                    next();
                    return;
                }
            }
        }

        res.status(401);
        next(`Unauthorized: only ${role}s can perform this action.`);
    }
}


export const mkPlaysOneOfRoles = (roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {     //playsRole
        const authToken = extractAuthToken(req);

        if (authToken) {        //an authorization token is coupled with the passed request
            const decoded = decodeJWTToken(authToken);

            if (decoded?.userId) {      //the user is authenticated
                const user = await User.findById(decoded.userId);

                if (!user) {
                    res.status(401);
                    next(`Unauthorized: the role you play is not permitted to make such request.`);
                    return;
                }

                for (const role of roles) {
                    if ((await user.getFields()).role.name === role) {      //the user plays the passed role
                        next();
                        return;
                    }
                }
            }
        }

        res.status(401);
        next(`Unauthorized: the role you play is not permitted to make such request.`);
    }
}
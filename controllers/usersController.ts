import { NextFunction, Request, Response } from "express";
import { unlink } from "fs";
import { ACTIVE, AUTHENTICATOR_SETUP_TOKEN, CUSTOMER, DISABLED, MEMBERSHIP, SME_OWNER_UNVERIFIED, SME_OWNER_VERIFIED, UNVERIFIED, USER_DISABLED, VERIFIED } from "../config/constants";
import AuthToken from "../db/models/AuthToken";
import EmailVerificationToken from "../db/models/EmailVerificationToken";
import Role, { IRole } from "../db/models/Role";
import User, { IUser } from "../db/models/users/User";
import { extractAuthToken, generateRandomStr, generateRandPassword, generateRandStr, getBaseDirPath, properlizeWords, startWithUpperCase } from "../helpers";
import { email, tryEmail } from "../serviceProviders/emailer";
import authController from "./authController";
import authenticatorsSecretsController from "./authenticatorsSecretsController";
import emailsController from "./emailsController";
import ordersController from "./ordersController";
var jwt = require('jsonwebtoken');

class UsersController {

    /**
     * performs all the subsequent procedures to be peformed, after the e-mail of the passed user has been updated
     * @param userId 
     */
    async handleEmailUpdate4User(userId: string) {
        const user = await User.findOne({ _id: userId });

        if (user) {

            user.emailVerifiedAt = undefined;

            await user.save();

            await authController.emailUser4EmailVerification(user);
            return;
        }

        throw new Error("E-mail (for the verification of the new e-mail address) could not be delivered. Please try again. If this error persists, contact an admin.");
    }

    /**
     * performs all the subsequent procedures to be performed, after the status of the passed user has been updated.
     * @param userId 
     */
    async handleUserStatusUpdate4User(userId: string) {
        //TODO: created (05:32pm, 20-04-2024): comtemplating on need for this method. Continually implement as needs come.
    }

    userFieldIsBoolean(field: string) {
        const fields = ["usesEmail2FA", "usesAuthenticator2FA"];

        for (const testField of fields) {
            if (field === testField) {
                return true;
            }
        }

        return false;
    }

    async mkUserEmailVerificationLink(userId: string) {
        const token = jwt.sign({ userId }, process.env.JWT_KEY, { expiresIn: `100d` });

        await EmailVerificationToken.deleteOne({ userId });

        await EmailVerificationToken.create({ userId, value: token });

        return `${process.env.APP_HOST_NAME}/email-verification/${token}`;
    }

    /**
 * e-mail the staff to verify his/her email
 */
    async emailStaff2VerifyEmail(user: any, password: string | null = null) {

        const data = {
            firstName: user.firstName,
            password: password ? password : undefined,
            url: await this.mkUserEmailVerificationLink(user._id),
            btnTxt: 'Verify email'
        }

        return await email.send({
            template: `workerEmailVerification`,
            message: {
                to: user.email,
                subject: 'Email Verification'
            },
            locals: data
        });

    }

    /**
     * Fegisters a user, with the passed role
     * @param {*} req 
     * @param {*} role 
     * @returns 
     */
    async register1(req: Request, next: NextFunction, role: string) {

        if (!req.body?.password) {
            req.body.password = generateRandPassword();
        }

        const roleModel: IRole | null = await Role.findOne({ name: role });

        if (!roleModel) {
            throw new Error('could not fetch the concerned role.');
        }

        if (roleModel) {

            const requiredFields = ["firstName", "lastName", "email", "phone", "password"];
            const optionalsFields = ["otherName", "about", "nickName", "preferredName", "specialRole", "dateOfBirth", "gender", "mobile", "status", "smeOwnerStatus", "usesEmail2FA", "usesAuthenticator2FA"];

            let data: any = {
                roleId: roleModel._id.toString()
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

                try {

                    await authController.emailUser4EmailVerification(user, req.body.password);

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

                    return true;

                } catch (err) {
                    console.log(`Error: ${err}`);
                    next(`Could not send email-verification e-mail. Please, try again. If this error persists, contact an admin to get it resolved.`);
                    return;
                }
            }
        }

        next('Something went wrong. Please, try again');
    }

    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const controller = new UsersController();
            if (await controller.register1(req, next, req.body.role)) {
                res.status(200).send({
                    msg: 'Registeration successful. Verification mail has been sent to the registered email.'
                });
                return;
            }
        } catch (err) {
            next('Registeration successful, but could not send verification mail. Try logging in.');
        }
    }

    async fetchAll4Role(req: Request, res: Response, next: NextFunction) {

        const role: IRole | null = await Role.findOne({ name: req.query.role as string });

        const users = await usersController.fetchAll(req, next, role?.name ?? "12e21dw", (req?.query?.smeOwnerStatus as string) ?? undefined);

        if (users) {

            let usersData = [];
            let itr = 0;


            for (let user of users) {

                if (role?.name === CUSTOMER) {

                    const activeMembership = (await ordersController.getLatestOrder4User(user, MEMBERSHIP)) ?? undefined;

                    usersData[itr++] = {
                        ...(await user.getFields()),
                        activeMembershipType: activeMembership ? activeMembership.rentalPackage.rentalItems[0].name : undefined
                    }
                } else {
                    usersData[itr++] = {
                        ...(await user.getFields()),
                    }
                }

            }

            res.status(200).send({ users: usersData });
            return;
        }

        next('something went wrong. Please, try again.');

    }

    async fetchUsers4Export(req: Request, res: Response, next: NextFunction) {

        let role: IRole | null = null;

        if (req.query?.role) {
            role = await Role.findOne({ name: req.query?.role as string });
        }

        let query: any = null;

        if (role) {
            query = User.find({ roleId: role._id, deletedAt: undefined });
        } else {
            query = User.find({ deletedAt: undefined });
        }

        let filteredUsers: any[] = [];

        if ((req.query?.emailVerificationStatus !== undefined) && (req.query?.emailVerificationStatus !== "")) {
            switch (req.query?.emailVerificationStatus) {
                case VERIFIED:
                    query = query.nor([{ emailVerifiedAt: undefined }]);
                    break;
                case UNVERIFIED:
                    query = query.where("emailVerifiedAt").equals(undefined); 33
                default:
                    break;
            }
        }

        const users = await query.exec();

        if (users) {

            if (req.query?.activeMembershipType !== undefined) {
                for (const user of users) {
                    const activeMembership = (await ordersController.getLatestOrder4User(user, MEMBERSHIP)) ?? undefined;

                    if (activeMembership) {
                        const membershipType = activeMembership.rentalPackage.rentalItems[0].name;

                        if (membershipType === req.query?.activeMembershipType) {
                            filteredUsers = [
                                ...filteredUsers,
                                {
                                    ...(await user.getFields())
                                }
                            ]
                        }
                    }
                }
            } else {

                for (const user of users) {
                    filteredUsers = [
                        ...filteredUsers,
                        {
                            ...(await user.getFields())
                        }
                    ];
                }

            }

            res.status(200).send(filteredUsers);
            return;

        }

        next("Something went wrong. Please, try again");
    }

    async fetchAll(req: Request, next: NextFunction, role: string, smeOwnerStatus?: string) {

        const roleModel: IRole | null = await Role.findOne({ name: role });

        if (!roleModel) {
            throw new Error('could not fetch the concerned role.');
        }

        let query = User.find({ roleId: roleModel._id, deletedAt: undefined });

        if ((roleModel.name === CUSTOMER) && smeOwnerStatus) {
            query = query.where('smeOwnerStatus').equals(smeOwnerStatus);
        }

        const users = await query.exec();

        if (users) {
            return users;
        }

        next('Something went wrong. Please, try again.');
    }

    async fetch1(req: Request, res: Response, next: NextFunction) {
        const user: IUser | null = await User.findOne({ _id: req.params.id });

        if (user) {
            res.status(200).send({
                ...(await user.getFields())
            });

            return;
        }

        next("Something went wrong. Please, try again.");
    }

    async update1(req: Request, res: Response, next: NextFunction) {
        const fields = [
            "specialRole",
            "about",
            "imgSrc",
            "firstName",
            "lastName",
            "specialRole",
            "email",
            "phone",
            "password",
            "otherName",
            "nickName",
            "preferredName",
            "dateOfBirth",
            "gender",
            "mobile",
            "status",
            "smeOwnerStatus",
            "usesEmail2FA",
            "usesAuthenticator2FA"
        ];

        const user = await User.findOne({ _id: req.params.id }, "-password");
        const controller = new UsersController();

        let data: any = {};
        let needsUpdate = true;

        for (const field of fields) {
            if ((req.body[field] !== undefined) && (req.body[field] !== "")) {

                switch (field) {
                    case "password":
                        if (user) {
                            user.updatePassword(req.body.password);
                            await user.save();

                            needsUpdate = false;
                        }
                        break;
                    case "imgSrc":
                        if (user?.imgSrc) {
                            unlink(`${getBaseDirPath()}/public${user.imgSrc}`, (err: any) => {
                                if (err) {
                                    console.log(err);
                                    next("Could not discard the old profile picture.");
                                    return;
                                }
                            });
                        }


                        needsUpdate = true;
                        data = {
                            ...data,
                            [field]: (controller.userFieldIsBoolean(field)) ? (req.body[field] as boolean) : req.body[field]
                        }

                        break;
                    case "usesEmail2FA":
                        await AuthToken.findOneAndUpdate({ value: extractAuthToken(req) ?? "" }, { email2FADone: true });

                        needsUpdate = true;
                        data = {
                            ...data,
                            [field]: (controller.userFieldIsBoolean(field)) ? (req.body[field] as boolean) : req.body[field]
                        }
                        break;
                    case "usesAuthenticator2FA":
                        await AuthToken.findOneAndUpdate({ value: extractAuthToken(req) ?? "" }, { authenticator2FADone: true });

                        needsUpdate = true;
                        data = {
                            ...data,
                            [field]: (controller.userFieldIsBoolean(field)) ? (req.body[field] as boolean) : req.body[field]
                        }
                        break;
                    default:
                        needsUpdate = true;
                        data = {
                            ...data,
                            [field]: (controller.userFieldIsBoolean(field)) ? (req.body[field] as boolean) : req.body[field]
                        }
                        break;
                }
            }
        }

        let emailUpdated = false;
        let statusUpdated = false;

        console.log(req.body);

        try {
            if (needsUpdate) {
                if (await User.findOneAndUpdate({ _id: req.params.id }, data)) {

                    const controller = new UsersController();

                    //There are some special fields: when these fields change, some other changes accompany.
                    //handle the other changes for thos spepcial fields.

                    //email is a special field
                    if (data?.email !== undefined) {
                        await controller.handleEmailUpdate4User(req.params.id);
                        emailUpdated = true;
                    }

                    //status is special field
                    if (data?.status !== undefined) {
                        await controller.handleUserStatusUpdate4User(req.params.id);
                        statusUpdated = true;
                    }

                }

                needsUpdate = false;
            }
        } catch (err) {
            next(err);
            return;
        }

        if (!needsUpdate) {     //all updates have been performed
            const user = await User.findOne({ _id: req.params.id }, "-password");

            if (user) {
                res.status(200).send({
                    msg: "Success",
                    emailUpdated,
                    statusUpdated
                });
                return;
            }
        }

        next("Something went wrong. Please, try again.");
    }

    /**
 * Toggle activity activity status for one
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
    async toggleActiviStatus41(req: Request, res: Response, next: NextFunction) {
        const userId = req.params.id;

        if (userId) {
            const user = await User.findOne({ _id: userId });

            if (user) {
                user.status = (user.status === ACTIVE) ? DISABLED : ACTIVE;

                if (await user.save()) {
                    res.status(200).send({
                        msg: `User's status successfully updated.`
                    });
                    return;
                }
            }
        }

        next('Something went wrong. Please, try again.');
    }

    /**
* Toggle activity SME owner status for one
* @param {*} req 
* @param {*} res 
* @param {*} next 
*/
    async toggleSmeOwnerStatus41(req: Request, res: Response, next: NextFunction) {
        const userId = req.params.id;

        if (userId) {
            const user = await User.findOne({ _id: userId });

            if (user) {

                user.smeOwnerStatus = (user.smeOwnerStatus === SME_OWNER_VERIFIED) ? SME_OWNER_UNVERIFIED : SME_OWNER_VERIFIED;

                if (await user.save()) {
                    res.status(200).send({
                        msg: `SME owner status successfully updated.`
                    });
                    return;
                }
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async delete1(req: Request, res: Response, next: NextFunction) {
        const user = await User.findOne({ _id: req.params.id });
        try {
            if (user) {

                const validEmail = user.email;

                user.email = generateRandStr(5) + 'deleted' + user.email;       //this way, the present gmail can be re-registered
                user.phone = generateRandStr(5) + 'deleted' + (new Date()).getTime().toString()
                user.mobile = generateRandStr(5) + 'deleted' + (new Date()).getTime().toString()
                user.status = DISABLED;
                user.deletedAt = (new Date()).getTime();

                await user.save();

                const emailData = {
                    firstName: properlizeWords(user.firstName),
                };

                try {
                    await emailsController.tryEmail("userDeletion", validEmail, "Account Deleted", emailData);

                    res.status(200).send("Successful");
                    return;
                } catch (err) {
                    console.log(`Error: ${err}`);
                    res.status(200);
                    next("User Deleted, but could not be mailed a notice.");
                }
            }
        } catch (err) {
            console.log(err);
        }

        next("Something went wrong. Please, try again later.");
    }
}

const usersController = new UsersController();

export default usersController;
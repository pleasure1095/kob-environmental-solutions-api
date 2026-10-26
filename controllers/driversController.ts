import { NextFunction, Request, Response } from "express";
import { unlink } from "fs";
import { AWAITING_DELIVERY, AWAITING_RETRIEVAL, DRIVER } from "../config/constants";
import AuthToken from "../db/models/AuthToken";
import RentalPackage from "../db/models/RentalPackage";
import User, { IUser } from "../db/models/users/User";
import { extractAuthToken, getBaseDirPath } from "../helpers";
import usersController from "./usersController";

const bcrypt = require('bcryptjs');

class DriversController {

    async register1(req: Request, res: Response, next: NextFunction) {
        try {
            if (await usersController.register1(req, next, DRIVER)) {
                res.status(200).send({
                    msg: 'Registeration successful. Verification mail has been sent to the registered email.'
                });
                return;
            }
        } catch (err) {
            console.log('Err: ', err);
            next('Registeration successful, but could not send verification mail. Try logging in.');
        }

    }

    async fetchAll(req: Request, res: Response, next: NextFunction) {
        const users = await usersController.fetchAll(req, next, DRIVER);

        if (users) {

            let drivers = [];
            let itr = 0;

            for (let user of users) {
                const pendingDeliveries = await RentalPackage.find({ deliveryDriverId: user._id, status: AWAITING_DELIVERY });
                const pendingPickUps = await RentalPackage.find({ retrievalDriverId: user._id }).or([{ status: AWAITING_DELIVERY }, { status: AWAITING_RETRIEVAL }]).exec();

                drivers[itr++] = {
                    ...user.getFields(),
                    ordersCount: pendingDeliveries.length,
                    pickUpsCount: pendingPickUps.length,
                }
            }

            res.status(200).send({ drivers });
            return;
        }

    }

    async fetch1(req: Request, res: Response, next: NextFunction) {
        const driver: IUser | null = await User.findOne({ _id: req.params.id });

        if (driver) {

            const pendingDeliveries = await RentalPackage.find({ deliveryDriverId: driver._id, status: AWAITING_DELIVERY });
            const pendingPickUps = await RentalPackage.find({ retrievalDriverId: driver._id, status: AWAITING_RETRIEVAL });

            res.status(200).send({
                ...(await driver.getFields()),
                ordersCount: pendingDeliveries.length,
                pickUpsCount: pendingPickUps.length,
            });

            return;
        }

        next("Something went wrong. Please, try again.");
    }

    async update1(req: Request, res: Response, next: NextFunction) {
        const fields = [
            "imgSrc",
            "firstName",
            "lastName",
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
            "usesEmail2FA",
            "usesAuthenticator2FA"
        ];

        const user = await User.findOne({ _id: req.params.id }, "-password");
        const controller = usersController;

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

        try {
            if (needsUpdate) {
                if (await User.findOneAndUpdate({ _id: req.params.id }, data)) {

                    const controller = usersController;

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

        next('Something went wrong. Please, try again.');
    }
}

const driversController = new DriversController();

export default driversController;
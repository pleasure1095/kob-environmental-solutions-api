import { NextFunction, Request, Response } from "express";
import { unlink } from "fs";
import { ASC, COMPLETED, STAFF, UNAPPROVED } from "../config/constants";
import AuthToken from "../db/models/AuthToken";
import Order from "../db/models/Order";
import Role, { IRole } from "../db/models/Role";
import User, { IUser } from "../db/models/users/User";
import { extractAuthToken, getBaseDirPath } from "../helpers";
import usersController from "./usersController";

const bcrypt = require('bcryptjs');

class StaffsController {
    async register1(req: Request, res: Response, next: NextFunction) {
        try {
            if (await usersController.register1(req, next, STAFF)) {
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

        const users = await usersController.fetchAll(req, next, STAFF);

        if (users) {

            let staffs = [];
            let itr = 0;


            for (let user of users) {
                const orders = await Order.find({ staffId: user._id });
                const orderRequests = await Order.find({ staffId: user._id, status: UNAPPROVED });
                const pendingOrders = await Order.find({ staffId: user._id }).nor([{ status: COMPLETED }]).exec();


                staffs[itr++] = {
                    ...(await user.getFields()),
                    ordersCount: orders.length,
                    orderRequestsCount: orderRequests.length,
                    pendingOrdersCount: pendingOrders.length,
                }
            }

            res.status(200).send({ staffs });
            return;
        }

        next('something went wrong. Please, try again.');

    }

    async getStaffsPlusTasksCounts() {

        const roleModel: IRole | null = await Role.findOne({ name: STAFF });

        if (!roleModel) {
            throw new Error('could not fetch the concerned role.');
        }


        const staffs = await User.find({ roleId: roleModel._id });
        let arr = [];

        if (staffs) {
            for (let i = 0; i < staffs.length; i++) {
                const orders = await Order.find({ staffId: staffs[i]._id });
                const orderRequests = await Order.find({ staffId: staffs[i]._id, status: UNAPPROVED });
                const pendingOrders = await Order.find({ staffId: staffs[i]._id }).nor([{ status: COMPLETED }]).exec();

                const pendingTasksCount = (pendingOrders?.length ?? 0);

                arr[i] = {
                    ...staffs[i].getFields(),
                    ordersCount: orders?.length ?? 0,
                    orderRequestsCount: orderRequests?.length ?? 0,
                    pendingOrdersCount: pendingOrders?.length ?? 0,
                    pendingTasksCount
                }
            }

        }

        return arr;
    }

    orderStaffsBy(staffs: any, field: any, dir: string = ASC) {
        if (staffs?.length) {
            let arr = [...staffs];
            const newStaffs = arr.sort((a, b) => (dir === ASC) ? (a[field] - b[field]) : (b[field] - a[field]));
            return newStaffs;
        }

        return [];
    }

    async getSortedStaffs(sortedField: any, dir: string = ASC) {
        const controller = new StaffsController();

        const staffs = await controller.getStaffsPlusTasksCounts();


        return controller.orderStaffsBy(staffs, sortedField, dir);
    }

    async fetch1(req: Request, res: Response, next: NextFunction) {

        const user: IUser | null = await User.findOne({ _id: req.params.id });

        if (user) {
            const orders = await Order.find({ staffId: user._id });
            const orderRequests = await Order.find({ staffId: user._id, status: UNAPPROVED });
            const pendingOrders = await Order.find({ staffId: user._id }).nor([{ status: COMPLETED }]).exec();

            res.status(200).send({
                ...(await user.getFields()),
                ordersCount: orders?.length ?? 0,
                orderRequestsCount: orderRequests?.length ?? 0,
                pendingOrdersCount: pendingOrders?.length ?? 0,
            })
            return;
        }

        next('Something went wrong. Please, try again.');
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

        console.log(req.body);

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

    /**
     * Fetch Orders for 1 Staff
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    async fetchOrders41(req: Request, res: Response, next: NextFunction) {
        const staffId = req.params.id;
        const ordersStatus = req?.query?.status ?? null;

        let query = Order.find({ staffId });


        if (ordersStatus) {
            query = query.where('status').equals(ordersStatus);
        }

        const orders = await query.exec();

        if (orders) {

            let completeOrders = [];
            let itr = 0;

            for (const order of orders) {
                completeOrders[itr++] = await order.getFields();
            }

            res.status(200).send(completeOrders);
            return;
        }


        next("Something went wrong. Please, try again.")
    }
}

const staffsController = new StaffsController();

export default staffsController;
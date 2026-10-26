import { NextFunction, Request, Response } from "express";
import Notification, { INotification } from "../db/models/notifications/Notification";
import User from "../db/models/users/User";
import authController from "./authController";

class NotificationsController {

    async fetch(req: Request, res: Response, next: NextFunction) {
        const user = await authController.getAuthUser(req);

        if (!user) {
            throw new Error('Could not fetch the user');
        }

        let query = Notification.find();

        query = query.or([{ targetUserId: user._id }]);

        query = query.or([{ targetRole: (await user.getFields()).role.name }]);

        const notifications: any[] = await query.sort({ createdAt: -1 }).exec();

        let notificationsArr = [];
        let itr = 0;

        for (const notification of notifications) {
            let show = true;

            for (const userId of notification.hideFrom) {
                if (user._id === userId) {
                    show = false;
                    break;
                }
            }

            if (show) {
                notificationsArr[itr++] = notification.getFields();
            }
        }

        if (notifications) {
            res.status(200).send(notificationsArr);
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async delete1(req: Request, res: Response, next: NextFunction) {
        const notification: INotification | null = await Notification.findOne({ _id: req.params.id });

        if (notification) {
            let viewersCount = (await User.find({ role: notification.targetRole }).or([{ _id: notification.targetUserId ?? '' }])).length;

            if (viewersCount >= (notification?.hideFrom ? notification.hideFrom.length : 0)) {
                await notification.deleteOne();
                res.status(200).send({ msg: 'success' });
                return;
            }

            const user = await authController.getAuthUser(req);

            if (!user) {
                throw new Error('Could not fetch the user');
            }

            let shouldAddToHideFrom = true;

            if (notification?.hideFrom) {
                for (const exemptedId of notification.hideFrom) {
                    if (user._id === exemptedId) {
                        shouldAddToHideFrom = false;
                        break;
                    }
                }
            }

            if (shouldAddToHideFrom) {
                if (!notification?.hideFrom) {
                    notification.hideFrom = [];
                }

                notification.hideFrom[notification.hideFrom.length] = user._id;
            }

            if (await notification.save()) {
                res.status(200).send({ msg: 'success' });
                return;
            }

        }

        next('Something wen wrong. Please, try again.')
    }
}

const notificationsController = new NotificationsController();

export default notificationsController;
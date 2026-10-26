import { NextFunction, Request, Response } from "express";
import { ARTICLE, COURSE, CUSTOMER, RECOREDED_WORKSHOP, SME_EVENT, STAFF } from "../config/constants";
import RentalItem from "../db/models/RentalItem";
import Role from "../db/models/Role";
import User from "../db/models/users/User";

class StatsController {     //statistics controller

    private async getCustomersStats() {
        let stats = {
            total: 0,
            unverified: 0,
            verified: 0
        }

        const role = await Role.findOne({ name: CUSTOMER });

        if (role) {

            const totalCustomers = await User.find({ roleId: role._id.toString(), deletedAt: undefined });

            if (totalCustomers) {
                stats = {
                    ...stats,
                    total: totalCustomers.length
                }
            }

            const unVerifiedustomers = await User.find({ roleId: role._id.toString(), emailVerifiedAt: undefined, deletedAt: undefined });

            if (unVerifiedustomers) {
                stats = {
                    ...stats,
                    unverified: unVerifiedustomers.length
                }
            }

            if (totalCustomers && unVerifiedustomers) {
                stats = {
                    ...stats,
                    verified: totalCustomers.length - unVerifiedustomers.length
                }
            }
        }

        return stats;
    }

    private async getWorkersStats(roleName: string) {
        let stats = {
            total: 0,
            unverified: 0,
            verified: 0
        }

        const role = await Role.findOne({ name: roleName });

        if (role) {

            const totalUsers = await User.find({ roleId: role._id.toString(), deletedAt: undefined });

            if (totalUsers) {
                stats = {
                    ...stats,
                    total: totalUsers.length
                }
            }

            const unVerifiedUsers = await User.find({ roleId: role._id.toString(), emailVerifiedAt: undefined, deletedAt: undefined });

            if (unVerifiedUsers) {
                stats = {
                    ...stats,
                    unverified: unVerifiedUsers.length
                }
            }

            if (totalUsers && unVerifiedUsers) {
                stats = {
                    ...stats,
                    verified: totalUsers.length - unVerifiedUsers.length
                }
            }
        }

        return stats;
    }

    private async getRentalItemsStats(itemType: string) {
        let stats = {
            total: 0
        }

        const rentalItems = await RentalItem.find({ type: itemType, deletedAt: undefined });

        if (rentalItems) {
            stats = {
                ...stats,
                total: rentalItems.length
            }
        }

        return stats;
    }

    async fetchGeneralStats(req: Request, res: Response, next: NextFunction) {

        const controller = new StatsController();

        try {
            const stats = {
                members: await controller.getCustomersStats(),
                tutors: await controller.getWorkersStats(STAFF),
                courses: await controller.getRentalItemsStats(COURSE),
                articles: await controller.getRentalItemsStats(ARTICLE),
                recordedWorkshops: await controller.getRentalItemsStats(RECOREDED_WORKSHOP),
                events: await controller.getRentalItemsStats(SME_EVENT)
            }
            res.status(200).send(stats);
            return;
        } catch (err) {

        }

        next('Something went wrong. Please, try again.');
    }

}

const statsController = new StatsController;

export default statsController;
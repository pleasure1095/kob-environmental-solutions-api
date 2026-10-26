import { NextFunction, Request, Response } from "express";
import { RECOREDED_WORKSHOP } from "../config/constants";
import RentalItem from "../db/models/RentalItem";
import RentalPackage from "../db/models/RentalPackage";
import ServiceResource from "../db/models/ServiceResource";
import User from "../db/models/users/User";
import authController from "./authController";

class RentalItemsController {

    async register1(req: Request, res: Response, next: NextFunction) {
        const input = {
            name: req.body.name,
            type: req.body?.type ?? undefined,
            description: req.body.description,
            virtualLink: (req?.body?.virtualLink && (req?.body?.virtualLink! == '')) ? req?.body?.virtualLink : undefined,
            activationDate: req.body?.activationDate ?? undefined,
            deactivationDate: req.body?.deactivationDate ?? undefined,
            staffId: req.body.staffId,
            imgSrc: (req.body?.rentalItemImg && (req.body?.rentalItemImg !== '')) ? req.body?.rentalItemImg : undefined,
            count: req.body.count,
            pricePerDay: req.body.pricePerDay
        };

        const rentalItem = await RentalItem.create(input);

        if (rentalItem) {

            let serviceResourceId: string | null = null;

            if (rentalItem.type === RECOREDED_WORKSHOP) {
                const section = await ServiceResource.create({ unitPrice: '1', name: `${rentalItem.name} section ${(new Date()).getTime()}`, rentalItemId: rentalItem._id.toString() });
                if (section) {
                    serviceResourceId = section._id.toString();
                }
            }

            res.status(200).send({
                ...(await rentalItem.getFields()),
                serviceResourceId: serviceResourceId ?? undefined
            });
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async fetchAll(req: Request, res: Response, next: NextFunction) {

        let query = RentalItem.find({ deletedAt: undefined });

        if (req.query?.type) {
            query = query.where('type').equals(req.query.type as string);
        }

        const rawItems = await query.exec();

        if (rawItems) {
            let rentalItems = [];
            let itr = 0;

            for (const item of rawItems) {

                const staff = await User.findOne({ _id: item?.staffId ?? '' });

                const rentalPackages = await RentalPackage.find({ 'rentalItems._id': item._id.toString() });

                rentalItems[itr++] = {
                    ...(await item.getFields()),
                    staff: staff ? (await staff.getFields()) : undefined,
                    rentalPackagesCount: rentalPackages?.length ?? 0
                }
            }

            res.status(200).send(rentalItems);
            return;
        }

        next('Something went wrong. Please, try again.')
    }

    async update1(req: Request, res: Response, next: NextFunction) {
        const id = req.params.id;
        const data = req.body;

        const fields = ['name', 'description', 'virtualLink', 'activationDate', 'deactivationDate', 'staffId', 'imgSrc', 'count', 'pricePerDay'];

        if (id) {
            let input: any = {};

            for (const field of fields) {
                if (data[field]) {
                    input[field] = data[field];
                }
            }

            if (req.body?.rentalItemImg !== '') {
                input.imgSrc = req.body.rentalItemImg;
            }

            const rentalItem = await RentalItem.findOneAndUpdate({ _id: id }, input);
            const newItem = await RentalItem.findOne({ _id: id });

            if (rentalItem && newItem) {
                res.status(200).send(await newItem.getFields());
                return;
            }
        }

        next('Something went wrong. Please, try again.')
    }

    async toggleLike4One(req: Request, res: Response, next: NextFunction) {
        const id = req.params.id;
        const authUser = await authController.getAuthUser(req);

        if (authUser) {
            let wasLiked = false;

            let newFavouriteRentalItemsIds: string[] = [];

            if (authUser?.favouriteRentalItemsIds) {
                for (const favItemId of authUser?.favouriteRentalItemsIds) {
                    if (favItemId === id) {
                        wasLiked = true;
                        continue;
                    }

                    newFavouriteRentalItemsIds = [...newFavouriteRentalItemsIds, favItemId];
                }

                await User.findOneAndUpdate({ _id: authUser._id.toString() }, { favouriteRentalItemsIds: newFavouriteRentalItemsIds });

            }

            if (!wasLiked) {
                let newFavouriteRentalItemsIds: string[] = [...(authUser?.favouriteRentalItemsIds ?? []), id];


                await User.findOneAndUpdate({ _id: authUser._id.toString() }, { favouriteRentalItemsIds: newFavouriteRentalItemsIds });
            }


            return await authController.fetchAuthUser(req, res, next);

        }

        next("Something went wrong. Please, try again.");
    }

    async export(req: Request, res: Response, next: NextFunction) {

        const items = await RentalItem.find();
        let data: any = [];

        if (items) {
            for (const item of items) {
                data = [...data, await item.getFields4Export()];
            }

            res.status(200).send(data);
            return;
        }

        next("Something went wrong. Please, try again.");
    }

    async delete1(req: Request, res: Response, next: NextFunction) {

        const rentalItem = await RentalItem.findOne({ _id: req.params.id as string });

        if (rentalItem) {
            rentalItem.name = rentalItem.name + 'deleted@' + (new Date()).getTime().toString();
            rentalItem.deletedAt = (new Date()).getTime();

            await rentalItem.save();

            res.status(200).send({
                msg: 'success'
            });
            return;
        }

        next('something went wrong. Please, try again.');

    }
}

const rentalItemsController = new RentalItemsController();

export default rentalItemsController;
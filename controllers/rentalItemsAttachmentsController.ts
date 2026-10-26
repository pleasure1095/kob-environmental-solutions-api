import { NextFunction, Request, Response } from "express";
import RentalItem from "../db/models/RentalItem";
import RentalItemAttachment, { IRentalItemAttachment } from "../db/models/RentalItemAttachment";
import User from "../db/models/users/User";
import authController from "./authController";

class RentalItemsAttachmentsController {

    async register1(req: Request, res: Response, next: NextFunction) {

        const user = await authController.getAuthUser(req);

        const input = {
            serviceResourceId: req.body.serviceResourceId,
            creatorId: user?._id?.toString() ?? "",
            name: req.body.name,
            // imgSrc: req.body?.imgSrc ?? undefined,
            videoSrc: req.body?.videoSrc ?? undefined,
        };

        const rentalItemAttachment = await RentalItemAttachment.create(input);

        if (rentalItemAttachment) {
            res.status(200).send({
                ...rentalItemAttachment.getFields()
            });
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async fetchAll(req: Request, res: Response, next: NextFunction) {

        const rawItemsAttachments = await RentalItemAttachment.find({ deletedAt: undefined });

        if (rawItemsAttachments) {
            let rentalItemsAttachments = [];
            let itr = 0;

            for (const item of rawItemsAttachments) {


                rentalItemsAttachments[itr++] = {
                    ...item.getFields(),
                }
            }

            res.status(200).send(rentalItemsAttachments);
            return;
        }

        next('Something went wrong. Please, try again.')
    }

    async update1(req: Request, res: Response, next: NextFunction) {
        const id = req.params.id;
        const data = req.body;

        const fields = ['name', 'videoSrc'];

        if (id) {
            let input: any = {};

            for (const field of fields) {
                if (data[field]) {
                    input[field] = data[field];
                }
            }

            const rentalItemAttachment = await RentalItemAttachment.findOneAndUpdate({ _id: id }, input);
            const newItemAttachment = await RentalItemAttachment.findOne({ _id: id });

            if (rentalItemAttachment && newItemAttachment) {
                res.status(200).send(newItemAttachment.getFields());
                return;
            }
        }

        next('Something went wrong. Please, try again.')
    }

    async deleteAttachment(attachment: IRentalItemAttachment) {
        attachment.name = attachment.name + 'deleted@' + (new Date()).getTime().toString();
        attachment.deletedAt = (new Date()).getTime();

        try {
            await attachment.save();
            return true;
        } catch (err) {
            return false;
        }
    }

    async delete1(req: Request, res: Response, next: NextFunction) {

        const attachment = await RentalItemAttachment.findOne({ _id: req.params.id as string });

        if (attachment) {
            attachment.name = attachment.name + 'deleted@' + (new Date()).getTime().toString();
            attachment.deletedAt = (new Date()).getTime();

            await attachment.save();

            res.status(200).send({
                msg: 'success'
            });
            return;
        }

        next('something went wrong. Please, try again.');

    }
}

const rentalItemsAttachmentsController = new RentalItemsAttachmentsController();

export default rentalItemsAttachmentsController;
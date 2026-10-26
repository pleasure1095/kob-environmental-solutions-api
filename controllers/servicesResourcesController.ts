import { NextFunction, Request, Response } from "express";
import { unlink } from "fs";
import ServiceResource from "../db/models/ServiceResource";
import Unit from "../db/models/Unit";
import { getBaseDirPath } from "../helpers";
import authController from "./authController";

class ServicesResourcesController {
    async mk1(req: Request, res: Response, next: NextFunction) {

        const user = await authController.getAuthUser(req);

        if (req?.body?.unit && !(await Unit.findOne({ name: req.body.unit }))) {
            await Unit.create({ name: req.body.unit, creatorUserId: user?._id?.toString() ?? undefined });
        }

        const data = {
            rentalItemId: req.body.rentalItemId,
            name: req.body.name,
            content: req.body?.content ?? undefined,
            imgSrc: req.body?.imgSrc ?? undefined,
            unit: req.body?.unit ?? undefined,
            unitPrice: req.body.unitPrice,
            quantityLeft: req.body.quantityLeft
        }

        const resource = await ServiceResource.create(data);

        if (resource) {
            res.status(200).send(resource.getFields());
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async fetchAll(req: Request, res: Response, next: NextFunction) {
        let data = [];

        const resources = await ServiceResource.find({ deletedAt: undefined }).sort({ createdAt: -1 }).exec();

        if (resources) {
            for (let i = 0; i < resources.length; i++) {
                data[i] = resources[i].getFields();
            }

            res.status(200).send(data);
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async update1(req: Request, res: Response, next: NextFunction) {
        const fields = ['name', 'content', 'imgSrc', 'unit', 'unitPrice', 'quantityLeft'];

        const resource: any = await ServiceResource.findOne({ _id: req.params.id });

        const user = await authController.getAuthUser(req);

        if (req?.body?.unit && !(await Unit.findOne({ name: req.body.unit }))) {
            await Unit.create({ name: req.body.unit, creatorUserId: user?._id?.toString() ?? undefined });
        }


        if (resource) {
            for (const field of fields) {
                if (typeof req.body[field] !== typeof undefined) {

                    if (field === 'imgSrc') {
                        unlink(`${getBaseDirPath()}/public${resource.imgSrc}`, err => {
                            if (err) {
                                console.log(`in ServicesResourcesController::update1: could not delete old image: ${err}`)
                            } else {
                                console.log(`in ServicesResourcesController::update1: deleted old image.`)
                            }
                        })
                    }

                    resource[field] = req.body[field];
                }
            }
        }


        if (await resource.save()) {
            res.status(200).send(resource.getFields());
            return;
        }

        next('Something went wrong. Please, try again.');

    }

    async delete1(req: Request, res: Response, next: NextFunction) {

        const serviceResource = await ServiceResource.findOne({ _id: req.params.id as string });

        if (serviceResource) {
            serviceResource.name = serviceResource.name + 'deleted@' + (new Date()).getTime().toString();
            serviceResource.deletedAt = (new Date()).getTime();

            await serviceResource.save();

            res.status(200).send({
                msg: 'success'
            });
            return;
        }

        next('something went wrong. Please, try again.');

    }
}

const servicesResourcesController = new ServicesResourcesController();

export default servicesResourcesController;
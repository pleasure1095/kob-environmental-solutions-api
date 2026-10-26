import { NextFunction, Request, Response } from "express";

const Service = require("../db/models/Service");

class ServicesController {
    async mk1(req: Request, res: Response, next: NextFunction) {

        const data = {
            name: req.body.name,
            serviceResourceId: (req.body?.serviceResourceId && (req.body?.serviceResourceId !== "")) ? req.body?.serviceResourceId : undefined,
            cost: (req.body?.cost && (req.body?.cost !== '')) ? req.body?.cost : 0,
            driverCanSee: req.body.driverCanSee
        }

        const service = await Service.create(data);

        if (service) {
            res.status(200).send(await service.getFields());
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async fetchAll(req: Request, res: Response, next: NextFunction) {
        let data = [];

        const services = await Service.find().sort({ createdAt: -1 }).exec();

        if (services) {
            for (let i = 0; i < services.length; i++) {
                data[i] = await services[i].getFields();
            }

            res.status(200).send(data);
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async update1(req: Request, res: Response, next: NextFunction) {
        const fields = ['name', 'serviceResourceId', 'cost'];

        const service = await Service.findOne({ _id: req.params.id });

        if (service) {
            for (const field of fields) {

                if (typeof req.body[field] !== undefined) {
                    if (field === 'serviceResourceId' && req.body[field] === "") {
                        continue;
                    }

                    service[field] = req.body[field];

                }
            }

            if (await service.save()) {
                res.status(200).send(await service.getFields());
                return;
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async rmvResourceFrom1(req: Request, res: Response, next: NextFunction) {
        const service = await Service.findOne({ _id: req.params.id });

        if (service) {
            service.serviceResourceId = undefined;

            if (await service.save()) {
                res.status(200).send(await service.getFields());
                return;
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async export(req: Request, res: Response, next: NextFunction) {
        const services = await Service.find();
        let data: any[] = [];

        if (services) {
            for (const service of services) {
                data = [...data, await service.getFields4Export()];
            }

            res.status(200).send(data);
            return;
        }


        next("Something went wrong. Please, try again.");

    }
}

const servicesController = new ServicesController();

export default servicesController;
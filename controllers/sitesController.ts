import { NextFunction, Request, Response } from "express";
import { COMPANY, CUSTOMER } from "../config/constants";
import Site from "../db/models/Site";
import Customer from "../db/models/users/Customer";

class SitesController {
    async reg1(req: Request, res: Response, next: NextFunction) {
        const data = {
            ownerType: req.body.ownerType,
            ownerId: req.body.ownerId,
            name: req.body.name,
            address: req.body.address,
            googleMapURL: req.body?.googleMapURL ?? undefined
        };

        const site = await Site.create(data);

        if (site) {
            res.status(200).send(site.getFields());
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async fetch(req: Request, res: Response, next: NextFunction) {
        let query = Site.find();

        if (req.query?.ownerType && req.query?.ownerId) {
            switch (req.query.ownerType) {
                case COMPANY:
                    query = query.where('ownerType').equals(req.query.ownerType);
                    query = query.where('ownerId').equals(req.query.ownerId);
                    break;
                case CUSTOMER:
                    const customer = await Customer.findOne({ _id: req.query.ownerId });
                    if (customer?.companyId) {
                        query = query.or([{ ownerId: customer._id }, { ownerId: customer.companyId }]);
                    } else {
                        query = query.where('ownerType').equals(req.query.ownerType);
                        query = query.where('ownerId').equals(req.query.ownerId);
                    }
                default:
                    break;
            }
        }

        const sites = await query.sort({ createdAt: -1 }).exec();

        if (sites) {
            let data = [];
            let itr = 0;
            for (const site of sites) {
                data[itr++] = site.getFields();
            }

            res.status(200).send(data);
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async Update1(req: Request, res: Response, next: NextFunction) {
        const fields = ['name', 'address', 'googleMapURL'];
        let data = {};

        for (const field of fields) {
            if (req.body[field]) {
                data = {
                    ...data,
                    [field]: req.body[field]
                }
            }
        }

        if (await Site.findOneAndUpdate({ _id: req.params.id }, data)) {
            const site = await Site.findOne({ _id: req.params.id });

            if (site) {
                res.status(200).send(site.getFields());
                return;
            }
        }


        next('Something went wrong. Please, try again.');
    }
}

const sitesController = new SitesController();

export default sitesController;
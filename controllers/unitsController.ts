import { NextFunction, Request, Response } from "express";
import Unit from "../db/models/Unit";
import authController from "./authController";


class UnitsController {

    async mk1(req: Request, res: Response, next: NextFunction) {

        const user = await authController.getAuthUser(req);

        const data = {
            name: req.body.name,
            creatorUserId: user?._id?.toString() ?? undefined
        }

        const unit = await Unit.create(data);

        if (unit) {
            res.status(200).send(unit.getFields());
            return;
        }

        next("Something went wrong. Please, try again.");
    }

    async asyncUpdate1(req: Request, res: Response, next: NextFunction) {
        const fields = ["name"];

        let data = {};
        let update = false;

        for (const field of fields) {
            if (req?.body[field] && (req.body[field] !== "")) {
                update = true;
                data = {
                    ...data,
                    [field]: req.body[field]
                }
            }
        }

        if (update && (await Unit.findOneAndUpdate({ _id: req.params.id }, data))) {
            const unit = await Unit.findOne({ _id: req.params.id });

            if (unit) {
                res.status(200).send(unit.getFields);
            }
        }

        next("Something went wrong. Please, try again.");
    }

    async fetchAll(req: Request, res: Response, next: NextFunction) {
        const units = await Unit.find();

        let data: any[] = [];

        if (units) {
            for (const unit of units) {
                data = [
                    ...data,
                    unit.getFields()
                ];
            }

            res.status(200).send(data);
            return;
        }

        next("Something went wrong. Please, try again.");
    }



}

const unitsController = new UnitsController();

export default unitsController;
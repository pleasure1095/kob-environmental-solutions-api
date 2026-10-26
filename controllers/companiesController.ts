import { NextFunction, Request, Response } from "express";
import Company from "../db/models/Company";
import Customer from "../db/models/users/Customer";

class CompaniesConntroller {

    async reg1(req: Request, res: Response, next: NextFunction) {
        const data = {
            name: req.body.name,
            country: req.body.country,
            state: req.body.state,
            mainOfficeAddress: req.body?.mainOfficeAddress ?? undefined,
            phoneNumber: req.body.phoneNumber,
            faxNumber: (req.body?.faxNumber !== '') ? req.body.faxNumber : undefined,
            email: req.body.email,
            website: (req.body?.website !== '') ? req.body.website : undefined
        }

        const company = await Company.create(data);

        if (company) {
            res.status(200).send(company.getFields());
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async fetchAll(req: Request, res: Response, next: NextFunction) {
        const companies = await Company.find().sort({createdAt: -1}).exec();

        if (companies) {
            const data = [];
            let itr = 0;

            for (const company of companies) {
                const workers = await Customer.find({ companyId: company._id.toString() });

                data[itr++] = {
                    ...(await company.getFields4Enum()),
                    workersCount: workers?.length ?? 0
                }
            }

            res.status(200).send(data);
            return;
        }

        next('Something went wrong. Please, try again.');
    }

    async fetch1(req: Request, res: Response, next: NextFunction) {
        const company = await Company.findOne({ _id: req.params.id });

        if (company) {
            const workers = await Customer.find({ companyId: company._id.toString() });
            const workersData = [];

            if (workers) {

                let itr = 0;
                for (const worker of workers) {
                    workersData[itr++] = await worker.getFields4Enum();
                }
            }

            res.status(200).send({
                ...company.getFields(),
                workers: workersData
            });
            return;
        }

        next('Something wen wrong. Please, try again.');
    }

    async update1(req: Request, res: Response, next: NextFunction) {
        const fields = ['name', 'country', 'state', 'mainOfficeAddress', 'phoneNumber', 'faxNumber', 'email', 'website'];

        let data: any = {};

        for (const field of fields) {
            if (req.body[field] !== undefined) {
                data[field] = req.body[field];
            }
        }

        if (await Company.findOneAndUpdate({ _id: req.params.id }, data)) {

            const company = await Company.findOne({ _id: req.params.id });

            if (company) {
                res.status(200).send(company.getFields());
                return;
            }
        }

        next('Something went wrong. Please, try again.');
    }
}

const companiesController = new CompaniesConntroller();

export default companiesController;
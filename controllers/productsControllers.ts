import { NextFunction, Request, Response } from "express";
import Product, { IProduct } from "../db/models/Product";

class ProductsController {

    async mk1(req: Request, res: Response, next: NextFunction) {

        const product = await Product.create({
            name: req.body.name,
            imgSrc: req.body?.productImg ?? undefined,
            categoryId: req.body.Id,
            unit: req.body?.unit ?? undefined,
            unitPrice: req.body.unitPrice
        });

        if (product) {
            res.status(200).send(product.getFields());
            return;
        }

        next("Someting went wrong. Please, try again.");
    }

    async fetchAll(req: Request, res: Response, next: NextFunction) {

        try {

            const products = await Product.find();
            let data: any[] = [];

            if (products) {

            for(const product of products) {
                data = [
                    ...data,
                    (await product.getFields())
                ]
            }

        }

            res.status(200).send(data);
            return;
        } catch (err) {
            next('Something went wrong. Please, try again.');
        }

    }

    async update1(req: Request, res: Response, next: NextFunction) {

        const id = req.params.id;
        const data = req.body;

        const fields = ["name", "categoryId", "unit",  "unitPrice"];

        if (id) {
            let input: any = {};

            for (const field of fields) {
                if (data[field]) {
                    input[field] = data[field];
                }
            }

            if (req.body?.productImg !== '') {
                input.imgSrc = req.body.productImg;
            }

            const product = await Product.findOneAndUpdate({ _id: id }, input);
            const newItem = await Product.findOne({ _id: id });

            if (product && newItem) {
                res.status(200).send(newItem.getFields());
                return;
            }
        }

        next('Something went wrong. Please, try again.')
    }

    async delete1(req: Request, res: Response, next: NextFunction) {
        const product = await Product.findOne({ _id: req.params.id as string });

        if (product) {
            product.name = product.name + 'deleted@' + (new Date()).getTime().toString();
            product.deletedAt = (new Date()).getTime();

            await product.save();

            res.status(200).send({
                msg: 'success'
            });
            return;
        }

        next('something went wrong. Please, try again.');
    }
}

const productsController = new ProductsController();

export default productsController;
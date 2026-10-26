import { NextFunction, Request, Response } from "express";
import ProductCategory, { IProductCategory } from "../db/models/ProductCategory";

class ProductsCategoriesController {

    async mk1(req: Request, res: Response, next: NextFunction) {

        const productCategory = await ProductCategory.create({
            name: req.body.name,
            parentId: req.body?.parentId ?? undefined,
            imgSrc: req.body?.productCategoryImg ?? undefined
        });

        if (productCategory) {
            res.status(200).send(productCategory.getFields());
            return;
        }

        next("Someting went wrong. Please, try again.");
    }

    async getSubCategories(category: IProductCategory) {
        const subCategories = await ProductCategory.find({ parentId: category._id.toString(), deletedAt: undefined });

        let data: any[] = []

        if (subCategories && (subCategories.length > 0)) {

            const controller = new ProductsCategoriesController();

            for (const subCategory of subCategories) {

                const children = await controller.getSubCategories(subCategory);

                data = [
                    ...data,
                    {
                        ...(subCategory.getFields()),
                        children: (children.length > 0) ? children : undefined
                    }
                ];
            }
        }

        return data;
    }

    async getAll() {
        //get the base categories
        const baseCategories = await ProductCategory.find({ parentId: undefined, deletedAt: undefined });

        let data: any[] = [];

        if (baseCategories && (baseCategories.length > 0)) {

            const controller = new ProductsCategoriesController();

            for (const baseCategory of baseCategories) {

                const children = await controller.getSubCategories(baseCategory);

                data = [
                    ...data,
                    {
                        ...(baseCategory.getFields()),
                        children: (children.length > 0) ? children : undefined
                    }
                ]
            }
        }

        return data;
    }

    async fetchAll(req: Request, res: Response, next: NextFunction) {

        try {
            const controller = new ProductsCategoriesController();
            const data = await controller.getAll();

            res.status(200).send(data);
            return;
        } catch (err) {
            next('Something went wrong. Please, try again.');
        }

    }

    async update1(req: Request, res: Response, next: NextFunction) {

        const id = req.params.id;
        const data = req.body;

        const fields = ["name", "parentId"];

        if (id) {
            let input: any = {};

            for (const field of fields) {
                if (data[field]) {
                    input[field] = data[field];
                }
            }

            if (req.body?.productCategoryImg !== '') {
                input.imgSrc = req.body.productCategoryImg;
            }

            const productCategory = await ProductCategory.findOneAndUpdate({ _id: id }, input);
            const newItem = await ProductCategory.findOne({ _id: id });

            if (productCategory && newItem) {
                res.status(200).send(newItem.getFields());
                return;
            }
        }

        next('Something went wrong. Please, try again.')
    }

    async delete1(req: Request, res: Response, next: NextFunction) {
        const productCategory = await ProductCategory.findOne({ _id: req.params.id as string });

        if (productCategory) {
            productCategory.name = productCategory.name + 'deleted@' + (new Date()).getTime().toString();
            productCategory.deletedAt = (new Date()).getTime();

            await productCategory.save();

            res.status(200).send({
                msg: 'success'
            });
            return;
        }

        next('something went wrong. Please, try again.');
    }
}

const productsCategoriesController = new ProductsCategoriesController();

export default productsCategoriesController;
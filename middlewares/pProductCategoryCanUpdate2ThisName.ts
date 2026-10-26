import { NextFunction, Request, Response } from "express";
import ProductCategory from "../db/models/ProductCategory";

const pProductCategoryCanUpdate2ThisName = async (req: Request, res: Response, next: NextFunction) => {
    const productCategory = await ProductCategory.findOne({ _id: req.params.id });

    if (productCategory && req.body?.name === productCategory.name) {
        next();
        return;
    }


    if (req.body?.name) {
        const altProductCategory = await ProductCategory.findOne({ name: req.body.name });

        if (altProductCategory && altProductCategory._id !== req.params.id) {      //another productCategory already uses that name.
            res.status(400);
            res.send({
                errors: [
                    {
                        location: 'body',
                        msg: 'This name is already connected to another rental-item.',
                        path: 'name',
                        type: 'field',
                        value: '',
                    }
                ]
            });
            return;
        }
    }

    next();

}

export default pProductCategoryCanUpdate2ThisName;
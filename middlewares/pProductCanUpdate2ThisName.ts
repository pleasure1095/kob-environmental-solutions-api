import { NextFunction, Request, Response } from "express";
import Product from "../db/models/Product";

const pProductCanUpdate2ThisName = async (req: Request, res: Response, next: NextFunction) => {
    const product = await Product.findOne({ _id: req.params.id });

    if (product && req.body?.name === product.name) {
        next();
        return;
    }


    if (req.body?.name) {
        const altProduct = await Product.findOne({ name: req.body.name });

        if (altProduct && altProduct._id !== req.params.id) {      //another product already uses that name.
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

export default pProductCanUpdate2ThisName;
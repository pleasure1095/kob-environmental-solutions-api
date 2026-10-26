import { NextFunction, Request, Response } from "express";

const nameProductImg = (req: any, res: Response, next: NextFunction) => {

    if (req?.files?.productImg) {
        const productImg = req.files.productImg[0];

        req.body.productImg = `/images/products/${productImg.filename}`;
    }


    next();
}

export default nameProductImg;
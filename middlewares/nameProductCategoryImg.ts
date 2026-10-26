import { NextFunction, Request, Response } from "express";

const nameProductCategoryImg = (req: any, res: Response, next: NextFunction) => {

    if (req?.files?.productCategoryImg) {
        const productCategoryImg = req.files.productCategoryImg[0];

        req.body.productCategoryImg = `/images/productsCategories/${productCategoryImg.filename}`;
    }


    next();
}

export default nameProductCategoryImg;
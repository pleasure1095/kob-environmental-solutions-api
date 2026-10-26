import { NextFunction, Request, Response } from "express";
import { FILE_2_LARGE, FILE_OK, MAX_USER_IMG_SIZE } from "../config/constants";

const genProductCategoryImgErr = (req: any, res: Response, next: NextFunction) => {
    const files = req?.files ?? null;

    if (files && files?.productCategoryImg) {
        const productCategoryImg = files.productCategoryImg[0];

        if (productCategoryImg.size > MAX_USER_IMG_SIZE) {
            req.body.productCategoryImg = FILE_2_LARGE;
        } else {
            req.body.productCategoryImg = FILE_OK;
        }

    }

    next();
}

export default genProductCategoryImgErr;
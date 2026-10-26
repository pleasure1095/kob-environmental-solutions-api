import { NextFunction, Request, Response } from "express";
import { FILE_2_LARGE, FILE_OK, MAX_USER_IMG_SIZE } from "../config/constants";

const genProductImgErr = (req: any, res: Response, next: NextFunction) => {
    const files = req?.files ?? null;

    if (files && files?.productImg) {
        const productImg = files.productImg[0];

        if (productImg.size > MAX_USER_IMG_SIZE) {
            req.body.productImg = FILE_2_LARGE;
        } else {
            req.body.productImg = FILE_OK;
        }

    }

    next();
}

export default genProductImgErr;
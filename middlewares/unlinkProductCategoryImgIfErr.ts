import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { unlink } from "fs";
import { getBaseDirPath } from "../helpers";


const unlinkProductCategoryImgIfErr = (req: any, res: Response, next: NextFunction) => {
    const errs = validationResult(req);

    if (!errs.isEmpty()) {
        if (req?.files?.productCategoryImg) {
            const productCategoryImg = req.files.productCategoryImg[0];

            unlink(`${getBaseDirPath()}/public/images/productsCategories/${productCategoryImg.filename}`, (err: any) => {
                if (err) {
                    console.log(`could not remove product category image: ${err}.`);
                } else {
                    console.log('Deleted product category image.');
                }
            })
        }
    }

    next();
}

export default unlinkProductCategoryImgIfErr;
import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { unlink } from "fs";
import { getBaseDirPath } from "../helpers";


const unlinkProductImgIfErr = (req: any, res: Response, next: NextFunction) => {
    const errs = validationResult(req);

    if (!errs.isEmpty()) {
        if (req?.files?.productImg) {
            const productImg = req.files.productImg[0];

            unlink(`${getBaseDirPath()}/public/images/products/${productImg.filename}`, (err: any) => {
                if (err) {
                    console.log(`could not remove products-image: ${err}.`);
                } else {
                    console.log('Deleted products image.');
                }
            })
        }
    }

    next();
}

export default unlinkProductImgIfErr;
import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { unlink } from "fs";
import { getBaseDirPath } from "../helpers";


const unlinkRentalItemImgIfErr = (req: any, res: Response, next: NextFunction) => {
    const errs = validationResult(req);

    if (!errs.isEmpty()) {
        if (req?.files?.rentalItemImg) {
            const rentalItemImg = req.files.rentalItemImg[0];

            unlink(`${getBaseDirPath()}/public/images/rentalItems/${rentalItemImg.filename}`, (err: any) => {
                if (err) {
                    console.log(`could not remove rental-item-image: ${err}.`);
                } else {
                    console.log('Deleted rental-item image.');
                }
            })
        }
    }

    next();
}

export default unlinkRentalItemImgIfErr;
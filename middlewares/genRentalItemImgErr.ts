import { NextFunction, Request, Response } from "express";
import { FILE_2_LARGE, FILE_OK, MAX_USER_IMG_SIZE } from "../config/constants";

const genRentalItemImgErr = (req: any, res: Response, next: NextFunction) => {
    const files = req?.files ?? null;

    if (files && files?.rentalItemImg) {
        const rentalItemImg = files.rentalItemImg[0];

        if (rentalItemImg.size > MAX_USER_IMG_SIZE) {
            req.body.rentalItemImg = FILE_2_LARGE;
        } else {
            req.body.rentalItemImg = FILE_OK;
        }

    }

    next();
}

export default genRentalItemImgErr;
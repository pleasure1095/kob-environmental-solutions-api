import { NextFunction, Response } from "express";
import { FILE_2_LARGE, FILE_OK, MAX_USER_IMG_SIZE } from "../config/constants";

const genServiceResourceImgErr = (req: any, res: Response, next: NextFunction) => {
    const files = req?.files ?? null;

    if (files && files?.resourceImg) {
        const resourceImg = files.resourceImg[0];

        if (resourceImg.size > MAX_USER_IMG_SIZE) {
            req.body.resourceImg = FILE_2_LARGE;
        } else {
            req.body.resourceImg = FILE_OK;
        }

    }

    next();
}

export default genServiceResourceImgErr;
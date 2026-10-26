import { NextFunction, Request, Response } from "express";
import { FILE_2_LARGE, FILE_OK, MAX_USER_IMG_SIZE } from "../config/constants";

const genUsrImgErr = (req: any, res: Response, next: NextFunction) => {

    const files = req?.files ?? null;

    if (files && files?.usrImg) {
        const usrImg = files.usrImg[0];

        if (usrImg.size > MAX_USER_IMG_SIZE) {
            req.body.usrImg = FILE_2_LARGE;
        } else {
            req.body.usrImg = FILE_OK;
        }

    }

    next();
}

export default genUsrImgErr;
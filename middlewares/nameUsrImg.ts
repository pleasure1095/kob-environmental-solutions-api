import { NextFunction, Response } from "express";

const nameUsrImg = (req: any, res: Response, next: NextFunction) => {

    if (req?.files?.usrImg) {
        const usrImg = req.files.usrImg[0];

        req.body.imgSrc = `/images/users/${usrImg.filename}`;
    }

    next();
}

export default nameUsrImg;
import { NextFunction, Response } from "express";

const { validationResult } = require("express-validator");
const { getBaseDirPath } = require("../helpers");
const { unlink } = require('fs')

const unlinkUsrImgIfErr = (req: any, res: Response, next: NextFunction) => {
    const errs = validationResult(req);

    if (!errs.isEmpty()) {
        if (req?.files?.usrImg) {
            const usrImg = req.files.usrImg[0];

            unlink(`${getBaseDirPath()}/public/images/users/${usrImg.filename}`, (err: any) => {
                if (err) {
                    console.log(`could not remove user-image: ${err}`);
                } else {
                    console.log('Deleted user image');
                }
            })
        }
    }

    next();
}

export default unlinkUsrImgIfErr;
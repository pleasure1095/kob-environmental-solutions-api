import { NextFunction, Response } from "express";
import { validationResult } from "express-validator";
import { unlink } from "fs";
import { getBaseDirPath } from "../helpers";

const unlinkServiceResourceImgIfErr = (req: any, res: Response, next: NextFunction) => {
    const errs = validationResult(req);

    if (!errs.isEmpty()) {
        if (req?.files?.resourceImg) {
            const resourceImg = req.files.resourceImg[0];

            unlink(`${getBaseDirPath()}/public/images/servicesResources/${resourceImg.filename}`, err => {
                if (err) {
                    console.log(`could not remove service-resource-image: ${err}.`);
                } else {
                    console.log('Deleted service-resource-image.');
                }
            })
        }
    }

    next();
}

export default unlinkServiceResourceImgIfErr;
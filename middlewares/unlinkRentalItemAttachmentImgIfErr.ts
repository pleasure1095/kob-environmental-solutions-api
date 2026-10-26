import { NextFunction, Response } from "express";
import { validationResult } from "express-validator";
import { unlink } from "fs";
import { getBaseDirPath } from "../helpers";


const unlinkRentalItemAttachmentImgIfErr = (req: any, res: Response, next: NextFunction) => {
    const errs = validationResult(req);

    if (!errs.isEmpty()) {
        if (req?.files?.rentalItemAttachmentImg) {
            const rentalItemAttachmentImg = req.files.rentalItemAttachmentImg[0];

            unlink(`${getBaseDirPath()}/public/images/rentalItemsAttachments/${rentalItemAttachmentImg.filename}`, (err: any) => {
                if (err) {
                    console.log(`could not remove image: ${err}`);
                } else {
                    console.log('Deleted image');
                }
            })
        }
    }

    next();
}

export default unlinkRentalItemAttachmentImgIfErr;
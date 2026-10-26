import { NextFunction, Response } from "express";
import { validationResult } from "express-validator";
import { unlink } from "fs";
import { getBaseDirPath } from "../helpers";


const unlinkRentalItemAttachmentVideoIfErr = (req: any, res: Response, next: NextFunction) => {
    const errs = validationResult(req);

    if (!errs.isEmpty()) {
        if (req?.files?.rentalItemAttachmentVideo) {
            const rentalItemAttachmentVideo = req.files.rentalItemAttachmentVideo[0];

            unlink(`${getBaseDirPath()}/public/videos/rentalItemsAttachments/${rentalItemAttachmentVideo.filename}`, (err: any) => {
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

export default unlinkRentalItemAttachmentVideoIfErr;
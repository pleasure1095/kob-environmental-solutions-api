import { NextFunction, Response } from "express";
import { FILE_2_LARGE, FILE_OK, MAX_RENTAL_ITEM_ATTACHMENT_VIDEO_SIZE } from "../config/constants";

const genRentalItemAttachmentVideoErr = (req: any, res: Response, next: NextFunction) => {

    const files = req?.files ?? null;

    if (files && files?.rentalItemAttachmentVideo) {
        const rentalItemAttachmentVideo = files.rentalItemAttachmentVideo[0];

        if (rentalItemAttachmentVideo.size > MAX_RENTAL_ITEM_ATTACHMENT_VIDEO_SIZE) {
            req.body.rentalItemAttachmentVideo = FILE_2_LARGE;
        } else {
            req.body.rentalItemAttachmentVideo = FILE_OK;
        }

    }

    next();
}

export default genRentalItemAttachmentVideoErr;
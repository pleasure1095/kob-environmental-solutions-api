import { NextFunction, Request, Response } from "express";
import { FILE_2_LARGE, FILE_OK, MAX_RENTAL_ATTACHMENT_IMG_SIZE, MAX_USER_IMG_SIZE } from "../config/constants";

const genRentalItemAttachmentImgErr = (req: any, res: Response, next: NextFunction) => {

    const files = req?.files ?? null;

    if (files && files?.rentalItemAttachmentImg) {
        const rentalItemAttachmentImg = files.rentalItemAttachmentImg[0];

        if (rentalItemAttachmentImg.size > MAX_RENTAL_ATTACHMENT_IMG_SIZE) {
            req.body.rentalItemAttachmentImg = FILE_2_LARGE;
        } else {
            req.body.rentalItemAttachmentImg = FILE_OK;
        }

    }

    next();
}

export default genRentalItemAttachmentImgErr;
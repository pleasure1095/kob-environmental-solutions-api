import { NextFunction, Response } from "express";

const nameRentalItemAttachmentImg = (req: any, res: Response, next: NextFunction) => {

    if (req?.files?.rentalItemAttachmentImg) {
        const rentalItemAttachmentImg = req.files.rentalItemAttachmentImg[0];

        req.body.imgSrc = `/images/rentalItemsAttachments/${rentalItemAttachmentImg.filename}`;
    }

    next();
}

export default nameRentalItemAttachmentImg;
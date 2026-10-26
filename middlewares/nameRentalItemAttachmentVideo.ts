import { NextFunction, Response } from "express";

const nameRentalItemAttachmentVideo = (req: any, res: Response, next: NextFunction) => {

    if (req?.files?.rentalItemAttachmentVideo) {
        const rentalItemAttachmentVideo = req.files.rentalItemAttachmentVideo[0];

        req.body.videoSrc = `/videos/rentalItemsAttachments/${rentalItemAttachmentVideo.filename}`;
    }

    next();
}

export default nameRentalItemAttachmentVideo;
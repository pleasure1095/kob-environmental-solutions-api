import { NextFunction, Request, Response } from "express";

const nameRentalItemImg = (req: any, res: Response, next: NextFunction) => {

    if (req?.files?.rentalItemImg) {
        const rentalItemImg = req.files.rentalItemImg[0];

        req.body.rentalItemImg = `/images/rentalItems/${rentalItemImg.filename}`;
    }


    next();
}

export default nameRentalItemImg;
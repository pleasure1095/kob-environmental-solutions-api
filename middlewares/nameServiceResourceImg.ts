import { NextFunction, Request, Response } from "express";

const nameServiceResourceImg = (req: any, res: Response, next: NextFunction) => {

    if (req?.files?.resourceImg) {
        const resourceImg = req.files.resourceImg[0];

        req.body.imgSrc = `/images/servicesResources/${resourceImg.filename}`;
    }


    next();
}

export default nameServiceResourceImg;
import { NextFunction, Request, Response } from "express";
import RentalItem from "../db/models/RentalItem";
import RentalItemAttachment from "../db/models/RentalItemAttachment";

const pRentalItemAttachmentCanUpdateToThisName = async (req: Request, res: Response, next: NextFunction) => {
    const rentalItemAttachment = await RentalItemAttachment.findOne({ _id: req.params.id });

    if (rentalItemAttachment && req.body?.name === rentalItemAttachment.name) {
        next();
        return;
    }


    if (req.body?.name) {
        const altRentalItemAttachment = await RentalItemAttachment.findOne({ name: req.body.name });

        if (altRentalItemAttachment && rentalItemAttachment && (altRentalItemAttachment._id.toString() !== req.params.id) && ((altRentalItemAttachment.serviceResourceId === rentalItemAttachment.serviceResourceId))) {      //another rentalItemAttachment already uses that name.
            res.status(400);
            res.send({
                errors: [
                    {
                        location: 'body',
                        msg: 'This name is already connected to another rental-item.',
                        path: 'name',
                        type: 'field',
                        value: '',
                    }
                ]
            });
            return;
        }
    }

    next();

}

export default pRentalItemAttachmentCanUpdateToThisName;
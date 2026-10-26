import { NextFunction, Request, Response } from "express";
import RentalItem from "../db/models/RentalItem";

const pRentalItemCanUpdateToThisName = async (req: Request, res: Response, next: NextFunction) => {
    const rentalItem = await RentalItem.findOne({ _id: req.params.id });

    if (rentalItem && req.body?.name === rentalItem.name) {
        next();
        return;
    }


    if (req.body?.name) {
        const altRentalItem = await RentalItem.findOne({ name: req.body.name });

        if (altRentalItem && altRentalItem._id !== req.params.id) {      //another rentalItem already uses that name.
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

export default pRentalItemCanUpdateToThisName;
import { NextFunction, Request, Response } from "express";
import { CREDIT_PAYMENT } from "../config/constants";
import rentalPackagesController from "../controllers/rentalPackagesController";
import RentalPackage from "../db/models/RentalPackage";

const rentalTimeFrameExtensionPaymentNotByCreditOrCanBeByCredit = async (req: Request, res: Response, next: NextFunction) => {

    if (req.body.paymentTypes.length === 1 && req.body.paymentTypes[0] === CREDIT_PAYMENT) {        //customer wants to pay soley by credit-balance
        const rentalPackage = await RentalPackage.findOne({ _id: req.body.rentalPackageId });

        if (!rentalPackage) {
            throw new Error('could not fetch rental package.');
        }

        const extensionCost = await rentalPackage.getTotalPrice(parseFloat(req.body.daysCount as string));

        const customer = await rentalPackagesController.getCustomer4RentalPackageById(rentalPackage._id);

        if (!customer || extensionCost) {
            throw new Error('could not fetch customer or extension cost.');
        }


        if (extensionCost > customer.creditBalance) {
            res.status(400).send({
                errors: [
                    {
                        location: 'body',
                        msg: 'Insufficient credit-balance for time-frame-extension. Try splitting payment between the different payment options.',
                        path: 'paymentTypes',
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

export default rentalTimeFrameExtensionPaymentNotByCreditOrCanBeByCredit;
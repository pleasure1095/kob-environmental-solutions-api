import { NextFunction, Request, Response } from "express";
import { CREDIT_PAYMENT, CUSTOMER, GATEWAY_PAYMENT } from "../config/constants";
import authController from "../controllers/authController";
import Customer, { ICustomer } from "../db/models/users/Customer";
import { IUser } from "../db/models/users/User";

const customerNot2PayOnCreditOrCustomerToPayOnCreditAndCan = async (req: Request, res: Response, next: NextFunction) => {

    if (req.body?.paymentTypes !== undefined) {

        if (req.body?.paymentTypes?.length === 1 && req.body?.paymentTypes[0] === CREDIT_PAYMENT) {        //customer wants to pay soley by credit-balance

            if (!req.body?.totalCost) {
                console.log('total cost is missing');
                res.status(400).send({
                    errors: [
                        {
                            location: 'body',
                            msg: 'This field is required.',
                            path: 'totalCost',
                            type: 'field',
                            value: '',
                        }
                    ]
                });
                return;
            }


            const totalPrice = parseInt(req.body.totalCost);

            let customer: ICustomer | null = null;

            const authUser: IUser | null = await authController.getAuthUser(req);

            if (authUser && (await authUser.getFields()).role.name === CUSTOMER) {
                customer = await Customer.findOne({ userId: authUser._id });
            } else if (req.body?.ownerId) {
                customer = await Customer.findOne({ userId: req.body.ownerId });
            } else {

                if (!req.body?.customerId) {
                    console.log('customer ID is missing')
                    res.status(400).send({
                        errors: [
                            {
                                location: 'body',
                                msg: 'This field is required.',
                                path: 'customerId',
                                type: 'field',
                                value: '',
                            }
                        ]
                    });
                    return;
                }

                customer = await Customer.findOne({ _id: req.body?.customerId });
            }

            if (!customer) {
                throw new Error('Could not fetch the customer');
            }

            if (totalPrice > customer.creditBalance) {
                console.log(`Insufficient credit-balance. Try another payment method. Customer Balance: ${customer.creditBalance}; Total Price: ${totalPrice}`)
                res.status(400).send({
                    errors: [
                        {
                            location: 'body',
                            msg: 'Insufficient credit-balance. Try another payment method.',
                            path: 'paymentTypes',
                            type: 'field',
                            value: '',
                        }
                    ]
                });
                return;
            }
        }

        if ((req.body?.paymentTypes[0] === GATEWAY_PAYMENT) && (req.body?.totalCost !== undefined) && (parseInt(req.body?.totalCost) < 5)) {
            console.log(`Online Payment cannot be completed for values lesser than DB 5. Choose another payment method.`);
            res.status(400).send({
                errors: [
                    {
                        location: 'body',
                        msg: 'Online Payment cannot be completed for values lesser than DB 5. Choose another payment method.',
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

export default customerNot2PayOnCreditOrCustomerToPayOnCreditAndCan;
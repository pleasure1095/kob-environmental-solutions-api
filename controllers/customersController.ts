import { NextFunction, Request, Response } from "express";
import { APPROVED, INITIALIZED, UNAPPROVED } from "../config/constants";
import Order from "../db/models/Order";
import Customer from "../db/models/users/Customer";

class CustomersController {

    async fetch1(req: Request, res: Response, next: NextFunction) {
        const customer = await Customer.findOne({ _id: req.params.id });

        if (customer) {
            const ordersRequests = await Order.find({ customerId: customer._id, status: UNAPPROVED });
            const activeOrders = await Order.find({ customerId: customer._id }).and([{ $or: [{ status: INITIALIZED }, { status: APPROVED }] }]).exec();

            res.status(200).send({
                ...(await customer.getFields()),
                ordersCount: activeOrders.length,
                orderRequestsCount: ordersRequests.length
            });


            return;
        }

        next('Something went wrong. Please, try again.');
    }

}

const customersController = new CustomersController();

export default customersController;
import Order, { IOrder } from "../db/models/Order";
import Customer, { ICustomer } from "../db/models/users/Customer";
import User, { IUser } from "../db/models/users/User";

const orderWithIdCustomerEmailVerified = async (_id: string) => {

    const order: IOrder | null = await Order.findOne({ _id });

    const customer: ICustomer | null = await Customer.findOne({ _id: order?.customerId ?? "" });

    const user: IUser | null = await User.findOne({ _id: customer?.userId ?? "" });

    if (user && user?.emailVerifiedAt) {
        return true;
    }

    throw new Error('The customer\'s email has not been verified');
}

export default orderWithIdCustomerEmailVerified
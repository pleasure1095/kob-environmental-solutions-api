import Customer, { ICustomer } from "../db/models/users/Customer";
import User, { IUser } from "../db/models/users/User";

const customerWithIdEmailVerified = async (customerId: string) => {

    const customer: ICustomer | null  = await Customer.findOne({ _id: customerId });

    if (customer) {
        const user: IUser | null = await User.findOne({_id: customer.userId});

        if (user && user?.emailVerifiedAt) {
            return true;
        }
    }

    throw new Error(`Customer's email has not been verified.`);

}

export default customerWithIdEmailVerified;
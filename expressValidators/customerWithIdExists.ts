import mongoose from "mongoose";
import Customer from "../db/models/users/Customer";

const customerWithIdExists = async (customerId: string) => {

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new Error(`Invalid customer-ID.`);
    }

    const customer = await Customer.findOne({_id: customerId});

    if (customer) {
        return true;
    }

    throw  new Error('Invalid customer-ID.')
}

export default customerWithIdExists;
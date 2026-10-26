import mongoose from "mongoose";
import Order from "../db/models/Order";


const orderWithIdExists = async (orderId: string) => {

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new Error(`Invalid order-ID.`);
    }

    const order = await Order.findOne({ _id: orderId });

    if (order) {
        return true;
    }

    throw new Error('Invalid order-ID.');
}

export default orderWithIdExists;
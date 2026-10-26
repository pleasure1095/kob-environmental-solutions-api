import { APPROVED } from "../config/constants";
import Order from "../db/models/Order";


const orderWithIdApproved = async (orderId: string) => {
    const order = await Order.findOne({ _id: orderId });

    if (order && order.status === APPROVED) {
        return true;
    }

    throw new Error('Order must be in \"Approved\" state.')
}

export default orderWithIdApproved;
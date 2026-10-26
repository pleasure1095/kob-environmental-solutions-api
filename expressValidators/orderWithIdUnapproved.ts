import { UNAPPROVED } from "../config/constants";
import Order from "../db/models/Order";

const orderWithIdUnapproved = async (orderId: string) => {
    const order = await Order.findOne({ _id: orderId });

    if (order && order.status === UNAPPROVED) {
        return true;
    }

    throw new Error('Order does not need approval.')
}

export default orderWithIdUnapproved;
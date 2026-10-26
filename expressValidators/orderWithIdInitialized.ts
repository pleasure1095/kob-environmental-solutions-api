import { INITIALIZED } from "../config/constants";
import Order, { IOrder } from "../db/models/Order";

const orderWithIdInitialized = async (orderId: string) => {
    const order: IOrder | null = await Order.findOne({ _id: orderId });

    if (order && order.status === INITIALIZED) {
        return true;
    }

    throw new Error('Order must be in \"Initialized\" state.')
}

export default orderWithIdInitialized;
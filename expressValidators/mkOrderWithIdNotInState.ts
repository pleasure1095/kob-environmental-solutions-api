import Order from "../db/models/Order";

const mkOrderWithIdNotInState = (state: string) => {
    return async (_id: string) => {

        const order = await Order.findOne({ _id });

        if (order?.status !== state) {
            return true;
        }

        throw new Error(`The order has already been ${state}`);
    }
}

export default mkOrderWithIdNotInState;
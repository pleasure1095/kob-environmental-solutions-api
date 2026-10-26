import mongoose from "mongoose";
import Payment from "../db/models/payments/Payment";

const paymentWithIdExists = async (paymentId: string) => {

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
        throw new Error(`Invalid payment-ID.`);
    }

    const payment = await Payment.findOne({ _id: paymentId });

    if (payment) {
        return true;
    }

    throw new Error('Invalid payment-ID.');
}

export default paymentWithIdExists;
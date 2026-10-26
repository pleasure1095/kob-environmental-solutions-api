import { PAYMENT_COMPLETED } from "../config/constants";
import Payment from "../db/models/payments/Payment";

;

const paymentWithIdNotCompleted = async (_id: string) => {

    const payment = await Payment.findOne({ _id });

    if (payment?.status !== PAYMENT_COMPLETED) {
        return true;
    }

    throw new Error('payment has already been completed.');
}

export default paymentWithIdNotCompleted;
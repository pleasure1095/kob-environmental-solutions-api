import { PAYMENT_COMPLETED } from "../config/constants";
import Payment from "../db/models/payments/Payment";

const orderWithIdPaymentsCompleted = async (resourceId: string) => {

    const payments = await Payment.find({ resourceId });

    let allCompleted = true;

    for (const payment of payments) {
        if (payment.status !== PAYMENT_COMPLETED) {
            allCompleted = false;
            break;
        }
    }

    if (allCompleted) {
        return true;
    }

    throw new Error("All the payments for this Order must be completed.");
}

export default orderWithIdPaymentsCompleted;
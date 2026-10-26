import { PAYMENT_COMPLETED, RENTAL_TIME_FRAME_EXTENSION } from "../config/constants";
import Payment from "../db/models/payments/Payment";

const timeExtWithIdPaymentsCompleted = async (resourceId: string) => {

    let allCompleted = true;

    const payments = await Payment.find({ resourceId, resourceType: RENTAL_TIME_FRAME_EXTENSION });

    for (const payment of payments) {
        if (payment.status !== PAYMENT_COMPLETED) {
            allCompleted = false;
            break;
        }
    }

    if (allCompleted) {
        return true;
    }

    throw new Error('The payment(s) must be completed before approval.');
}

export default timeExtWithIdPaymentsCompleted;
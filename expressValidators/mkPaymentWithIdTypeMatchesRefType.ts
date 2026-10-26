import Payment from "../db/models/payments/Payment";

const mkPaymentWithIdTypeMatchesRefType = (refType: string) => {
    return async (paymentId: string) => {
        const payment = await Payment.findOne({ _id: paymentId });

        if (payment?.type === refType) {
            return true;
        }

        throw new Error(`only '${refType}" payments accepted.`);
    }
}

export default mkPaymentWithIdTypeMatchesRefType;
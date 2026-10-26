import { Document, model, Schema } from "mongoose";


interface ICreditPaymentModel {
    paymentId: string;

    getFields4Export: () => any;
    getFields: () => any;
}

export interface ICreditPayment extends Document, ICreditPaymentModel {}

/**
 * Schema of Payment for an Order made from the Credit Balance of a Customer
 */
const CreditPaymentSchema = new Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true
    }
});


CreditPaymentSchema.methods.getFields4Export = function () {
    return {

    };
}

CreditPaymentSchema.methods.getFields = function () {
    return {

    };
}

const CreditPayment = model<ICreditPayment>('CreditPayment', CreditPaymentSchema);

export default CreditPayment;

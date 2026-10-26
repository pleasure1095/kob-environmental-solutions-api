import { Document, model, Schema } from "mongoose";

interface IGatewayPaymentModel {
    paymentId: string;
    sessionId: string;

    getFields4Export: () => any;
    getFields: () => any;
}

export interface IGatewayPayment extends Document, IGatewayPaymentModel {}

/**
 * Schema of Payment for an Order made by a Customer through a payment-gateway
 */
const GatewayPaymentSchema = new Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true
    }
    //TODO: Populate schema with other important information needed to describe a payment
});

GatewayPaymentSchema.methods.getFields4Export = function() {
    return {
        paymentSessionId: this.sessionId
    }
}

GatewayPaymentSchema.methods.getFields = function() {
    return {
        sessionId: this.sessionId
    }
}

const GatewayPayment = model<IGatewayPayment>('GatewayPayment', GatewayPaymentSchema);

export default GatewayPayment;
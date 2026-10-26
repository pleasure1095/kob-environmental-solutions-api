import { Document, model, Schema } from "mongoose";

interface ITokenedGatewayPaymentEmailDataModel {
    sessionId: string;
    emailData: any;
}

export interface ITokenedGatewayPaymentEmailData extends Document, ITokenedGatewayPaymentEmailDataModel {}

const TokenedGatewayPaymentEmailDataSchema = new Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
    },
    emailData: {
        type: Object,
        required: true
    }
});

const TokenedGatewayPaymentEmailData = model<ITokenedGatewayPaymentEmailData>('TokenedGatewayPaymentEmailData', TokenedGatewayPaymentEmailDataSchema);

export default TokenedGatewayPaymentEmailData;
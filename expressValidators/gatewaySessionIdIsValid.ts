import mongoose from "mongoose"
import GatewayPayment from "../db/models/payments/GatewayPayment"

const gatewaySessionIdIsValid = async (sessionId: string) => {

    if (mongoose.isValidObjectId(sessionId) && (await GatewayPayment.findOne({ sessionId }))) {
        return true;
    }

    throw new Error('Invalid checkout session-ID');
}

export default gatewaySessionIdIsValid;
import { AUTHENTICATOR_SETUP_TOKEN } from "../config/constants";
import EmailVerificationToken from "../db/models/EmailVerificationToken";

const mkEmailVerificationTokenIsValid = (type: string = AUTHENTICATOR_SETUP_TOKEN) => {

    /**
     * EmailVerificationTokenIsValid
     */
    return async (value: string) => {
        const token = await EmailVerificationToken.findOne({ value, type });

        if (token) {
            if (token.canExpire() && token.hasExpired()) {

                await EmailVerificationToken.deleteMany({ value: type });

                throw new Error("Expired token. Request for a new one.");
            }

            return true;
        }

        throw new Error("Invalid token.");
    }
}

export default mkEmailVerificationTokenIsValid;
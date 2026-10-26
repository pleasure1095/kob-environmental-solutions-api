import { EMAIL_VERIFICATION_TOKEN } from "../config/constants";
import EmailVerificationToken from "../db/models/EmailVerificationToken";
import User from "../db/models/users/User";

const oldVerificationEmail4userIdHasExpired = async (_id: string) => {

    const user = await User.findOne({ _id });

    if (user) {
        const token = await EmailVerificationToken.findOne({ userId: user._id.toString(), type: EMAIL_VERIFICATION_TOKEN });

        if (token) {
            if (!token.hasExpired()) {
                throw new Error(`We mailed the registered e-mail address recently. Check your inbox or try again in ${token.getValidSecondsLeft()} second${(token.getValidSecondsLeft() > 1) ? "s" : ""}.`);
            }

            await EmailVerificationToken.deleteMany({ _id: token._id.toString(), type: EMAIL_VERIFICATION_TOKEN });
        }

    }

    return true;
}

export default oldVerificationEmail4userIdHasExpired;
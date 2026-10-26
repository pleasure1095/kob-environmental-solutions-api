import User from "../db/models/users/User";

const mkUserWithFieldUsesAuthenticator2FA = (field: string) => {

    return async (fieldValue: string) => {
        const user = await User.findOne({[field]: fieldValue});

        if (user && user.usesAuthenticator2FA) {
            return true;
        }

        throw new Error("This user does not use Authenticator 2FA.");
    }

}

export default mkUserWithFieldUsesAuthenticator2FA;
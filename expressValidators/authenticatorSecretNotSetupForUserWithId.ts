import AuthenticatorSecret from "../db/models/AuthenticatorSecret";

const authenticatorSecretNotSetupForUserWithId = async (_id: string) => {
    if (await AuthenticatorSecret.findOne({ userId: _id })) {
        throw new Error("The Authenticator Secret has already been set-up for this user.");
    }

    return true;
}

export default authenticatorSecretNotSetupForUserWithId;
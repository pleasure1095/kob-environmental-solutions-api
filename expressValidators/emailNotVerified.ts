import User from "../db/models/users/User"

const emailNotVerified = async (email: string) => {
    const user = await User.findOne({ email });

    if (user && user?.emailVerifiedAt) {
        throw new Error("This e-mail address has already been verified.");
    }

    return true;
}

export default emailNotVerified;
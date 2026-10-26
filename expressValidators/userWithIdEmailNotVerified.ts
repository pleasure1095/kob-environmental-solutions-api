import User from "../db/models/users/User"

const userWithIdEmailNotVerified = async (_id: string) => {
    const user = await User.findOne({ _id });

    if (user) {
        if (user?.emailVerifiedAt) {
            throw new Error('The e-mail address of this user has already been verified.');
        }
    }

    return true;
}

export default userWithIdEmailNotVerified;
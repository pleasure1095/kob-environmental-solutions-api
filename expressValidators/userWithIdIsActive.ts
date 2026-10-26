import { ACTIVE } from "../config/constants";
import User from "../db/models/users/User";

const userWithIdIsActive = async (userId: string) => {
    const user = await User.findOne({ _id: userId });

    if (user && user.status === ACTIVE) {
        return true;
    }

    throw new Error('User has been disabled.')
}

export default userWithIdIsActive;
import mongoose from "mongoose";
import User from "../db/models/users/User";

const userWithIdExists = async (userId: string) => {

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error(`Invalid user-ID.`);
    }

    const user = await User.findOne({_id: userId});

    if (user) {
        return true;
    }

    throw  new Error('Invalid user-ID.')
}

export default userWithIdExists;
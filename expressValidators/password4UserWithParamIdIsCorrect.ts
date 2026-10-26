import mongoose from "mongoose";
import User from "../db/models/users/User";

const password4UserWithParamIdIsCorrect = async (password: string, meta: any) => {
    const {req} = meta;

    if (mongoose.isValidObjectId(req?.params?.id)) {
        const user = await User.findOne({_id: req?.params?.id});

        if (user && user.passwordMatches(user, password)) {
            return true;
        }
    }

    throw new Error("Incorrect password.");
}

export default password4UserWithParamIdIsCorrect;
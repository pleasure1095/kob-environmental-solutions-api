import mongoose from "mongoose";
import User from "../db/models/users/User";


const mkRoleWithIdExists = (role: string) => {

    return async (userId: string) => {

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error(`Invalid ${role}-ID.`);
        }
    
        const user = await User.findOne({_id: userId});
    
        if (user && (await user.getFields()).role.name === role) {
            return true;
        }
    
        throw  new Error(`Invalid ${role}-ID.`);
    }
}

export default mkRoleWithIdExists;
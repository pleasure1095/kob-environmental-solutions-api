import User from "../db/models/users/User";

const mkUserWithFieldExists = (field: string, fieldName = null) => {
    return async (value: string) => {
        const user = await User.findOne({ [field]: value });

        if (user) {
            return true;
        }

        throw new Error(`Invalid ${fieldName ? `${fieldName}` : `${field}`}.`);

    }
}

export default mkUserWithFieldExists;
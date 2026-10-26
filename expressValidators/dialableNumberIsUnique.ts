import User from "../db/models/users/User"

const dialableNumberIsUnique = async (value: string) => {

    const users = await User.find().or([{ phone: value }, { mobile: value }]).exec();

    if (users && (users.length > 0)) {
        throw new Error("This number has been chosen already. Please, input something else.");``
    }

    return true;
}

export default dialableNumberIsUnique;
import User from "../db/models/users/User";

const mkUserFieldIsUnique = (fieldName: string) => {
    return async (value: string, meta: any) => {

        const { req } = meta;

        const user = await User.findOne({
            [fieldName]: value
        });

        if (user) {         //the passed field's value already exists in the database
            if (user._id.toString() === req?.params?.id) {      //theh value is for the user being tested
                return true;
            }

            throw new Error(`This ${fieldName} has already been chosen. Please, input something else.`);
        }

        return true;
    }
}

export default mkUserFieldIsUnique;
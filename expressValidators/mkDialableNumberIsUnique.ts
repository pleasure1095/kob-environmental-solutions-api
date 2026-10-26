import User from "../db/models/users/User"

const mkDialableNumberIsUnique = (fieldName4Number: string) => {
    return async (value: string, meta: any) => {

        const users = await User.find().or([{ phone: value }, { mobile: value }]).exec();
        const { req } = meta;

        if (users && (users.length > 0)) {

            const subjectUser = await User.findOne({ _id: req?.params?.id });

            if (subjectUser) {
                for (const user of users) {
                    if ((subjectUser._id.toString() === user._id.toString()) && ((await subjectUser.getFields())[fieldName4Number] === (await user.getFields())[fieldName4Number])) {       //The tested dialable number belongs to the subject-user
                        return true;
                    }
                }
            }

            throw new Error("This number has been chosen already. Please, input something else."); ``
        }

        return true;
    }
}

export default mkDialableNumberIsUnique;
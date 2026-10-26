import mongoose from "mongoose";
import Company from "../db/models/Company";

const companyWithIdExists = async (_id: string) => {
    if (mongoose.isValidObjectId(_id) && (await Company.findOne({ _id }))) {
        return true;
    }

    throw new Error('Invalid company-ID');
}

export default companyWithIdExists;
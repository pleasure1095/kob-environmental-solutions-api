import mongoose from "mongoose";
import Site from "../db/models/Site";

const siteWithIdExists = async (_id: string) => {
    if (mongoose.isValidObjectId(_id) && await Site.findOne({ _id })) {
        return true;
    }

    throw new Error('Invalid site-ID');
};

export default siteWithIdExists;
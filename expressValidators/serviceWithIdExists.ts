import mongoose from "mongoose";
import Service from "../db/models/Service";

const serviceWithIdExists = async (_id: string) => {
    if (mongoose.isValidObjectId(_id) && await Service.findOne({ _id })) {
        return true;
    }

    throw new Error('Invalid service-ID.');
}

export default serviceWithIdExists;
import mongoose from "mongoose";
import ServiceResource from "../db/models/ServiceResource";


const serviceResourceWithIdExists = async (_id: string) => {
    if (!mongoose.isValidObjectId(_id)) {
        throw new Error('Invalid service-resource-ID');
    }

    if (await ServiceResource.findOne({ _id })) {
        return true;
    }

    throw new Error('Invalid service-resource-ID');
}

export default serviceResourceWithIdExists;
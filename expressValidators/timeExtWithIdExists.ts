import mongoose from "mongoose";
import RentalTimeFrameExtension from "../db/models/RentalTimeFrameExtension";

const timeExtWithIdExists = async (_id: string) => {

if (!mongoose.Types.ObjectId.isValid(_id)) {
        throw new Error(`Invalid Rental time-frame extension ID.`);
    }

    if (await RentalTimeFrameExtension.findOne({ _id })) {
        return true;
    }


    throw new Error(`Invalid rental time-frame extension ID.`);
}

export default timeExtWithIdExists;
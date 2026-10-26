import mongoose from "mongoose";
import RentalItemAttachmentSession from "../db/models/RentalItemAttachmentSession";

const rentalItemAttachmentSessionWithIdExists = async (_id: string) => {
    if (mongoose.isValidObjectId(_id) && (await RentalItemAttachmentSession.findOne({ _id }))) {
        return true;
    }

    throw new Error('Invalid Rental-item Attachment Session ID');
}

export default rentalItemAttachmentSessionWithIdExists;
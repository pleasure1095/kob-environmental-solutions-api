import mongoose from "mongoose"
import Message from "../db/models/Message"

const messageWithIdExists = async (_id: string) => {
    if (mongoose.isValidObjectId(_id) && (await Message.findOne({_id}))) {
        return true;
    }

    throw new Error('Invalid message ID');
}

export default messageWithIdExists;
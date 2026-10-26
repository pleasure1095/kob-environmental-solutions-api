import { Document, model, Schema } from "mongoose";

interface IRentalItemAttachmentSessionModel {
    serviceResourceSessionId: string;
    rentalItemAttachmentId: string;
    creationTimeStamp: number;
    activationTimeStamp?: number;
    abortionTimeStamp?: number;
    completionTimeStamp?: number;

    getFields: () => any;
}

interface IRentalItemAttachmentSession extends IRentalItemAttachmentSessionModel, Document { }

const RentalItemAttachmentSessionSchema = new Schema({
    serviceResourceSessionId: {       // serviceResourceSessionId + rentalItemAttachmentId is a unique value
        type: String,
        required: true
    },
    rentalItemAttachmentId: {     // serviceResourceSessionId + rentalItemAttachmentId is a unique value
        type: String,
        required: true,
    },
    creationTimeStamp: {
        type: Number,
        required: true
    },
    activationTimeStamp: {
        type: Number,
        required: false
    },
    abortionTimeStamp: {
        type: Number,
        required: false
    },
    completionTimeStamp: {
        type: Number,
        required: false
    }
});

RentalItemAttachmentSessionSchema.methods.getFields = async function() {
    return {
        _id: this._id,
        rentalItemAttachmentId: this.rentalItemAttachmentId,
        creationTimeStamp: this.creationTimeStamp,
        activationTimeStamp: this?.activationTimeStamp ?? undefined,
        abortionTimeStamp: this?.abortionTimeStamp ?? undefined,
        completionTimeStamp: this?.completionTimeStamp ?? undefined,
    }
}

const RentalItemAttachmentSession = model<IRentalItemAttachmentSession>("RentalItemAttachmentSession", RentalItemAttachmentSessionSchema);

export default RentalItemAttachmentSession;
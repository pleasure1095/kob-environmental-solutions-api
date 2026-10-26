import { Document, model, Schema } from "mongoose";
import RentalItemAttachmentSession from "./RentalItemAttachmentSession";

interface IServiceResourceSessionModel {
    rentalItemSessionId: string;
    serviceResourceId: string;
    creationTimeStamp: number;
    activationTimeStamp?: number;
    abortionTimeStamp?: number;
    completionTimeStamp?: number;
    activeRentalItemAttachmentSessionId?: string;

    getFields: () => any;
}

interface IServiceResourceSession extends IServiceResourceSessionModel, Document { }

const ServiceResourceSessionSchema = new Schema({
    rentalItemSessionId: {       // rentalItemSessionId + serviceResourceId is a unique value
        type: String,
        required: true
    },
    serviceResourceId: {     // rentalItemSessionId + serviceResourceId is a unique value
        type: String,
        required: true,
    },
    activeRentalItemAttachmentSessionId: {
        type: String,
        required: false
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

ServiceResourceSessionSchema.methods.getFields = async function() {

    const rentalItemsAttachmentsSessions = await RentalItemAttachmentSession.find({serviceResourceSessionId: this._id.toString()});
    let attachmentsSessions: any[] = [];

    if (rentalItemsAttachmentsSessions) {
        for (const attachmentSession of rentalItemsAttachmentsSessions) {
            attachmentsSessions = [
                ...attachmentsSessions,
                (await attachmentSession.getFields())
            ];
        }
    }

    return {
        _id: this._id,
        serviceResourceId: this.serviceResourceId,
        creationTimeStamp: this.creationTimeStamp,
        activationTimeStamp: this?.activationTimeStamp ?? undefined,
        abortionTimeStamp: this?.abortionTimeStamp ?? undefined,
        completionTimeStamp: this?.completionTimeStamp ?? undefined,
        rentalItemsAttachmentsSessions: attachmentsSessions,
        activeRentalItemAttachmentSessionId: this?.activeRentalItemAttachmentSessionId ?? undefined
    }
}

const ServiceResourceSession = model<IServiceResourceSession>("ServiceResourceSession", ServiceResourceSessionSchema);

export default ServiceResourceSession;
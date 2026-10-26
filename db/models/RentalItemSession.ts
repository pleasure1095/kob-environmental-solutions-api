import { Document, model, Schema } from "mongoose";
import ServiceResourceSession from "./ServiceResourceSession";

interface IRentalItemSessionModel {
    userId: string;
    rentalItemId: string;
    creationTimeStamp: number;
    activationTimeStamp?: number;
    abortionTimeStamp?: number;
    completionTimeStamp?: number;
    activeServiceResourceSessionId?: string;

    getFields: () => any;
}

interface IRentalItemSession extends IRentalItemSessionModel, Document { }

const RentalItemSessionSchema = new Schema({
    userId: {       // userId + rentalItemId is a unique value
        type: String,
        required: true
    },
    rentalItemId: {     // userId + rentalItemId is a unique value
        type: String,
        required: true,
    },
    activeServiceResourceSessionId: {
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

RentalItemSessionSchema.methods.getFields = async function () {

    const servicesResourcesSessions = await ServiceResourceSession.find({ rentalItemSessionId: this._id.toString() });
    let resourcesSessionsData: any[] = [];

    if (servicesResourcesSessions) {
        for (const resourceSession of servicesResourcesSessions) {
            resourcesSessionsData = [
                ...resourcesSessionsData,
                (await resourceSession.getFields())
            ];
        }
    }

    return {
        _id: this._id,
        userId: this.userId,
        rentalItemId: this.rentalItemId,
        creationTimeStamp: this.creationTimeStamp,
        activationTimeStamp: this?.activationTimeStamp ?? undefined,
        abortionTimeStamp: this?.abortionTimeStamp ?? undefined,
        completionTimeStamp: this?.completionTimeStamp ?? undefined,
        servicesResourcesSessions: resourcesSessionsData,
        activeServiceResourceSessionId: this?.activeServiceResourceSessionId ?? undefined
    }
}

const RentalItemSession = model<IRentalItemSession>("RentalItemSession", RentalItemSessionSchema);

export default RentalItemSession;
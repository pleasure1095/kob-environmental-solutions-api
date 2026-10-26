import { Document, model, Schema } from "mongoose";

interface IRentalItemAttachmentModel {
    serviceResourceId: string;
    creatorId: string;
    name: string;
    videoSrc: string;

    description: string;
    imgSrc?: string;
    count: string;
    unavailableCount: number;
    pricePerDay: number;
    deletedAt?: number;

    countAvailable: () => number;
    getRentPrice: (itemAttachmentCount: number, daysCount: number) => number;
    getFields4Export: () => any;
    getFields: () => any;
}

export interface IRentalItemAttachment extends Document, IRentalItemAttachmentModel { }

const RentalItemAttachmentSchema = new Schema({
    serviceResourceId: {
        type: String,
        requierd: true
    },
    creatorId: {
        type: String,
        requierd: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    imgSrc: {
        type: String,
        required: false,
        unique: false,
        default: 'images/notexisting.jpg'
    },
    videoSrc: {
        type: String,
        required: false,
        unique: false,
        default: 'images/notexisting.jpg'
    },
    deletedAt: {        //The timestamp when this user was marked as deleted
        type: Number,
        required: false
    },
}, {
    timestamps: true
});

RentalItemAttachmentSchema.methods.countAvailable = function () {
    const ans = this.count - this.unavailableCount;
}

RentalItemAttachmentSchema.methods.getRentPrice = function (itemAttachmentCount: number, daysCount: number) {
    return ((this.pricePerDay * itemAttachmentCount) * daysCount);
}


RentalItemAttachmentSchema.methods.getFields4Export = function () {
    return {
    }
}

RentalItemAttachmentSchema.methods.deduceRating4ThisItemAttachment = function () {
    //TODO: find the average of all the ratings (made by members) of this rental itemAttachment


    return 4.5;
}

RentalItemAttachmentSchema.methods.getFields = function () {
    return {
        _id: this._id,
        name: this.name,
        videoSrc: this?.videoSrc ?? undefined,
        createdAt: this.createdAt,
    }
}


const RentalItemAttachment = model<IRentalItemAttachment>('RentalItemAttachment', RentalItemAttachmentSchema);

export default RentalItemAttachment;
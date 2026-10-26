import { Document, model, Schema } from "mongoose";

interface IServiceResourceModel {
    rentalItemId: string;
    name: string;
    content?: string;
    imgSrc?: string;
    unit: string;
    quantityLeft?: number;
    deletedAt?: number;

    getFields4Export: () => any;
    getFields: () => any;
}

export interface IServiceResource extends Document, IServiceResourceModel {}

const ServiceResourceSchema = new Schema({
    rentalItemId: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
        unique: false
    },
    content: {
        type: String,
        required: false
    },
    imgSrc: {
        type: String,
        required: false,
    },
    unit: {     //measurement unit (e.g ltr, hr, min, sec, kg, e.t.c.)
        type: String,
        required: false,
    },
    unitPrice: {
        type: Number,
        required: true
    },
    quantityLeft: {     //the quantity of this Resource that is remaining
        type: Number,
        required: false
    },
    deletedAt: {
        type: Number,
        required: false
    }
}, {
    timestamps: true
});

ServiceResourceSchema.methods.getFields4Export = function () {
    return {
        serviceResourceName: this.name,
        serviceResourceUnit: this.unit,
        serviceResourcePricePerUnit: this.unitPrice,
        serviceResourceQuantityLeft: this?.quantityLeft ?? undefined
    }
}

ServiceResourceSchema.methods.getFields = function () {
    return {
        _id: this._id,
        name: this.name,
        content: this?.content ?? undefined,
        imgSrc: this?.imgSrc ?? undefined,
        unit: this.unit,
        unitPrice: this.unitPrice,
        quantityLeft: this?.quantityLeft ?? undefined
    }
}

const ServiceResource = model<IServiceResource>('ServiceResource', ServiceResourceSchema);

export default ServiceResource;
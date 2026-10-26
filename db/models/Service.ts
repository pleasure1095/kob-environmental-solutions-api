import { Document, model, Schema } from "mongoose";
import ServiceResource from "./ServiceResource";

interface IServiceModel {
    name: string;
    serviceResourceId?: string;
    cost: number;
    driverCanSee: boolean;

    getFields4Export: () => any;
    getFields: () => any;
}

export interface IService extends Document, IServiceModel {}

const ServiceSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    serviceResourceId: {
        type: String,
        required: false
    },
    cost: {
        type: Number,
        required: true,
        default: 0
    },
    driverCanSee: {
        type: Boolean,
        required: true,
    }
}, {
    timestamps: true
});

ServiceSchema.methods.getFields4Export = async function () {

    const resource = await ServiceResource.findOne({ _id: this.serviceResourceId });

    return {
        ...(resource?.getFields4Export() ?? undefined),
        serviceName: this.name,
        serviceCost: this.cost,
        requestableByDrivers: this.driverCanSee
    }
}

ServiceSchema.methods.getFields = async function () {

    const resource = await ServiceResource.findOne({ _id: this.serviceResourceId });

    return {
        _id: this._id,
        name: this.name,
        resource: resource?.getFields() ?? undefined,
        cost: this.cost,
        driverCanSee: this.driverCanSee
    }
}

const Service = model<IService>('Service', ServiceSchema);

export default Service;
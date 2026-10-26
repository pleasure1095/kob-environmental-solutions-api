import { Document, model, Schema } from "mongoose";
import { COMPANY, CUSTOMER } from "../../config/constants";

interface ISiteModel {
    ownerType: string;
    ownerId: string;
    name: string;
    address: string;
    googleMapURL?: string;

    getFields4Export: (orderType: string) => any;
    getFields: () => any;
}

export interface ISite extends Document, ISiteModel { }

const SiteSchema = new Schema({
    ownerType: {
        type: String,
        required: true,
        enum: [CUSTOMER, COMPANY]
    },
    ownerId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    googleMapURL: {
        type: String,
        required: false
    }
}, {
    timestamps: true
}
);

SiteSchema.methods.getFields4Export = function (orderType: string) {
    return {
        [`${orderType}SiteName`]: this.name,
        [`${orderType}SiteAddress`]: this.address,
        [`${orderType}SitegoogleMapURL`]: this?.googleMapURL ?? undefined
    }
}

SiteSchema.methods.getFields = function () {
    return {
        _id: this._id,
        owner: {
            type: this.ownerType,
            id: this.ownerId
        },
        name: this.name,
        address: this.address,
        googleMapURL: this?.googleMapURL ?? undefined
    }
}

const Site = model<ISite>('Site', SiteSchema);

export default Site;
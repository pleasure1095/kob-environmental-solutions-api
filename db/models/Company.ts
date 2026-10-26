import { Document, model, Schema } from "mongoose";
import Site from "./Site";

interface ICompanyModel {
    name: string;
    country: string;
    state: string;
    mainOfficeAddress?: string
    phoneNumber: string;
    faxNumber: string;
    email: string;
    website?: string;

    getFields: () => any;
    asyncGetFields: () => any;
    getFields4Export: () => any;
    getFields4Enum: () => any;
}

export interface ICompany extends Document, ICompanyModel {}

const CompanySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    country: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true
    },
    mainOfficeAddress: {
        type: String,
        required: false,
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    faxNumber: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    website: {
        type: String,
        required: false,
    }
}, {
    timestamps: true
});

CompanySchema.methods.getFields = function () {
    return {
        _id: this._id,
        name: this.name,
        country: this.country,
        state: this.state,
        mainOfficeAddress: this?.mainOfficeAddress ?? undefined,
        phoneNumber: this.phoneNumber,
        faxNumber: this?.faxNumber ?? undefined,
        email: this.email,
        website: this.website
    };
}

CompanySchema.methods.asyncGetFields = async function () {
    const sites = await Site.find({ ownerId: this._id });

    return {
        _id: this._id,
        name: this.name,
        country: this.country,
        state: this.state,
        mainOfficeAddress: this?.mainOfficeAddress ?? undefined,
        phoneNumber: this.phoneNumber,
        faxNumber: this?.faxNumber ?? undefined,
        email: this.email,
        sitesCount: sites?.length ?? 0,
        website: this.website
    };
}

CompanySchema.methods.getFields4Export = async function () {

    const sites = await Site.find({ ownerId: this._id });

    return {
        customerCompanyName: this.name,
        customerCompanyEmail: this.email,
        customerCompanyPhoneNumber: this.phoneNumber,
        customerCompanyCountry: this.country,
        customerCompanyState: this.state,
        customerCompanyMainOfficeAddress: this?.mainOfficeAddress ?? undefined,
        customerCompanyFaxNumber: this?.faxNumber ?? undefined,
        customerCompanySitesCount: sites?.length ?? 0,
        customerCompanyWebsite: this.website
    };
}


CompanySchema.methods.getFields4Enum = async function () {

    const sites = await Site.find({ ownerId: this._id });

    return {
        _id: this._id,
        name: this.name,
        email: this.email,
        phoneNumber: this.phoneNumber,
        sitesCount: sites?.length ?? 0
    };
}

const Company = model<ICompany>('Company', CompanySchema);

export default Company;
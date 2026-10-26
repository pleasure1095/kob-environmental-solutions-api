import { Document, model, Schema } from "mongoose";
import { CUSTOMER } from "../../../config/constants";
import Company from "../Company";
import User from "./User";

interface ICustomerModel {
    userId: string;
    companyId?: string;
    signatureImgSrc?: string;
    creditBalance: number;
    phoneNumber: string;
    landLine?: string;
    deliveryAddress?: string;
    statusAlteredAt: number;

    getFields4Export: () => any;
    getFields: () => any;
    getFields4Enum: () => any;
}

export interface ICustomer extends Document, ICustomerModel {}

const CustomerSchema = new Schema({     //extends UserSchema
    userId: {
        type: String,
        required: true,
        unique: true
    },
    companyId: {
        type: String,
        required: false
    },
    signatureImgSrc: {
        type: String,
        required: false,
        unique: false,
    },
    creditBalance: {
        type: Number,
        required: true,
        default: 0
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    landLine: {
        type: String,
        required: false,
        unique: false
    },
    deliveryAddress: {
        type: String,
        required: true,
        unique: false
    },
    statusAlteredAt: {
        type: Number,
        required: false,
    }
});

CustomerSchema.methods.getFields4Export = async function () {
    const user = await User.findOne({ _id: this.userId }, '-password');
    let companyData = null

    if (this?.companyId) {
        const company = await Company.findOne({ _id: this.companyId });

        if (company) {
            companyData = {
                ...(await company.getFields4Export()),
            }
        }
    }

    return {
        ...(companyData ?? {}),
        ...(user ? (await user?.getFields4Export(CUSTOMER)) : {}),
        customerCreditBalance: this.creditBalance,
        customerPhoneNumber: this?.phoneNumber ?? undefined,
        customerLandLine: this?.landLine ?? undefined,
        customerDeliveryAddress: this?.deliveryAddress ?? undefined,
        customerStatusAlteredAt: this?.statusAlteredAt ?? undefined
    }
}

CustomerSchema.methods.getFields = async function () {

    const user = await User.findOne({ _id: this.userId }, '-password');
    let companyData = null

    if (this?.companyId) {
        const company = await Company.findOne({ _id: this.companyId });
        companyData = {
            ...(company ? (await company.asyncGetFields()) : {}),
        }
    }

    return {
        ...(user ? (await user.getFields()) : {}),
        _id: this._id,
        userId: this.userId,
        signatureImgSrc: this.signatureImgSrc,
        creditBalance: this.creditBalance,
        phoneNumber: this.phoneNumber,
        landLine: this.landLine,
        deliveryAddress: this.deliveryAddress,
        company: companyData ? companyData : undefined,
        statusAlteredAt: this.statusAlteredAt
    }
}

CustomerSchema.methods.getFields4Enum = async function () {
    const user = await User.findOne({ _id: this.userId }, '-password');

    return {
        ...(user ? user.getFields4Enum() : {}),
        _id: this._id,
        userId: this.userId,
        phoneNumber: this.phoneNumber,
    }
}

const Customer = model<ICustomer>('customer', CustomerSchema);

export default Customer;
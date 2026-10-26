import { model } from "mongoose";

const { Schema } = require("mongoose");

interface IExternalPaymentModel {

    paymentId: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    referenceNumber?: string;

    getFields4Export: () => any;
    getFields: () => any;

}

export interface IExternalPayment extends Document, IExternalPaymentModel {}


const ExternalPaymentSchema = new Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    bankName: {
        type: String,
        required: true
    },
    accountName: {
        type: String,
        required: true
    },
    accountNumber: {
        type: String,
        required: true
    },
    referenceNumber: {
        type: String,
        required: false,
        // uniuqe: true     //To be unique, indeed
    },
    //TODO: Populate schema with other important information needed to describe a payment
});

ExternalPaymentSchema.methods.getFields4Export = function () {
    return {
        paymentBankName: this.bankName,
        paymentAccountName: this.accountName,
        paymentAccountNumber: this.accountNumber,
        paymentReferenceNumber: this.referenceNumber
    }
}

ExternalPaymentSchema.methods.getFields = function () {
    return {
        bankName: this.bankName,
        accountName: this.accountName,
        accountNumber: this.accountNumber,
        referenceNumber: this.referenceNumber
    }
}

const ExternalPayment = model<IExternalPayment>('ExternalPayment', ExternalPaymentSchema);

export default ExternalPayment;
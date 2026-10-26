import { Document, model, Schema } from "mongoose";
import { CREDIT_PAYMENT, EXTERNAL_PAYMENT, GATEWAY_PAYMENT, PAYMENT_COMPLETED, PAYMENT_PENDING, PAYMENT_STATUSES, PAYMENT_TYPES, RESOURCES_PAYABLE_4 } from "../../../config/constants";
import { generateRandStr } from "../../../helpers";
import Customer from "../users/Customer";
import CreditPayment from "./CreditPayment";
import ExternalPayment from "./ExternalPayment";
import GatewayPayment from "./GatewayPayment";

interface IPaymentModel {
    ref?: string;
    type: string;
    amount: number;
    customerId: string;
    resourceType: string;
    resourceId: string;
    status: string;
    isReplacement?: boolean;
    creationTimeStamp?: number;

    deleteDescendants: () => any;
    getEnumFields: () => any;
    getFields4Export: () => any;
    getFields: () => any;

}

export interface IPayment extends Document, IPaymentModel {}



const PaymentSchema = new Schema({
    ref: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: true,
        enum: PAYMENT_TYPES
    },
    amount: {
        type: Number,
        required: true
    },
    customerId: {
        type: String,
        required: true
    },
    resourceType: {
        type: String,
        required: true,
        enum: RESOURCES_PAYABLE_4
    },
    resourceId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: PAYMENT_STATUSES,
        default: PAYMENT_PENDING
    },
    isReplacement: {
        type: Boolean,
        required: false
    },
    creationTimeStamp: {
        type: Number,
        required: false
    },
}, {
    timestamps: true
});

PaymentSchema.pre('save', async function (next) {


    if (this.isNew) {

        this.ref = generateRandStr(7);
        this.creationTimeStamp = (new Date()).getTime();

        if (this.type === CREDIT_PAYMENT) {

            const customer = await Customer.findOne({ _id: this.customerId });

            if (!customer) {
                throw new Error('Could not fetch the customer');
            }

            customer.creditBalance -= this.amount;

            await customer.save();
        }
    }


    next();
});

PaymentSchema.methods.deleteDescendants = async function () {
    switch (this.type) {
        case CREDIT_PAYMENT:
            await CreditPayment.findOneAndDelete({ paymentId: this._id });
            break;
        case EXTERNAL_PAYMENT:
            await ExternalPayment.findOneAndDelete({ paymentId: this._id });
            break;
        case GATEWAY_PAYMENT:
            await GatewayPayment.findOneAndDelete({ paymentid: this._id });
            break;
        default:
            break;
    }
}

PaymentSchema.methods.getEnumFields = function () {
    return {
        _id: this._id,
        ref: this.ref,
        type: this.type,
        customerId: this.customerId,
        resourceType: this.resourceType,
        resourceId: this.resourceId,
        amount: this.amount,
        status: this.status,
        isReplacement: this?.isReplacement ?? undefined,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    }
}

PaymentSchema.methods.getFields4Export = async function () {

    let descendant: any = {
        getFields: () => { }
    };

    const filter = { paymentId: this._id };

    switch (this.type) {
        case CREDIT_PAYMENT:
            descendant = await CreditPayment.findOne(filter);
            break;
        case EXTERNAL_PAYMENT:
            descendant = await ExternalPayment.findOne(filter);
            break;
        case GATEWAY_PAYMENT:
            descendant = await GatewayPayment.findOne(filter);
            break;
        default:
            break;
    }

    const customer = await Customer.findOne({ _id: this.customerId });

    return {
        paymentrRefNumber: this.ref,
        paymentType: this.type,
        paymentAmount: this.amount,
        paymentStatus: this.status,
        paymentInitiatedOn: (new Date(this.createdAt)).toDateString(),
        paymentCompletedOn: (this.status === PAYMENT_COMPLETED) ? (new Date(this.updatedAt)).toDateString() : undefined,
        ...descendant.getFields4Export(),
        resourcePurchased: this.resourceType,
        resourceId: this.resourceId,
        ...( customer ? (await customer.getFields4Export()) : {}),

    }
}

PaymentSchema.methods.getFields = async function () {

    let descendant: any = {
        getFields: () => { }
    };

    const filter = { paymentId: this._id };

    switch (this.type) {
        case CREDIT_PAYMENT:
            descendant = await CreditPayment.findOne(filter);
            break;
        case EXTERNAL_PAYMENT:
            descendant = await ExternalPayment.findOne(filter);
            break;
        case GATEWAY_PAYMENT:
            descendant = await GatewayPayment.findOne(filter);
            break;
        default:
            break;
    }

    const customer = await Customer.findOne({ _id: this.customerId });

    return {
        _id: this._id,
        ref: this.ref,
        type: this.type,
        customer: customer  ? (await customer.getFields4Enum()) : undefined, 
        resourceType: this.resourceType,
        resourceId: this.resourceId,
        amount: this.amount,
        status: this.status,
        isReplacement: this?.isReplacement ?? undefined,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        ...descendant.getFields()
    }
}

const Payment = model<IPayment>('Payment', PaymentSchema);

export default Payment
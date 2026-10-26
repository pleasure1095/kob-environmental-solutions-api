import { Document, model, Schema } from "mongoose";
import { RENTAL_TIME_FRAME_EXTENSION, RENTAL_TIME_FRAME_EXTENSION_STATUSES, UNAPPROVED } from "../../config/constants";
import Payment from "./payments/Payment";

interface IRentalTimeFrameExtensionModel {
    rentalPackageId: string;
    daysCount: number;
    paymentTypes: string[];
    status: string;
    approvalTimeStamp?: number;

    getFields: () => any;
}

export interface IRentalTimeFrameExtension extends Document, IRentalTimeFrameExtensionModel {}

const RentalTimeFrameExtensionSchema = new Schema({
    rentalPackageId: {
        type: String,
        required: true
    },
    daysCount: {
        type: Number,
        required: true
    },
    paymentTypes: {
        type: Array,        //String[]
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: RENTAL_TIME_FRAME_EXTENSION_STATUSES,
        default: UNAPPROVED
    },
    approvalTimeStamp: {
        type: Number,
        required: false
    }
}, {
    timestamps: true
});


RentalTimeFrameExtensionSchema.methods.getFields = async function () {

    const payments = await Payment.find({ resourceType: RENTAL_TIME_FRAME_EXTENSION, resourceId: this._id }).sort({ createdAt: -1 }).exec();

    let paymentsData = [];
    let itr = 0;

    if (payments) {
        for (const payment of payments) {
            paymentsData[itr++] = payment.getEnumFields();
        }
    }

    return {
        _id: this._id,
        daysCount: this.daysCount,
        payments: paymentsData,
        status: this.status,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    }
}

const RentalTimeFrameExtension = model<IRentalTimeFrameExtension>('RentalTimeFrameExtension', RentalTimeFrameExtensionSchema);

export default RentalTimeFrameExtension;
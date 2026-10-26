import { Document, model, Schema } from "mongoose";
import { AWAITING_RETRIEVAL, INITIALIZED } from "../../config/constants";
import Order from "./Order";
import RentalPackage from "./RentalPackage";
import Site from "./Site";

interface IDeliveryNoteModel {
    orderId: string;
    customerSign: string;
    customerComment?: string;
    remarks?: string;
    driverSign?: string;

    getFields: () => any;
}

export interface IDeliveryNote extends Document, IDeliveryNoteModel {}

const DeliveryNoteSchema = new Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    customerSign: {
        type: String,
        required: String,
    },
    customerComment: {
        type: String,
        required: false,
    },
    remarks: {
        type: String,
        required: false
    },
    driverSign: {
        type: String,
        required: String
    },


}, {
    timestamps: true
});


DeliveryNoteSchema.methods.getFields = async function () {

    let order: any = await Order.findOne({ _id: this.orderId });

    order = (await order?.getFields()) ?? undefined;
    const site = await Site.findOne({ _id: order.site._id });



    return {
        _id: this._id,
        orderId: this.orderId,
        orderRemarks: order?.remarks ?? undefined,
        site: site?.getFields() ?? undefined,
        customer: order?.customer ?? undefined,
        rentalPackage: order.rentalPackage,
        customerSign: this.customerSign,
        customerComment: this?.customerComment ?? undefined,
        remarks: this?.remarks ?? undefined,
        driverSign: this.driverSign,
        createdAt: this.createdAt
    };
}

DeliveryNoteSchema.pre('save', async function (next) {
    if (this.isNew) {
        const order = await Order.findOne({ _id: this.orderId });

        if (!order) {
            next();
            return;
        }

        order.status = INITIALIZED;

        const rentalPackage = await RentalPackage.findOne({ _id: order.rentalPackageId });
        
        if (!rentalPackage) {
            next();
            return;
        }

        rentalPackage.status = AWAITING_RETRIEVAL;

        rentalPackage.deliveryTimeStamp = (new Date()).getTime();

        await order.save();
        await rentalPackage.save();
    }

    next();
})

const DeliveryNote = model<IDeliveryNote>('DeliveryNote', DeliveryNoteSchema);

export default DeliveryNote;
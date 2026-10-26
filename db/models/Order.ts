import { Document, model, Schema } from "mongoose";
import { ORDER_STATUSES, UNAPPROVED } from "../../config/constants";
import { days2MillSecs, generateRandStr } from "../../helpers";
import OrderUpdateLog from "./OrderUpdateLog";
import Payment from "./payments/Payment";
import RentalPackage from "./RentalPackage";
import Site from "./Site";
import Customer from "./users/Customer";
import User from "./users/User";

interface IOrderModel {
    creatorUserId: string;
    customerId: string;
    ref?: string;
    staffId: string;
    rentalPackageId: string;
    siteId: string;
    paymentTypes: string[];
    status: string;
    deliveryDueDate: Date;
    creationTimeStamp?: number;
    approvalTimeStamp?: number;
    departureTimeStamp?: number;
    remarks?: string;
    discount?: number;
    customerAddress?: string;

    /**
     * has the rental-days duration been exceeded?
     * @returns 
     */
    completed: () => boolean;
    getRawFields: () => any;
    getFields4Export: () => any;
    getFields: () => any;
    getFields4Enum: () => any;
    getLoggableData: () => any;

}

export interface IOrder extends Document, IOrderModel { }

const OrderSchema = new Schema({
    creatorUserId: {
        type: String,
        required: true
    },
    customerId: {
        type: String,
        required: true
    },
    ref: {
        type: String,
        required: false
    },
    staffId: {
        type: String,
        required: true
    },
    rentalPackageId: {
        type: String,
        required: true,
        unique: true
    },
    siteId: {
        type: String,
        required: true
    },
    customerAddress: {
        type: String,
        required: false
    },
    paymentTypes: {
        type: Array,        //String[]
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ORDER_STATUSES,
        default: UNAPPROVED
    },
    deliveryDueDate: {
        type: Date,
        required: true
    },
    creationTimeStamp: {
        type: Number,
        required: false
    },
    approvalTimeStamp: {
        type: Number,
        required: false
    },
    departureTimeStamp: {
        type: Number,
        required: false
    },
    remarks: {
        type: String,
        required: false
    },
    discount: {
        type: Number,
        required: false
    }
}, {
    timestamps: true
});

OrderSchema.pre("save", function (next) {

    if (this.isNew) {
        this.ref = generateRandStr(7);
        this.creationTimeStamp = (new Date()).getTime();

    }

    next();
});

OrderSchema.methods.completed = async function () {
    const rentalPackage = await RentalPackage.findOne({ _id: this.rentalPackageId });

    if (this?.approvalTimeStamp && rentalPackage) {
        const rentalMillSecs = days2MillSecs(rentalPackage.rentalDaysCount);

        const completionTimeStamp = this.approvalTimeStamp + rentalMillSecs;

        if ((new Date()).getTime() > completionTimeStamp) {
            return true;
        }

    }

    return false;
}

OrderSchema.methods.getRawFields = function () {
    return {
        creatorUserId: this.creatorUserId,
        customerId: this.customerId,
        ref: this?.ref ?? undefined,
        staffId: this.staffId,
        rentalPackageId: this.rentalPackageId,
        siteId: this.siteId,
        paymentTypes: this.paymentTypes,
        status: this.status,
        deliveryDueDate: this.deliveryDueDate,
        creationTimeStamp: this?.creationTimeStamp ?? undefined,
        approvalTimeStamp: this?.approvalTimeStamp ?? undefined,
        departureTimeStamp: this?.departureTimeStamp ?? undefined,
        remarks: this?.remarks ?? undefined,
        discount: this?.discount ?? undefined,
        customerAddress: this.customerAddress
    }
}

OrderSchema.methods.getFields4Export = async function () {

    const customer = await Customer.findOne({ _id: this.customerId });
    const staff = await User.findOne({ _id: this.staffId }, "-p");
    const rentalPackage = await RentalPackage.findOne({ _id: this.rentalPackageId });
    const site = await Site.findOne({ _id: this.siteId });
    const payments = await Payment.find({ resourceId: this._id }).sort({ createdAt: -1 }).exec();

    const userThatCreated = await User.findOne({ _id: this.creatorUserId });

    let customerThatCreated = await Customer.findOne({ userId: this.creatorUserId });

    const updates = await OrderUpdateLog.find({ orderId: this._id });
    let updatesData: any[] = [];

    if (updates) {
        for (const update of updates) {
            updatesData = [
                ...updatesData,
                await update.getFields()
            ]
        }
    }


    let orderPayments = [];
    let itr = 0;

    for (const payment of payments) {
        orderPayments[itr++] = payment.getEnumFields();
    }

    return {
        rentalOrderRefNumber: this.ref,
        rentalOrderRequestedOn: (new Date(this.createdAt)).toDateString(),
        ...(rentalPackage ? (await rentalPackage.getFields4Export()) : {}),
        ...(customer ? (await customer?.getFields4Export()) : {}),
        ...(staff?.getFields4Export ?? {}),
        ...(site?.getFields4Export("rentalOrder") ?? {}),
        rentalOrderStatus: this.status,
        rentalOrderRemarks: this.remarks,
        rentalOrderDiscount: this?.discount ?? undefined
    };
}

OrderSchema.methods.getFields = async function () {

    const customer = await Customer.findOne({ _id: this.customerId });
    const staff = await User.findOne({ _id: this.staffId }, "-p");
    const rentalPackage = await RentalPackage.findOne({ _id: this.rentalPackageId });
    // const site = await Site.findOne({ _id: this.siteId });
    const payments = await Payment.find({ resourceId: this._id }).sort({ createdAt: -1 }).exec();

    const userThatCreated = await User.findOne({ _id: this.creatorUserId });

    let customerThatCreated = await Customer.findOne({ userId: this.creatorUserId });

    const updates = await OrderUpdateLog.find({ orderId: this._id });
    let updatesData: any[] = [];

    if (updates) {
        for (const update of updates) {
            updatesData = [
                ...updatesData,
                await update.getFields()
            ]
        }
    }


    let orderPayments = [];
    let itr = 0;

    for (const payment of payments) {
        orderPayments[itr++] = payment.getEnumFields();
    }


    return {
        _id: this._id,
        ref: this.ref,
        creator: customerThatCreated ? await customerThatCreated.getFields() : (userThatCreated ? userThatCreated.getFields() : undefined),
        customer: (customer ? (await customer.getFields()) : undefined),
        customerAddress: this?.customerAddress ?? undefined,
        staff: staff ? staff.getFields() : undefined,
        rentalPackage: rentalPackage ? (await rentalPackage.getFields()) : undefined,
        // site: site ? site.getFields() : undefined,
        deliveryDueDate: this.deliveryDueDate,
        paymentTypes: this.paymentTypes,
        payments: orderPayments,
        status: this.status,
        approvalTimeStamp: this?.approvalTimeStamp ?? null,
        departureTimeStamp: this?.departureTimeStamp ?? null,
        remarks: this?.remarks ?? undefined,
        discount: this?.discount ?? undefined,
        updates: updatesData,
        createAt: this.createdAt,
        updatedAt: this.updatedAt,
    }
}

OrderSchema.methods.getFields4Enum = async function () {
    const customer = await Customer.findOne({ _id: this.customerId });
    const rentalPackage = await RentalPackage.findOne({ _id: this.rentalPackageId });

    const updates = await OrderUpdateLog.find({ orderId: this._id });

    return {
        _id: this._id,
        ref: this.ref,
        customer: customer ? (await customer.getFields4Enum()) : undefined,
        customerAddress: this?.customerAddress ?? undefined,
        rentalPackage: rentalPackage ? (await rentalPackage.getFields4Enum()) : undefined,
        updatesCount: updates?.length ?? 0,
        status: this.status,
        discount: this?.discount ?? undefined,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    }
}

OrderSchema.methods.getLoggableData = async function () {
    const customer = await Customer.findOne({ _id: this.customerId });
    const staff = await User.findOne({ _id: this.staffId }, "-p");
    const rentalPackage = await RentalPackage.findOne({ _id: this.rentalPackageId });
    const payments = await Payment.find({ resourceId: this._id }).sort({ createdAt: -1 }).exec();

    let orderPayments = [];
    let itr = 0;

    for (const payment of payments) {
        orderPayments[itr++] = payment.getEnumFields();
    }


    return {
        _id: this._id,
        ref: this.ref,
        customer: (customer ? (await customer.getFields()) : undefined),
        customerAddress: this?.customerAddress ?? undefined,
        staff: staff ? staff.getFields() : undefined,
        rentalPackage: rentalPackage ? (await rentalPackage.getFields()) : undefined,
        deliveryDueDate: this.deliveryDueDate,
        paymentTypes: this.paymentTypes,
        payments: orderPayments,
        status: this.status,
        creationTimeStamp: this.creationTimeStamp,
        approvalTimeStamp: this?.approvalTimeStamp ?? null,
        departureTimeStamp: this?.departureTimeStamp ?? null,
        remarks: this?.remarks ?? undefined,
        discount: this?.discount ?? undefined,
        createAt: this.createdAt,
        updatedAt: this.updatedAt,
    }
}

const Order = model<IOrder>('Order', OrderSchema);

export default Order;
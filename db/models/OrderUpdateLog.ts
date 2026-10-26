import { Document, model, Schema } from "mongoose";
import Customer from "./users/Customer";
import User from "./users/User";

interface IOrderUpdateLogModel {
    userId: string;
    orderId: string;
    oldData: string;
    newData: string;
    orderFields?: string[];
    packageFields?: string[];
    
    getFields: () => any;
}

export interface IOrderUpdateLog extends Document, IOrderUpdateLogModel {}

const OrderUpdateLogSchema = new Schema({
    userId: {       //The ID of the user responsible for the update
        type: String,
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    oldData: {
        type: String,
        required: true,
        get: function (data: any) {
            try {
                return JSON.parse(data);
            } catch (error) {
                return data;
            }
        },
        set: function (data: any) {
            return JSON.stringify(data);
        }
    },
    newData: {
        type: String,
        required: true,
        get: function (data: any) {
            try {
                return JSON.parse(data);
            } catch (error) {
                return data;
            }
        },
        set: function (data: any) {
            return JSON.stringify(data);
        }
    },
    orderFields: {      ///properties of the order that were updated
        type: Array,
        required: false
    },
    packageFields: {        //properties of the the rental-package that were updated
        type: Array,
        required: false
    }
}, {
    timestamps: true
});

OrderUpdateLogSchema.methods.getFields = async function() {

    const user = await User.findOne({ _id: this.userId });

    let customer = await Customer.findOne({ userId: this.userId });

    return {
        _id: this._id,
        editor: customer ? await customer.getFields() : (user ? user.getFields(): {}),
        oldData: this.oldData,
        newData: this.newData,
        orderFields: this?.orderFields ?? undefined,
        packageFields: this?.packageFields ?? undefined,
        createdAt: this.createdAt
    }
}

const OrderUpdateLog = model<IOrderUpdateLog>("OrderUpdateLog", OrderUpdateLogSchema);

export default OrderUpdateLog;
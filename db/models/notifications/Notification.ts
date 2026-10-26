import { Document, model, Schema } from "mongoose";
import { FAILURE, SUCCESS, WARNING } from "../../../config/constants";

interface INotifcationModel {
    msg: string;
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    orderId?: string;
    servicePlanId?: string;
    targetUserId?:  string;
    targetRole: string;
    indicates: string;
    hideFrom?: string[];

    getFields: () => any;
}

export interface INotification extends Document, INotifcationModel {}

const NotificationSchema = new Schema({
    msg: {
        type: String,
        required: true
    },
    actorUserId: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true
    },
    resourceType: {
        type: String,
        required: true
    },
    resourceId: {
        type: String,
        required: true
    },
    orderId: {
        type: String,
        required: false
    },
    servicePlanId: {
        type: String,
        required: false
    },
    targetUserId: {
        type: String,
        required: false
    },
    targetRole: {
        type: String,
        required: false
    },
    indicates: {
        type: String,
        required: true,
        enum: [SUCCESS, WARNING, FAILURE]
    },
    hideFrom: {         //The array of user-ids of users--who are to get the notifications normally--to hide this notification from, because they've seen already. If the number is element is equal to the number of users to get the notifiations, delete this notification.
        type: Array,
        required: false
    }
}, {
    timestamps: true
});

NotificationSchema.methods.getFields = function () {
    return {
        _id: this._id,
        msg: this.msg,
        actorUserId: this.actorUserId,
        action: this.action,
        resourceType: this.resourceType,
        resourceId: this.resourceId,
        orderId: this?.orderId ?? undefined,
        servicePlanId: this?.servicePlanId ?? undefined,
        indicates: this.indicates,
        createdAt: this.createdAt
    }
}

const Notification = model<INotification>('Notification', NotificationSchema);

export default Notification;
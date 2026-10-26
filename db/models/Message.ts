import { Document, model, Schema } from "mongoose";
import { MESSAGE_TARGETS, RENTAL_ITEM_ATTACHMENT_TARGET, RENTAL_ITEM_TARGET, USER_TARGET } from "../../config/constants";
import RentalItem from "./RentalItem";
import RentalItemAttachment from "./RentalItemAttachment";
import ServiceResource from "./ServiceResource";
import User from "./users/User";

interface IMessageModel {
    parentId?: string;
    senderUserId: string;
    receiverUserId: string;
    targetType: string;
    targetId: string;
    content: string;
    deliveredAt?: number;
    readAt?: number;

    getFields: () => any;
    deduceReceiverUserId: () => string;     //returns the user-ID of the user meant to read this message
}

export interface IMessage extends IMessageModel, Document { }

const MessageSchema = new Schema({
    parentId: {
        type: String,
        required: false
    },
    senderUserId: {
        type: String,
        required: true
    },
    receiverUserId: {
        type: String,
        required: false,
    },
    targetType: {
        type: String,
        required: true,
        enum: MESSAGE_TARGETS
    },
    targetId: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true
    },
    deliveredAt: {      //timestamp
        type: Number,
        required: false
    },
    readAt: {
        type: Number,
        required: false
    }
}, {
    timestamps: true
});

MessageSchema.methods.deduceReceiverUserId = async function () {
    let id = '';

    switch (this.targetType) {
        case USER_TARGET:
            id = this.targetId;
            break;
        case RENTAL_ITEM_TARGET:
            const rentalItem = await RentalItem.findOne({ _id: this.targetId });

            if (rentalItem) {
                id = rentalItem.staffId
            }
            break;
        case RENTAL_ITEM_ATTACHMENT_TARGET:
            const attachment = await RentalItemAttachment.findOne({ _id: this.targetId });
            const serviceResource = await ServiceResource.findOne({ _id: attachment?.serviceResourceId ?? "" });
            const rentalItem2 = await RentalItem.findOne({ _id: serviceResource?.rentalItemId ?? "" });

            if (rentalItem2) {
                id = rentalItem2.staffId;
            }
            break;
        default:
            break;
    }

    console.log('ID: ', id);

    return id;
}

MessageSchema.pre('save', async function () {
    if (this.isNew) {

        let receiverUserId = '';

        switch (this.targetType) {
            case USER_TARGET:
                receiverUserId = this.targetId;
                break;
            case RENTAL_ITEM_TARGET:
                const rentalItem = await RentalItem.findOne({ _id: this.targetId });

                if (rentalItem) {
                    receiverUserId = rentalItem.staffId
                }
                break;
            case RENTAL_ITEM_ATTACHMENT_TARGET:
                const attachment = await RentalItemAttachment.findOne({ _id: this.targetId });
                const serviceResource = await ServiceResource.findOne({ _id: attachment?.serviceResourceId ?? "" });
                const rentalItem2 = await RentalItem.findOne({ _id: serviceResource?._id ?? "" });

                if (rentalItem2) {
                    receiverUserId = rentalItem2.staffId;
                }
                break;
            default:
                break;
        }

        this.receiverUserId = (receiverUserId !== '') ? receiverUserId : undefined;
    }
});

MessageSchema.methods.getFields = async function () {
    const sender = await User.findOne({ _id: this.senderUserId });
    const receiver = await User.findOne({ _id: this.receiverUserId });

    const children = await Message.find({ parentId: this._id.toString() });
    let childrenData: any[] = [];

    if (children) {
        for (const child of children) {
            childrenData = [
                ...childrenData,
                await child.getFields()
            ]
        }
    }

    return {
        _id: this._id.toString(),
        sender: await sender?.getFields() ?? undefined,
        receiver: await receiver?.getFields() ?? undefined,
        content: this.content,
        createdAt: this.createdAt,
        children: (childrenData.length > 0) ? childrenData : undefined
    }
}

const Message = model<IMessage>('Message', MessageSchema);

export default Message;
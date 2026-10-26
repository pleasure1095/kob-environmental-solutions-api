import { Document, model, Schema } from "mongoose";
import { CUSTOM_TYPES } from "../../config/constants";

export interface ICustomFieldModel {

    ownerId: string;
    ownerResourceType: string;

    name: string;
    type: string;
    required: boolean;
}

export interface ICustomField extends Document, ICustomFieldModel {}

const CustomFieldSchema = new Schema({

    ownerId: {
        type: String,
        required: true
    },

    ownerResourceType: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: CUSTOM_TYPES
    },
    required: {
        type: Boolean,
        required: true,
        default: false
    }
});

const CustomField = model<ICustomField>("CustomField", CustomFieldSchema);

export default CustomField;

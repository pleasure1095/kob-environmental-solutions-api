import { Document, model, Schema } from "mongoose";
import { RESOURCES_TYPES } from "../../config/constants";

interface IValue4CustomFieldModel {
    ownerId: string;
    ownerResourceType: string;
    
    customFieldId: string;

    stringValue?: string;
    filePathValue?: string;
    numberValue?: number;
    arrayValue?: any[];
}

export interface IValue4CustomField extends Document, IValue4CustomFieldModel {}

const Value4CustomFieldSchema = new Schema({

    ownerId: {
        type: String,
        reqiured: true,
    },

    //The Owner is a Resource; but what type of Resource?
    ownerResourceType: {
        type: String,
        required: true,
        enum: RESOURCES_TYPES
    },

    customFieldId: {
        type: String,
        required: true,
    },

    numberValue: {
        type: String,
        required: false
    },
    stringValue: {
        type: String,
        required: false
    },
    filePathValue: {
        type: String,
        required: false
    },
    arrayValue: {
        type: String,
        required: false
    }
});

Value4CustomFieldSchema.index({ownerId: 1, customFieldId: 1}, {unique: true});      //The owner of this Value can only have one value for a CustomField


const Value4CustomField = model<IValue4CustomField>("Value4CustomField", Value4CustomFieldSchema);

export default Value4CustomField;
import { Document, Schema, model } from "mongoose";

interface IRoleFields {
    _id: string;
    name: string;
    parentId: string;
}

interface IRoleModel {
    name: string;
    parentId: string;

    getFields: () => IRoleFields;
}

export interface IRole extends Document, IRoleModel {}

const RoleSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    parentId: {     //The ID of the Role from which this role Branced-off (e.g. Worker Branced off User)
        type: String,
        required: false
    }
});

RoleSchema.methods.getFields = function() {
    return {
        _id: this._id,
        name: this.name,
        parentId: this.parentId
    } as IRoleFields;
}

const Role = model<IRole>("Role", RoleSchema);

export default Role;
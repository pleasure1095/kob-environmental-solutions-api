import { Document, model, Schema } from "mongoose";

interface IPropActions {
    prop: string;       //if this is the model: {name: string, age: number}. 'name' and 'age' are props
    actions: string[];
}

export interface IAbility {
    modelName: string;
    actions: string[];
    actionsNotPerformable?: string[];
    propsActions: IPropActions[];
}

interface IPrivilegeModel {
    name: string;
    roleId: string;
    userId: string;
    abilities: IAbility[];
}

export interface IPrivilege extends IPrivilegeModel, Document {}

const PrivilegeSchema = new Schema({
    name: {
        type: String,
        required: false,
    },
    roleId: {
        type: String,
        required: false
    },
    userId: {
        type: String,
        required: false
    },
    abilities: {
        type: Array,
        required: true
    }
});

const Privilege = model<IPrivilege>("Privilege", PrivilegeSchema);

export default Privilege;
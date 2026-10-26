import { Document, model, Schema } from "mongoose";

interface IUnitModel {
    creatorUserId?: string;
    name: string;

    getFields: () => any;
}

export interface IUnit extends Document, IUnitModel {}

const UnitSchema = new Schema({
    creatorUserId: {
        type: String,
        required: false
    },
    name: {
        type: String,
        required: true
    }
});

UnitSchema.methods.getFields = function () {
    return {
        _id: this._id.toString(),
        creatorUserId: this?.creatorUserId ?? undefined,
        name: this.name
    }
}

const Unit = model<IUnit>("Unit", UnitSchema);

export default Unit;
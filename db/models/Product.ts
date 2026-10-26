import { Document, Schema, model } from "mongoose";

interface IProductFields {
    _id: string;
    name: string;
    imgSrc?: string;
    categoryId: string;
    unit?: string;
    unitPrice: number;
    deletedAt?: number;
}

interface IProductModel {
    name: string;
    imgSrc?: string;
    categoryId: string;
    unit?: string;
    unitPrice: number;
    deletedAt?: number;

    getFields: () => IProductFields;
}

export interface IProduct extends Document, IProductModel {}

const ProductSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    imgSrc: {
        type: String,
        required: false,
        unique: false,
        default: 'images/notexisting.jpg'
    },
    categoryId: {
        type: String,
        required: true,
    },
    unit: {
        type: String,
        required: false,
    },
    unitPrice: {
        type: Number,
        required: true
    },
    deletedAt: {
        type: Number,
        required: false
    }
}, {
    timestamps: true
});

ProductSchema.methods.getFields = async function() {
    return {
        _id: this._id,
        name: this.name,
        imgSrc: this?.imgSrc ?? undefined,
        categoryId: this.categoryId,
        unit: this?.unit ?? undefined,
        unitPrice: this.unitPrice,
        deletedAt: this?.deletedAt ?? undefined
    } as IProductFields;
}

const Product = model<IProduct>("Product", ProductSchema);

export default Product;
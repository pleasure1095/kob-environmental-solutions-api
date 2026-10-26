import { Document, Schema, model } from "mongoose";

interface IProductCategoryFields {
    _id: string;
    name: string;
    parentId: string;
    imgSrc?: string;
    deletedAt?: number;
}

interface IProductCategoryModel {
    name: string;
    parentId: string;
    imgSrc?: string;
    deletedAt?: number;

    getFields: () => IProductCategoryFields;
}

export interface IProductCategory extends Document, IProductCategoryModel {}

const ProductCategorySchema = new Schema({
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
    parentId: {     //The ID of the ProductCategory from which this ProductCategory Branced-off (e.g. Worker Branced off User)
        type: String,
        required: false
    },
    deletedAt: {
        type: Number,
        required: false
    }
}, {
    timestamps: true
});

ProductCategorySchema.methods.getFields = function() {
    return {
        _id: this._id,
        name: this.name,
        imgSrc: this?.imgSrc ?? undefined,
        parentId: this.parentId,
        deletedAt: this?.deletedAt ?? undefined
    } as IProductCategoryFields;
}

const ProductCategory = model<IProductCategory>("ProductCategory", ProductCategorySchema);

export default ProductCategory;
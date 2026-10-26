import { Document, model, Schema } from "mongoose";
import { ARTICLE, COURSE, RECOREDED_WORKSHOP, RENTAL_ITEMS_TYPES } from "../../config/constants";
import RentalItemAttachment from "./RentalItemAttachment";
import ServiceResource from "./ServiceResource";

interface IRentalItemModel {
    name: string;
    type: string;
    description: string;
    virtualLink?: string;
    activationDate?: string;
    deactivationDate?: string,
    staffId: string;
    imgSrc?: string;
    count: string;
    unavailableCount: number;
    pricePerDay: number;
    deletedAt?: number;

    countAvailable: () => number;
    getRentPrice: (itemCount: number, daysCount: number) => number;
    getFields4Export: () => any;
    getFields: () => any;
}

export interface IRentalItem extends Document, IRentalItemModel { }

const RentalItemSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        requied: true,
        enum: RENTAL_ITEMS_TYPES,
        default: COURSE
    },
    description: {
        type: String,
        required: true
    },
    virtualLink: {
        type: String,
        required: false
    },
    activationDate: {
        type: String,
        required: false
    },
    deactivationDate: {
        type: String,
        required: false
    },
    staffId: {
        type: String,
        required: true
    },
    imgSrc: {
        type: String,
        required: false,
        unique: false,
        default: 'images/notexisting.jpg'
    },
    count: {
        type: Number,
        required: true,
    },
    unavailableCount: {
        type: Number,
        required: true,
        default: 0
    },
    pricePerDay: {
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

RentalItemSchema.methods.countAvailable = function () {
    const ans = this.count - this.unavailableCount;
}

RentalItemSchema.methods.getRentPrice = function (itemCount: number, daysCount: number) {
    return ((this.pricePerDay * itemCount) * daysCount);
}


RentalItemSchema.methods.getFields4Export = function () {
    return {
        rentalItemName: this.name,
        rentalItemTotalCount: this.count,
        rentalItemUnavailableCount: this.unavailableCount,
        rentalItemAvailableCount: this.countAvailable(),
        rentalItemPricePerDay: this.pricePerDay,
    }
}

RentalItemSchema.methods.deduceRating4ThisItem = function () {
    //TODO: find the average of all the ratings (made by members) of this rental item


    return 4.5;
}

RentalItemSchema.methods.constructCourseSections = async function () {

    let data: any[] = [];

    const sections = await ServiceResource.find({ rentalItemId: this._id, deletedAt: undefined });

    if (sections) {

        for (const section of sections) {

            let sectionData: any = {
                ...section.getFields()
            }

            const lectures = await RentalItemAttachment.find({ serviceResourceId: section._id.toString(), deletedAt: undefined });

            if (lectures) {

                let lecturesData: any[] = [];

                for (const lecture of lectures) {
                    lecturesData = [...lecturesData, lecture.getFields()]
                }

                sectionData = {
                    ...sectionData,
                    lectures: lecturesData
                }
            }

            data = [
                ...data,
                sectionData
            ]

        }
    }

    return data;
}

RentalItemSchema.methods.getFields = async function () {
    return {
        _id: this._id,
        name: this.name,
        description: this.description,
        virtualLink: this?.virtualLink ?? undefined,
        activationDate: this?.activationDate ?? undefined,
        deactivationDate: this?.deactivationDate ?? undefined,
        type: this.type,
        sections: ((this.type === COURSE) || (this.type === ARTICLE) || (this.type === RECOREDED_WORKSHOP)) ? (await this.constructCourseSections()) : undefined,
        imgSrc: this.imgSrc,
        count: this.count,
        unavailableCount: this.unavailableCount,
        availableCount: this.countAvailable(),
        pricePerDay: this.pricePerDay,
        rating: this.deduceRating4ThisItem(),
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        deletedAt: this?.deletedAt ?? undefined
    }
}


const RentalItem = model<IRentalItem>('RentalItem', RentalItemSchema);

export default RentalItem;
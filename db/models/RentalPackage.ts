import { Document, model, Schema } from "mongoose";
import { APPROVED, AWAITING_APPROVAL, RENTAL_PACKAGE_STATUSES } from "../../config/constants";
import RentalItem from "./RentalItem";
import RentalTimeFrameExtension from "./RentalTimeFrameExtension";
import User, { IUser } from "./users/User";

interface IRentalPackageModel {
    rentalItems: { _id: string, count: number }[];
    rentalDaysCount: number;
    transportationFee: number;
    status: string;
    deliveryDriverId?: string;
    deliveryTimeStamp?: number;
    retrievalDriverId?: string;
    retrievalTimeStamp?: number;

    getRawFields: () => any;
    getTotalPrice: (daysCount?: number | null, noTransportationFee?: boolean | null) => number;
    getFields4Export: () => any;
    getFields: () => any;
    getRentalDaysCount: () => number;
    getFields4Enum: () => any;


    updatePackageUsingData: (data: any) => void;
}

export interface IRentalPackage extends Document, IRentalPackageModel { }

const RentalPackageSchema = new Schema({
    rentalItems: {
        type: Array,     //{_id: string, count: number}[]
        required: true
    },
    rentalDaysCount: {
        type: Number,
        required: true
    },
    transportationFee: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: RENTAL_PACKAGE_STATUSES,
        default: AWAITING_APPROVAL
    },
    deliveryDriverId: {
        type: String,
        required: false
    },
    deliveryTimeStamp: {
        type: Number,
        required: false
    },
    retrievalDriverId: {
        type: String,
        required: false
    },
    retrievalTimeStamp: {
        type: Number,
        required: false
    }
}, {
    timestamps: true
});

RentalPackageSchema.methods.getRawFields = function() {
    return {
        rentalItems: this.rentalItems,
        rentalDaysCount: this.rentalDaysCount,
        transportationFee: this.transportationFee,
        deliveryDriverId: this?.deliveryDriverId ?? undefined,
        deliveryTimeStamp: this?.deliveryTimeStamp ?? undefined,
        retrievalDriverId: this?.retrievalDriverId ?? undefined,
        retrievalTimeStamp: this?.retrievalTimeStamp ?? undefined
    }
}

RentalPackageSchema.methods.getTotalPrice = async function (daysCount = null, noTransportationFee = false) {
    let totalPrice = noTransportationFee ? 0 : this.transportationFee;

    for (const item of this.rentalItems) {
        const rentalItem = await RentalItem.findOne({ _id: item._id });

        if (!rentalItem) {
            //TODO: Put a proper logic: throw exception and handle
            totalPrice = 0;
            break;
        }

        totalPrice += rentalItem.getRentPrice(item.count, daysCount ?? this.rentalDaysCount);
    }

    return totalPrice;
}


RentalPackageSchema.methods.getFields4Export = async function () {

    const rentalItems = [];
    let itr = 0;

    for (const rentalItem of this.rentalItems) {
        const item = await RentalItem.findOne({ _id: rentalItem._id });


        if (item) {

            rentalItems[itr++] = {
                ...(item.getFields4Export()),
                count: rentalItem.count     //overrides the real count(total number), because the Rental Package only needs to be aware of the number of this Item it contains
            }
        } else {
            throw new Error('In RentalPackageSchema.getFields: something went wrong. Please try again.')
        }
    }

    let deliveryDriver: IUser | null = null;


    if (this?.deliveryDriverId) {
        try {
            deliveryDriver = await User.findOne({ _id: this.deliveryDriverId }, "-password");
        } catch (err) {
            throw new Error(`in RentalPackageSchema.getFields: ${err}`);
        }
    }

    let retrievalDriver: IUser | null = null;

    if (this?.retrievalDriverId) {
        try {
            retrievalDriver = await User.findOne({ _id: this.retrievalDriverId }, "-password");
        } catch (err) {
            throw new Error(`in RentalPackageSchema.getFields: ${err}`);
        }
    }

    const timeFrameExtensions = await RentalTimeFrameExtension.find({ rentalPackageId: this._id }).sort({ createdAt: -1 }).exec();

    let timeExtensionsData = [];
    let itr1 = 0;

    for (const timeExtension of timeFrameExtensions) {
        timeExtensionsData[itr1++] = {
            ...(await timeExtension.getFields()),
            cost: await this.getTotalPrice(timeExtension.daysCount, true)
        };
    }

    let rentalDaysCount = this.rentalDaysCount;
    const timeExtensions = await RentalTimeFrameExtension.find({ rentalPackageId: this._id, status: APPROVED });

    if (timeExtensions) {
        for (const timeExt of timeExtensions) {
            rentalDaysCount += timeExt.daysCount;
        }
    }


    return {
        ...rentalItems,
        originalRentalDaysCount: this.rentalDaysCount,
        rentalDaysCount,
        transportationFee: this.transportationFee,
        status: this.status,
        ...(deliveryDriver?.getFields4Export("deliveryDriver") ?? {}),
        deliveryDate: this?.deliveryTimeStamp ? (new Date(this?.deliveryTimeStamp)).toDateString() : null,
        ...(retrievalDriver?.getFields4Export("returnDriver") ?? {}),
        returnDate: this?.retrievalTimeStamp ? (new Date(this?.retrievalTimeStamp)).toDateString() : null,
        totalCost: await this.getTotalPrice(),
    }
}

RentalPackageSchema.methods.getRentalDaysCount = async function () {
    let rentalDaysCount = this.rentalDaysCount;
    const timeExtensions = await RentalTimeFrameExtension.find({ rentalPackageId: this._id, status: APPROVED });

    if (timeExtensions) {
        for (const timeExt of timeExtensions) {
            rentalDaysCount += timeExt.daysCount;
        }
    }

    return rentalDaysCount;
}

RentalPackageSchema.methods.getFields4Enum = async function () {
    const rentalItems = [];
    let itr = 0;

    for (const rentalItem of this.rentalItems) {
        const item = await RentalItem.findOne({ _id: rentalItem._id });

        if (item && (await item.getFields())) {
            rentalItems[itr++] = {
                ...(await item.getFields()),
                count: rentalItem.count     //overrides the real count(total number), because the Rental Package only needs to be aware of the number of this Item it contains
            }
        } else {
            throw new Error('In RentalPackageSchema.getFields: something went wrong. Please try again.')
        }
    }



    return {
        _id: this._id,
        rentalItems,
        totalCost: await this.getTotalPrice(),
        rentalDaysCount: await this.getRentalDaysCount(),
        deliveryTimeStamp: this?.deliveryTimeStamp ?? ''
    }
}


RentalPackageSchema.methods.getFields = async function () {

    const rentalItems = [];
    let itr = 0;

    for (const rentalItem of this.rentalItems) {
        const item = await RentalItem.findOne({ _id: rentalItem._id });

        if (item) {
            rentalItems[itr++] = {
                ...(await item.getFields()),
                count: rentalItem.count     //overrides the real count(total number), because the Rental Package only needs to be aware of the number of this Item it contains
            }
        } else {
            throw new Error('In RentalPackageSchema.getFields: something went wrong. Please try again.')
        }
    }

    let deliveryDriver = null;


    if (this?.deliveryDriverId) {
        try {
            deliveryDriver = await User.findOne({ _id: this.deliveryDriverId }, "-password");
        } catch (err) {
            throw new Error(`in RentalPackageSchema.getFields: ${err}`);
        }
    }

    let retrievalDriver = null;

    if (this?.retrievalDriverId) {
        try {
            retrievalDriver = await User.findOne({ _id: this.retrievalDriverId }, "-password");
        } catch (err) {
            throw new Error(`in RentalPackageSchema.getFields: ${err}`);
        }
    }

    const timeFrameExtensions = await RentalTimeFrameExtension.find({ rentalPackageId: this._id }).sort({ createdAt: -1 }).exec();

    let timeExtensionsData = [];
    let itr1 = 0;

    for (const timeExtension of timeFrameExtensions) {
        timeExtensionsData[itr1++] = {
            ...(await timeExtension.getFields()),
            cost: await this.getTotalPrice(timeExtension.daysCount, true)
        };
    }

    let rentalDaysCount = this.rentalDaysCount;
    const timeExtensions = await RentalTimeFrameExtension.find({ rentalPackageId: this._id, status: APPROVED });

    if (timeExtensions) {
        for (const timeExt of timeExtensions) {
            rentalDaysCount += timeExt.daysCount;
        }
    }


    return {
        _id: this._id,
        rentalItems,
        originalDaysCount: this.rentalDaysCount,
        rentalDaysCount,
        timeFrameExtensions: timeExtensionsData,
        transportationFee: this.transportationFee,
        status: this.status,
        deliveryDriver,
        deliveryTimeStamp: this?.deliveryTimeStamp ?? null,
        retrievalDriver,
        retrievalTimeStamp: this?.retrievalTimeStamp ?? null,
        totalCost: await this.getTotalPrice(),
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    }
}

RentalPackageSchema.methods.updatePackageUsingData = async function (data: any) {

    let rentalItems: any[] = [];

    for (const rentalItemData of data.rentalItems) {
        rentalItems = [...rentalItems, {
            _id: rentalItemData._id,
            count: rentalItemData.count
        }]
    }

    const rentalPackageFields = ["rentalItems", "rentalDaysCount", "transportationFee"];

    for (const packageField of rentalPackageFields) {
        if (data[packageField]) {
            this[packageField as any] = data[packageField];
        }
    }

}

const RentalPackage = model<IRentalPackage>('RentalPackage', RentalPackageSchema);

export default RentalPackage;   
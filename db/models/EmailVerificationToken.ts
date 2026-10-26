// EmailVerificationToken is used to verify that a request (to this API) was made from within an e-mail (which was mailed from this API)

import { Document, model, Schema } from "mongoose";
import { EMAIL_TOKEN_TYPES, EMAIL_VERIFICATION_TOKEN } from "../../config/constants";

const validSeconds = 60;

interface IEmailVerificationTokenModel {
    userId: string;
    type: string;
    value: string;
    validSeconds?: number;

    canExpire: () => boolean;
    getValidSecondsLeft: () => number;
    hasExpired: () => boolean;
}

export interface IEmailVerificationToken extends Document, IEmailVerificationTokenModel { }


const EmailVerificationTokenSchema = new Schema({
    userId: {
        type: String,
        unique: false
    },
    type: {
        type: String,
        required: true,
        enum: EMAIL_TOKEN_TYPES,
        default: EMAIL_VERIFICATION_TOKEN
    },
    value: {
        type: String,
        unique: true
    },
    validSeconds: {
        type: Number,
        required: false
    }
}, {
    timestamps: true
});

EmailVerificationTokenSchema.pre("save", function (next) {

    let canExpire = false;

    switch (this.type) {
        case EMAIL_VERIFICATION_TOKEN:
            canExpire = true;
            break;
        default:
            canExpire = false;
            break;
    }

    if (this.isNew && canExpire && !this.validSeconds) {

        if (!this?.validSeconds) {
            this.validSeconds = 60 * 5;     //5 minutes
        }

    }

    next();
});

EmailVerificationTokenSchema.methods.canExpire = function () {
    switch (this.type) {
        case EMAIL_VERIFICATION_TOKEN:
            return true;
        default:
            return false;
    }
}

EmailVerificationTokenSchema.methods.getValidSecondsLeft = function () {

    if (this.canExpire()) {

        let validMillSecs = (this?.validSeconds ?? validSeconds) * 1000;

        let millSecs = (new Date()).getTime() - (new Date(this.createdAt)).getTime();
        millSecs = validMillSecs - millSecs;

        if (millSecs > 0) {
            return Math.ceil(millSecs / 1000);
        } else {
            return 0;
        }

    }

    return 10000000
}

EmailVerificationTokenSchema.methods.hasExpired = function () {
    if (this.canExpire()) {
        return this.getValidSecondsLeft() ? false : true;
    }

    return false;
}

const EmailVerificationToken = model<IEmailVerificationToken>('EmailVerificationToken', EmailVerificationTokenSchema);

export default EmailVerificationToken;


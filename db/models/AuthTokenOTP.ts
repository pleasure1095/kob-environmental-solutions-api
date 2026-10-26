import { Document, model, Schema } from "mongoose";
import { OTP_TYPES } from "../../config/constants";

interface IAuthTokenOTPModel {
    authTokenId: string;        //The AuthToken that this 2FA-OTP belongs to
    type: string;
    value: string;

    hasExpired: (validSecondsCount: number) => boolean;
    getValidSecondsLeft: (validSecondsCount: number) => number;
}

export interface IAuthTokenOTP extends Document, IAuthTokenOTPModel { }

const AuthTokenOTPSchema = new Schema({
    authTokenId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: OTP_TYPES
    },
    value: {
        type: String
    }
}, {
    timestamps: true
});

AuthTokenOTPSchema.index({ authTokenId: 1, type: 1 }, { unique: true });


AuthTokenOTPSchema.methods.hasExpired = function (validSecondsCount: number = 60) {
    const creationTimeStamp = (new Date(this.createdAt)).getTime();
    const minuteInMillSecs = 1000 * validSecondsCount;
    const expiryTimeStamp = creationTimeStamp + minuteInMillSecs;

    if ((new Date()).getTime() > expiryTimeStamp) {
        return true;
    }

    return false;
}

AuthTokenOTPSchema.methods.getValidSecondsLeft =  function (validSecondsCount: number) {
    const validMillSecs = validSecondsCount * 1000;

    let millSecs = (new Date()).getTime() - (new Date(this.createdAt)).getTime();
    millSecs = validMillSecs - millSecs;

    if (millSecs > 0) {
        return Math.ceil(millSecs / 1000);
    } else {
        return 0;
    }
}

const AuthTokenOTP = model<IAuthTokenOTP>("AuthTokenOTP", AuthTokenOTPSchema);

export default AuthTokenOTP;
import { Document, model, Schema } from "mongoose";

interface IAuthTokenModel {
    userId: string;
    value: string;
    email2FADone: boolean;
    authenticator2FADone: boolean;
    validTill: number;      //timestamp of expiration

    getFields42FA: () => any;
    getFields: () => any;
}

export interface IAuthToken extends Document, IAuthTokenModel {}

const AuthTokenSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true,
        unique: true
    },
    email2FADone: {
        type: Boolean,
        required: true,
        default: false
    },
    authenticator2FADone: {
        type: Boolean,
        required: true,
        default: false
    },
    validTill: {
        type: Number,
        required: true,
    }
}, {
    timestamps: true
});

AuthTokenSchema.methods.getFields = function() {
    return {
        authToken: this.value,
        email2FADone: this.email2FADone,
        authenticator2FADone: this.authenticator2FADone,
        authTokenValidTill: this.validTill,
        authStartedAt: ( new Date(this.createdAt)).getTime(),
        authCompletedAt: (new Date(this.updatedAt)).getTime()
    }
};


AuthTokenSchema.methods.getFields42FA = function () {
    return {
        authToken: this.value,
        email2FADone: this.email2FADone,
        authenticator2FADone: this.authenticator2FADone
    }
}

const AuthToken = model<IAuthToken>("AuthToken", AuthTokenSchema);

export default AuthToken;
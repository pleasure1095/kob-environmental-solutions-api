import { Document, model, Schema } from "mongoose";

interface IAuthenticatorSecretModel {
    userId: string;
    secret: string;
    qrCodeData: string;
    confirmedAt: number;        //confirmation timestamp;

    getFields: () => any;
}

interface IAuthenticatorSecret extends Document, IAuthenticatorSecretModel {}

const AuthenticatorsSecretsChema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    secret: {
        type: String,
        required: true
    },
    qrCodeData: {
        type: String,
        required: true,
        unique: true
    },
    confirmedAt: {      //the  time the concerned user was able to confirm set-up by successfully submitting the first valid O.T.P
        type: Number,
        required: false
    }
}, {
    timestamps: true
});

AuthenticatorsSecretsChema.methods.getFields = function () {
    return {
        _id: this._id,
        userId: this.userId,
        secret: this.secret,
        qrCodeData: this.qrCodeData,
        confirmedAt: this?.confirmedAt ?? undefined,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    }
}

const AuthenticatorSecret = model<IAuthenticatorSecret>("AuthenticatorSecret", AuthenticatorsSecretsChema);

export default AuthenticatorSecret;

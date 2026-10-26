import { Document, Schema, model } from "mongoose";
import { ADMIN, GENDERS, SME_OWNER_STATUSES, SME_OWNER_UNVERIFIED, SUPER_ADMIN, USER_ACCOUNT_STATUSES, USER_ACTIVE } from "../../../config/constants";
import * as bcrypt from "bcryptjs";
import * as speakEasy from 'speakeasy';
import * as qrCode from 'qrcode';
import AuthenticatorSecret from "../AuthenticatorSecret";
import Role from "../Role";
import RentalItemSession from "../RentalItemSession";


interface IUserModel {
    roleId: string;

    privilegeId?: string;

    specialRole?: string;
    about?: string;
    imgSrc?: string;
    firstName: string;
    lastName: string;
    otherName?: string;
    nickName?: string;
    preferredName?: string;
    dateOfBirth?: string;
    gemder?: string;
    email: string;
    emailVerifiedAt?: number;
    phone: string;
    phoneVerifiedAt?: number;
    mobile?: string;
    mobileVerifiedAt?: number;
    password: string;
    usesEmail2FA: boolean;
    usesAuthenticator2FA: boolean;
    status: string;
    smeOwnerStatus: string;
    deletedAt?: number;
    favouriteRentalItemsIds?: string[];

    isAdmin: () => boolean;
    getFields4EmailToken: () => any;
    updatePassword: (newPassword: string) => void;
    uses2FA: () => boolean;
    getFields42FA: () => any;
    getFields: () => any;
    getFields4Enum: () => any;

    getFields4Export: (role: string | null) => any;
}

export interface IUser extends Document, IUserModel {
    passwordMatches: (user: IUser, testedPassword: string) => boolean;

}

const UserSchema = new Schema({

    /* Responsibilities Information Start*/
    roleId: {
        type: String,
        required: true
    },

    privilegeId: {
        type: String,
        required: false
    },
    /* Responsibilities Information End*/

    /* Personal Information Start */
    specialRole: {
        type: String,
        required: false
    },
    about: {
        type: String,
        required:  false
    },
    imgSrc: {
        type: String,
        required: false
    },
    firstName: {
        type: String,
        reqiured: true
    },
    lastName: {
        type: String,
        required: true
    },
    otherName: {
        type: String,
        required: false,
    },
    nickName: {
        type: String,
        required: false
    },
    preferredName: {
        type: String,
        required: false
    },
    dateOfBirth: {
        type: Date,
        required: false
    },
    gender: {
        type: String,
        required: false,
        enum: GENDERS
    },
    /* Personal Information End */

    /*Contact information Start */
    email: {
        type: String,
        required: true
    },
    emailVerifiedAt: {      //The timestamp when this email-address was verified
        type: Number,
        required: false
    },
    phone: {
        type: String,
        required: true,
        // unqiue: true     //TODO: before you enable this, make sure this fields is validated for user registerations by admins and staffs
    },
    phoneVerifiedAt: {      //The timestamp when this phone-number was verified
        type: Number,
        required: false
    },
    mobile: {
        type: String,
        required: false
    },
    mobileVerifiedAt: {     //The timestamp when this mobile-number was verified
        type: Number,
        required: false
    },
    /*Contact information End */

    /*Address Information Start */

    /*Address Information End */


    /**Authentication Information Start */
    password: {
        type: String,
        required: true
    },
    usesEmail2FA: {     //This user uses Email for 2 Factor Authentication
        type: Boolean,
        required: true,
        default: false
    },
    usesAuthenticator2FA: {     //This user uses Authenticator Apps (e.g. Google Authenticator) for 2 Factor Authentication
        type: Boolean,
        required: true,
        default: false
    },
    /**Authentication Information End */

    /** House-keeping Information Start */
    status: {
        type: String,
        required: true,
        enum: USER_ACCOUNT_STATUSES,
        default: USER_ACTIVE
    },
    smeOwnerStatus: {
        type: String,
        required: true,
        enum: SME_OWNER_STATUSES,
        default: SME_OWNER_UNVERIFIED
    },
    deletedAt: {        //The timestamp when this user was marked as deleted
        type: Number,
        required: false
    },
    /** House-keeping Information End */


    /** others */
    favouriteRentalItemsIds: {
        type: Array,        //string[]; an array of the IDs of the rental Items that have been favourited by this user
        required: false
    }
    /** others End */
}, {
    timestamps: true
});

UserSchema.pre("save", function (next) {

    if (this.isNew) {
        const salt = bcrypt.genSaltSync(5);

        this.password = bcrypt.hashSync(this.password, salt);
    }

    next();
});

UserSchema.methods.passwordMatches = (user: IUser, testedPassword: string) => {
    return bcrypt.compareSync(testedPassword, user.password);
};

UserSchema.methods.updatePassword = function (newPassword: string) {
    const salt = bcrypt.genSaltSync(5);

    this.password = bcrypt.hashSync(newPassword, salt);
}

UserSchema.methods.uses2FA = function () {
    return (this.usesEmail2FA || this.usesAuthenticator2FA);
}

UserSchema.methods.isAdmin = async function () {
    const role = await Role.findOne({_id: this.roleId});

    if (role) {
        if ((role.name === ADMIN) || (role.name === SUPER_ADMIN)) {
            return true;
        }
    }

    return false;
}

UserSchema.methods.getFields = async function () {

    let authenticatorSecret = await AuthenticatorSecret.findOne({ userId: this._id });

    const role = await Role.findOne({ _id: this.roleId });

    if (!authenticatorSecret) {
        try {
            const secret = speakEasy.generateSecret({
                name: process.env.APP_NAME,
            });

            if (secret?.otpauth_url) {
                const qrCodeData = await qrCode.toDataURL(secret.otpauth_url);

                authenticatorSecret = await AuthenticatorSecret.create({
                    userId: this._id,
                    secret: secret.base32,
                    qrCodeData
                });
            } else {
                throw new Error('Could not generate QRcode to scan with Authenticator App.');
            }


        } catch (err) {
            throw new Error(err as string);
        }
    }

    const rentalItemsSessions = await RentalItemSession.find({userId: this._id.toString(), abortionTimeStamp: undefined, completionTimeStamp: undefined});

    let rentalItemsSessionsData: any[] = [];

    if (rentalItemsSessions) {
        for (const itemSession of rentalItemsSessions) {
            rentalItemsSessionsData = [
                ...rentalItemsSessionsData,
                (await itemSession.getFields())
            ];
        }
    }


    return {
        _id: this._id,
        role: role?.getFields() ?? undefined,

        specialRole: this?.specialRole ?? undefined,
        about: this?.about ?? undefined,

        imgSrc: this?.imgSrc ?? undefined,
        firstName: this.firstName,
        lastName: this.lastName,
        otherName: this?.otherName ?? undefined,
        nickName: this?.nickName ?? undefined,
        preferredName: this?.preferredName ?? undefined,

        dateOfBirth: this?.dateOfBirth ?? undefined,

        gender: this?.gender ?? undefined,

        email: this.email,
        emailVerifiedAt: this?.emailVerifiedAt ?? undefined,
        phone: this.phone,
        phoneVerifiedAt: this?.phoneVerifiedAt ?? undefined,
        mobile: this?.mobile ?? undefined,
        mobileVerifiedAt: this?.mobileVerifiedAt,

        usesEmail2FA: this.usesEmail2FA,
        usesAuthenticator2FA: this.usesAuthenticator2FA,
        authenticatorSecret: authenticatorSecret?.getFields() ?? undefined,

        status: this.status,
        smeOwnerStatus: this?.smeOwnerStatus ?? SME_OWNER_UNVERIFIED,

        rentalItemsSessions: rentalItemsSessions ? rentalItemsSessionsData : undefined,

        createdAt: (new Date(this.createdAt)).getTime()
    }
};

UserSchema.methods.getFields4EmailToken = function () {
    return {
        firstName: this.firstName,
        lastName: this.lastName,
        preferredName: this?.preferredName ?? undefined,
        nickName: this?.nickName ?? undefined
    }
}

/**
 * get Fields for 2-Factor Authentication
 * @returns 
 */
UserSchema.methods.getFields42FA = function () {
    return {
        _id: this._id,
        usesEmail2FA: this.usesEmail2FA,
        usesAuthenticator2FA: this.usesAuthenticator2FA
    }
}

UserSchema.methods.getFields4Export = function (role: string | null = null) {
    return {
        [`${role ?? ""}UserName`]: this.userName,
        [`${role ?? ""}FirstName`]: this.firstName,
        [`${role ?? ""}LastName`]: this.lastName,
        [`${role ?? ""}Email`]: this.email,
    }
}

UserSchema.methods.getFields4Enum = function () {
    return {
        _id: this._id,
        imgSrc: this.imgSrc,
        firstName: this.firstName,
        lastName: this.lastName,
        userName: this.userName,
        role: this.role,
        email: this.email,
        emailVerified: this.emailVerified,
        status: this.status,
    }
}

const User = model<IUser>("User", UserSchema);

export default User;
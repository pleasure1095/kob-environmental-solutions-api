import { Router } from "express";
import { body, param } from "express-validator";
import { ADMIN, ADMINS, DRIVER, GENDERS, SUPER_ADMIN, USER_ACCOUNT_STATUSES } from "../config/constants";
import driversController from "../controllers/driversController";
import dateIsNotFuturistic from "../expressValidators/dateIsNotFuturistic";
import dialableNumberIsUnique from "../expressValidators/dialableNumberIsUnique";
import mkDialableNumberIsUnique from "../expressValidators/mkDialableNumberIsUnique";
import mkMatchesAnOption from "../expressValidators/mkMatchesAnOption";
import mkRoleWithIdExists from "../expressValidators/mkRoleWithIdExists";
import mkUserFieldIsUnique from "../expressValidators/mkUserFieldIsUnique";
import noWhiteSpace from "../expressValidators/noWhiteSpace";
import password4UserWithParamIdIsCorrect from "../expressValidators/password4UserWithParamIdIsCorrect";
import submittedDialableNumbersAreUniqueFromEachOther from "../expressValidators/submittedDialableNumbersAreUniqueFromEachOther";
import usrImgOk from "../expressValidators/usrImgOk";
import { isAuthenticated, mkPlaysOneOfRoles, mkPlaysRole } from "../middlewares/auth";
import authUserCanUpdateUserWithParamId from "../middlewares/authUserCanUpdateUserWithParamId";
import genUsrImgErr from "../middlewares/genUsrImgErr";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import nameUsrImg from "../middlewares/nameUsrImg";
import unlinkUsrImgIfErr from "../middlewares/unlinkUsrImgIfErr";
import uploadUsrImg from "../middlewares/uploadUserImg";

var asyncHandle = require('express-async-handler');


const driversRouter = Router();

//validation for register
const validateFirstName4Reg = body("firstName").notEmpty().withMessage("This field is required.").bail().custom(noWhiteSpace).bail();
const validateLastName4Reg = body("lastName").notEmpty().withMessage("This field is required.").bail().custom(noWhiteSpace).bail();
const validateOtherName4Reg = body("otherName").optional({ values: "falsy" }).custom(noWhiteSpace).bail();
const validateNickName4Reg = body("nickName").optional({ values: "falsy" });
const validatePreferredName4Reg = body("preferredName").optional({ values: "falsy" }).custom(noWhiteSpace).bail();
const validateDateOfBirth4Reg = body("dateOfBirth").optional({ values: "falsy" }).isDate().withMessage('This field is must have a date format.').bail().custom(dateIsNotFuturistic).bail();
const validateGender4Reg = body("gender").optional({ values: "falsy" }).custom(mkMatchesAnOption(GENDERS)).bail();
const validateEmail4Reg = body("email").notEmpty().withMessage('This field is requied.').bail().isEmail().withMessage('An email is required.').bail().custom(noWhiteSpace).bail().custom(asyncHandle(mkUserFieldIsUnique('email'))).bail();
const validatePhone4Reg = body("phone").notEmpty().withMessage('This field is required.').bail().custom(submittedDialableNumbersAreUniqueFromEachOther).bail().custom(dialableNumberIsUnique).bail();
const validateMobile4Reg = body("mobile").optional({ values: "falsy" }).custom(submittedDialableNumbersAreUniqueFromEachOther).bail().custom(dialableNumberIsUnique).bail();
const validatePassword4Reg = body("password").optional({ values: "falsy" }).isStrongPassword({ minLength: 8, minNumbers: 1, minSymbols: 1, minLowercase: 1, minUppercase: 1 }).withMessage('Password must contain at least 8 characters with minimum of 1 uppercase, 1 lowercase, 1 number and 1 symbol.').bail();
const validateUsesEmail2FA4Reg = body("usesEmail2FA").optional({ values: "falsy" }).isBoolean().withMessage("true or false exptected.");
const validateUsesAuthenticator2FA4Reg = body("usesAuthenticator2FA").optional({ values: "falsy" }).isBoolean().withMessage("true or false exptected.");
const validateUserStatus4Reg = body("status").optional({ values: "falsy" }).custom(mkMatchesAnOption(USER_ACCOUNT_STATUSES)).bail();

//validate for get
const validateDriverId4Get = param('id').custom(asyncHandle(mkRoleWithIdExists(DRIVER))).bail();

//validate for update
const validateUserImg4Update = body('usrImg').optional({ values: 'falsy' }).custom(usrImgOk).bail();
const validateFirstName4Update = body("firstName").optional({values: "falsy"}).custom(noWhiteSpace).bail();
const validateLastName4Update = body("lastName").optional({values: "falsy"}).custom(noWhiteSpace).bail();
const validateOtherName4Update = body("otherName").optional({ values: "falsy" }).custom(noWhiteSpace).bail();
const validateNickName4Update = body("nickName").optional({ values: "falsy" });
const validatePreferredName4Update = body("preferredName").optional({ values: "falsy" });
const validateDateOfBirth4Update = body("dateOfBirth").optional({ values: "falsy" }).isDate().withMessage('This field is must have a date format.').bail().custom(dateIsNotFuturistic).bail();
const validateGender4Update = body("gender").optional({ values: "falsy" }).custom(mkMatchesAnOption(GENDERS)).bail();
const validateEmail4Update = body("email").optional({values: "falsy"}).isEmail().withMessage('An email is required.').bail().custom(noWhiteSpace).bail().custom(asyncHandle(mkUserFieldIsUnique('email'))).bail();
const validatePhone4Update = body("phone").optional({values: "falsy"}).custom(submittedDialableNumbersAreUniqueFromEachOther).bail().custom(mkDialableNumberIsUnique("phone")).bail();
const validateMobile4Update = body("mobile").optional({ values: "falsy" }).custom(submittedDialableNumbersAreUniqueFromEachOther).bail().custom(mkDialableNumberIsUnique("mobile")).bail();
const validatePassword4Update = body("password").optional({values: "falsy"}).isStrongPassword({ minLength: 8, minNumbers: 1, minSymbols: 1, minLowercase: 1, minUppercase: 1 }).withMessage('Password must contain at least 8 characters with minimum of 1 uppercase, 1 lowercase, 1 number and 1 symbol.').bail();
const validateOldPassword4Update = body("oldPassword").if(body("password").notEmpty()).notEmpty().withMessage("This field is required.").bail().custom(asyncHandle(password4UserWithParamIdIsCorrect)).bail();
const validateUsesEmail2FA4Update = body("usesEmail2FA").optional({ values: "falsy" }).isBoolean().withMessage("true or false exptected.");
const validateUsesAuthenticator2FA4Update = body("usesAuthenticator2FA").optional({ values: "falsy" }).isBoolean().withMessage("true or false exptected.");
const validateUserStatus4Update = body("status").optional({ values: "falsy" }).custom(mkMatchesAnOption(USER_ACCOUNT_STATUSES)).bail();




driversRouter.post('/driver',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    validateFirstName4Reg,
    validateLastName4Reg,
    validateOtherName4Reg,
    validateNickName4Reg,
    validatePreferredName4Reg,
    validateDateOfBirth4Reg,
    validateGender4Reg,
    validateEmail4Reg,
    validatePhone4Reg,
    validateMobile4Reg,
    validatePassword4Reg,
    validateUsesEmail2FA4Reg,
    validateUsesAuthenticator2FA4Reg,
    validateUserStatus4Reg,
    handleValidationErrors,
    asyncHandle(driversController.register1)
);

driversRouter.get('/drivers',
    asyncHandle(isAuthenticated),
    asyncHandle(driversController.fetchAll)
);

driversRouter.get('/drivers/:id',
    asyncHandle(isAuthenticated),
    validateDriverId4Get,
    handleValidationErrors,
    asyncHandle(driversController.fetch1)
);

driversRouter.put('/drivers/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    uploadUsrImg.fields([
        { name: 'usrImg' }
    ]),
    genUsrImgErr,
    validateUserImg4Update,
    validateFirstName4Update,
    validateLastName4Update,
    validateOtherName4Update,
    validateNickName4Update,
    validatePreferredName4Update,
    validateDateOfBirth4Update,
    validateGender4Update,
    validateEmail4Update,
    validatePhone4Update,
    validateMobile4Update,
    validatePassword4Update,
    validateOldPassword4Update,
    validateUsesEmail2FA4Update,
    validateUsesAuthenticator2FA4Update,
    validateUserStatus4Update,
    unlinkUsrImgIfErr,
    handleValidationErrors,
    handleValidationErrors,
    nameUsrImg,
    asyncHandle(authUserCanUpdateUserWithParamId), 
    asyncHandle(driversController.update1)
);



export default driversRouter;
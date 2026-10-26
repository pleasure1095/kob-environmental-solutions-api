import { Router } from "express";
import { body, param, query } from "express-validator";
import { ADMIN, ADMINS, CUSTOMER, DRIVER, GENDERS, SME_OWNER_STATUSES, SPECIAL_ROLES, STAFF, USER_ACCOUNT_STATUSES } from "../config/constants";
import usersController from "../controllers/usersController";
import dateIsNotFuturistic from "../expressValidators/dateIsNotFuturistic";
import dialableNumberIsUnique from "../expressValidators/dialableNumberIsUnique";
import mkDialableNumberIsUnique from "../expressValidators/mkDialableNumberIsUnique";
import mkMatchesAnOption from "../expressValidators/mkMatchesAnOption";
import mkUserFieldIsUnique from "../expressValidators/mkUserFieldIsUnique";
import noWhiteSpace from "../expressValidators/noWhiteSpace";
import password4UserWithParamIdIsCorrect from "../expressValidators/password4UserWithParamIdIsCorrect";
import submittedDialableNumbersAreUniqueFromEachOther from "../expressValidators/submittedDialableNumbersAreUniqueFromEachOther";
import userWithIdExists from "../expressValidators/userWithIdExists";
import usrImgOk from "../expressValidators/usrImgOk";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import authUserCanUpdateUserWithParamId from "../middlewares/authUserCanUpdateUserWithParamId";
import genUsrImgErr from "../middlewares/genUsrImgErr";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import nameUsrImg from "../middlewares/nameUsrImg";
import unlinkUsrImgIfErr from "../middlewares/unlinkUsrImgIfErr";
import uploadUsrImg from "../middlewares/uploadUserImg";

var asyncHandle = require('express-async-handler');

const usersRouter = Router();
//validation for register

const validateRole4Reg = body('role').notEmpty().withMessage('This field is required.').bail().custom(mkMatchesAnOption([ADMIN, STAFF, DRIVER, CUSTOMER])).bail();
const validateFirstName4Reg = body("firstName").notEmpty().withMessage("This field is required.").bail().custom(noWhiteSpace).bail();
const validateLastName4Reg = body("lastName").notEmpty().withMessage("This field is required.").bail().custom(noWhiteSpace).bail();
const validateOtherName4Reg = body("otherName").optional({ values: "falsy" }).custom(noWhiteSpace).bail();
const validateNickName4Reg = body("nickName").optional({ values: "falsy" });
const validatePreferredName4Reg = body("preferredName").optional({ values: "falsy" }).custom(noWhiteSpace).bail();
const validateDateOfBirth4Reg = body("dateOfBirth").optional({ values: "falsy" }).isDate().withMessage('This field is must have a date format.').bail().custom(dateIsNotFuturistic).bail();
const validateSpecialRole4Reg = body("specialRole").optional({ values: "falsy" }).custom(mkMatchesAnOption(SPECIAL_ROLES));
const validateGender4Reg = body("gender").optional({ values: "falsy" }).custom(mkMatchesAnOption(GENDERS)).bail();
const validateEmail4Reg = body("email").notEmpty().withMessage('This field is requied.').bail().isEmail().withMessage('An email is required.').bail().custom(noWhiteSpace).bail().custom(asyncHandle(mkUserFieldIsUnique('email'))).bail();
const validatePhone4Reg = body("phone").notEmpty().withMessage('This field is required.').bail().custom(submittedDialableNumbersAreUniqueFromEachOther).bail().custom(dialableNumberIsUnique).bail();
const validateMobile4Reg = body("mobile").optional({ values: "falsy" }).custom(submittedDialableNumbersAreUniqueFromEachOther).bail().custom(dialableNumberIsUnique).bail();
const validatePassword4Reg = body("password").optional({ values: "falsy" }).isStrongPassword({ minLength: 8, minNumbers: 1, minSymbols: 1, minLowercase: 1, minUppercase: 1 }).withMessage('Password must contain at least 8 characters with minimum of 1 uppercase, 1 lowercase, 1 number and 1 symbol.').bail();
const validateUsesEmail2FA4Reg = body("usesEmail2FA").optional({ values: "falsy" }).isBoolean().withMessage("true or false exptected.");
const validateUsesAuthenticator2FA4Reg = body("usesAuthenticator2FA").optional({ values: "falsy" }).isBoolean().withMessage("true or false exptected.");
const validateUserStatus4Reg = body("status").optional({ values: "falsy" }).custom(mkMatchesAnOption(USER_ACCOUNT_STATUSES)).bail();
const validateSmeOwnerStatus4Reg = body("smeOwnerStatus").optional({ values: 'falsy' }).custom(mkMatchesAnOption(SME_OWNER_STATUSES)).bail();

//validate for get
const validateRole4Get = query('role').notEmpty().withMessage('This field is required.').bail().custom(mkMatchesAnOption([ADMIN, STAFF, DRIVER, CUSTOMER])).bail();
const validateUserId4Get = param('id').custom(asyncHandle(userWithIdExists)).bail();
const validateSmeOwnerStatus4Get = query('smeOwnerStatus').optional({ values: 'falsy' }).custom(mkMatchesAnOption(SME_OWNER_STATUSES)).bail();

//validation for user-update
const validateUserId4Update = param('id').custom(asyncHandle(userWithIdExists)).bail();
const validateUserImg4Update = body('usrImg').optional({ values: 'falsy' }).custom(usrImgOk).bail();
const validateFirstName4Update = body("firstName").optional({ values: "falsy" }).custom(noWhiteSpace).bail();
const validateLastName4Update = body("lastName").optional({ values: "falsy" }).custom(noWhiteSpace).bail();
const validateOtherName4Update = body("otherName").optional({ values: "falsy" }).custom(noWhiteSpace).bail();
const validateNickName4Update = body("nickName").optional({ values: "falsy" });
const validatePreferredName4Update = body("preferredName").optional({ values: "falsy" });
const validateDateOfBirth4Update = body("dateOfBirth").optional({ values: "falsy" }).isDate().withMessage('This field is must have a date format.').bail().custom(dateIsNotFuturistic).bail();
const validateGender4Update = body("gender").optional({ values: "falsy" }).custom(mkMatchesAnOption(GENDERS)).bail();
const validateEmail4Update = body("email").optional({ values: "falsy" }).isEmail().withMessage('An email is required.').bail().custom(noWhiteSpace).bail().custom(asyncHandle(mkUserFieldIsUnique('email'))).bail();
const validatePhone4Update = body("phone").optional({ values: "falsy" }).custom(submittedDialableNumbersAreUniqueFromEachOther).bail().custom(mkDialableNumberIsUnique("phone")).bail();
const validateMobile4Update = body("mobile").optional({ values: "falsy" }).custom(submittedDialableNumbersAreUniqueFromEachOther).bail().custom(mkDialableNumberIsUnique("mobile")).bail();
const validatePassword4Update = body("password").optional({ values: "falsy" }).isStrongPassword({ minLength: 8, minNumbers: 1, minSymbols: 1, minLowercase: 1, minUppercase: 1 }).withMessage('Password must contain at least 8 characters with minimum of 1 uppercase, 1 lowercase, 1 number and 1 symbol.').bail();
const validateOldPassword4Update = body("oldPassword").if(body("password").notEmpty()).notEmpty().withMessage("This field is required.").bail().custom(asyncHandle(password4UserWithParamIdIsCorrect)).bail();
const validateUsesEmail2FA4Update = body("usesEmail2FA").optional({ values: "falsy" }).isBoolean().withMessage("true or false exptected.");
const validateUsesAuthenticator2FA4Update = body("usesAuthenticator2FA").optional({ values: "falsy" }).isBoolean().withMessage("true or false exptected.");
const validateUserStatus4Update = body("status").optional({ values: "falsy" }).custom(mkMatchesAnOption(USER_ACCOUNT_STATUSES)).bail();
const validateSmeOwnerStatus4Update = body("smeOwnerStatus").optional({ values: 'falsy' }).custom(mkMatchesAnOption(SME_OWNER_STATUSES)).bail();
const validateAbout4Update = body('about').optional({ values: 'falsy' }).isLength({ min: 50, max: 250 }).withMessage('Minimum of 50 characters and a maximum of 250 characters');

//validation for status toggles
const validateUserId4StatusToggle = param('id').notEmpty().withMessage('This field is required').bail().custom(asyncHandle(userWithIdExists)).bail();


//validate for deletion
const validatePUserId4Delete = param('id').custom(asyncHandle(userWithIdExists)).bail();


usersRouter.post('/user',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    validateRole4Reg,
    validateFirstName4Reg,
    validateLastName4Reg,
    validateOtherName4Reg,
    validateNickName4Reg,
    validatePreferredName4Reg,
    validateSpecialRole4Reg,
    validateDateOfBirth4Reg,
    validateGender4Reg,
    validateEmail4Reg,
    validatePhone4Reg,
    validateMobile4Reg,
    validatePassword4Reg,
    validateUsesEmail2FA4Reg,
    validateUsesAuthenticator2FA4Reg,
    validateUserStatus4Reg,
    validateSmeOwnerStatus4Reg,
    handleValidationErrors,
    asyncHandle(usersController.register)
);

usersRouter.get('/users',
    asyncHandle(isAuthenticated),
    validateRole4Get,
    validateSmeOwnerStatus4Get,
    handleValidationErrors,
    asyncHandle(usersController.fetchAll4Role)
);

usersRouter.get('/users-4-export',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    asyncHandle(usersController.fetchUsers4Export)
)

usersRouter.get('/users/:id',
    asyncHandle(isAuthenticated),
    validateUserId4Get,
    handleValidationErrors,
    asyncHandle(usersController.fetch1)
);

usersRouter.put('/users/:id',
    asyncHandle(isAuthenticated),
    uploadUsrImg.fields([
        { name: 'usrImg' }
    ]),
    genUsrImgErr,
    validateUserImg4Update,
    validateUserId4Update,
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
    validateSmeOwnerStatus4Update,
    validateAbout4Update,
    unlinkUsrImgIfErr,
    handleValidationErrors,
    nameUsrImg,
    asyncHandle(authUserCanUpdateUserWithParamId),
    asyncHandle(usersController.update1)
);

usersRouter.post('/users/:id/toggle-status',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    validateUserId4StatusToggle,
    handleValidationErrors,
    asyncHandle(usersController.toggleActiviStatus41)
);

usersRouter.post('/users/:id/toggle-sme-owner-status',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    validateUserId4StatusToggle,
    handleValidationErrors,
    asyncHandle(usersController.toggleSmeOwnerStatus41)
);


usersRouter.delete('/users/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePUserId4Delete,
    handleValidationErrors,
    asyncHandle(usersController.delete1)
);


export default usersRouter;
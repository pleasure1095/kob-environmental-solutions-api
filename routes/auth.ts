import { Router } from "express";
import { body, param } from "express-validator";
import { ADMINS, AUTHENTICATOR_SETUP_TOKEN, EMAIL_VERIFICATION_TOKEN, GENDERS, OTP_TYPES, PASSWORD_RESET_TOKEN, USER_ACCOUNT_STATUSES } from "../config/constants";
import authController from "../controllers/authController";
import dateIsNotFuturistic from "../expressValidators/dateIsNotFuturistic";
import dialableNumberIsUnique from "../expressValidators/dialableNumberIsUnique";
import emailNotVerified from "../expressValidators/emailNotVerified";
import mkEmailVerificationTokenIsValid from "../expressValidators/mkEmailVerificationTokenIsValid";
import mkMatchesAnOption from "../expressValidators/mkMatchesAnOption";
import mkUserFieldIsUnique from "../expressValidators/mkUserFieldIsUnique";
import mkUserWithFieldExists from "../expressValidators/mkUserWithFieldExists";
import noWhiteSpace from "../expressValidators/noWhiteSpace";
import oldVerificationEmail4EmailHasExpired from "../expressValidators/oldVerificationEmail4EmailHasExpired";
import oldVerificationEmail4userIdHasExpired from "../expressValidators/oldVerificationEmail4userIdHasExpired";
import submittedDialableNumbersAreUniqueFromEachOther from "../expressValidators/submittedDialableNumbersAreUniqueFromEachOther";
import userWithIdEmailNotVerified from "../expressValidators/userWithIdEmailNotVerified";
import userWithIdExists from "../expressValidators/userWithIdExists";
import { hasNoAuthToken, hasValidAuthToken, isAuthenticated, loginCredentialsCorrect, loginEmailVerified, mkPlaysOneOfRoles, oldEmail2FAOTPExpired, userIsActive } from "../middlewares/auth";
import authenticatorSetupCompletedIfRequired from "../middlewares/authenticatorSetupCompletedIfRequired";
import authTokenEmailedOTPIsValid from "../middlewares/authTokenEmailedOTPIsValid";
import authUserUsesEmail2FA from "../middlewares/authUserUsesEmail2FA";
import handleValidationErrors from "../middlewares/handleValidationErrors";

var asyncHandle = require('express-async-handler');

const authRouter = Router();

//validation for sign-up
const validateFirstName4SignUp = body("firstName").notEmpty().withMessage("This field is required.").bail().custom(noWhiteSpace).bail();
const validateLastName4SignUp = body("lastName").notEmpty().withMessage("This field is required.").bail().custom(noWhiteSpace).bail();
const validateOtherName4SignUp = body("otherName").optional({ values: "falsy" }).custom(noWhiteSpace).bail();
const validateNickName4SignUp = body("nickName").optional({ values: "falsy" });
const validatePreferredName4SignUp = body("preferredName").optional({ values: "falsy" }).custom(noWhiteSpace).bail();
const validateDateOfBirth4SignUp = body("dateOfBirth").optional({ values: "falsy" }).isDate().withMessage('This field is must have a date format.').bail().custom(dateIsNotFuturistic).bail();
const validateGender4SignUp = body("gender").optional({ values: "falsy" }).custom(mkMatchesAnOption(GENDERS)).bail();
const validateEmail4SignUp = body("email").notEmpty().withMessage('This field is requied.').bail().isEmail().withMessage('An email is required.').bail().custom(noWhiteSpace).bail().custom(asyncHandle(mkUserFieldIsUnique('email'))).bail();
const validatePhone4SignUp = body("phone").notEmpty().withMessage('This field is required.').bail().custom(submittedDialableNumbersAreUniqueFromEachOther).bail().custom(dialableNumberIsUnique).bail();
const validateMobile4SignUp = body("mobile").optional({ values: "falsy" }).custom(submittedDialableNumbersAreUniqueFromEachOther).bail().custom(dialableNumberIsUnique).bail();
const validatePassword4SignUp = body("password").notEmpty().withMessage('This field is required.').bail().isStrongPassword({ minLength: 8, minNumbers: 1, minSymbols: 1, minLowercase: 1, minUppercase: 1 }).withMessage('Password must contain at least 8 characters with minimum of 1 uppercase, 1 lowercase, 1 number and 1 symbol.').bail();
const validateUsesEmail2FA4SignUp = body("usesEmail2FA").optional({ values: "falsy" }).isBoolean().withMessage("true or false exptected.");
const validateUsesAuthenticator2FA4SignUp = body("usesAuthenticator2FA").optional({ values: "falsy" }).isBoolean().withMessage("true or false exptected.");
const validateUserStatus4SignUp = body("status").optional({ values: "falsy" }).custom(mkMatchesAnOption(USER_ACCOUNT_STATUSES)).bail();

//validation for email-user-2-verify-email
const validateEmail4EmailUser2VerifyEmail = body("email").notEmpty().withMessage("This field is required.").bail().isEmail().withMessage('An email is required.').bail().custom(asyncHandle(mkUserWithFieldExists("email"))).bail().custom(emailNotVerified).bail().custom(asyncHandle(oldVerificationEmail4EmailHasExpired)).bail();
const validateUserId4EmailUser2VerifyEmailAgain = body('userId').custom(asyncHandle(userWithIdExists)).bail().custom(userWithIdEmailNotVerified).bail().custom(asyncHandle(oldVerificationEmail4userIdHasExpired)).bail();


//validate email-token for e-mail verification
const validateEmailToken4EmailVerify = param("token").custom(asyncHandle(mkEmailVerificationTokenIsValid(EMAIL_VERIFICATION_TOKEN))).bail();

//validation for login
const validateEmail4Login = body("email").notEmpty().withMessage('This field is required.').bail().isEmail().withMessage('Your registered email-address is expected here.').bail();
const validatePassword4Login = body("password").notEmpty().withMessage('This field is required.').bail();

//validate 2FA OTP
const validate2FAOTP = body("otp").notEmpty().withMessage('This field is required.').bail();
const validate2FAType = body("type").notEmpty().withMessage('This field is requied.').bail().custom(mkMatchesAnOption(OTP_TYPES));


//validation for reset-password-request 
const validateEmail4Reset = body('email').notEmpty().withMessage("This field is required.").bail().custom(asyncHandle(mkUserWithFieldExists('email'))).bail();

//validatoin for reset-password
const validateNewPassword = body('newPassword').notEmpty().withMessage('This field is required.').bail().isStrongPassword({ minLength: 8, minNumbers: 1, minSymbols: 1, minLowercase: 1, minUppercase: 1 }).withMessage('Password must contain at least 8 characters with minimum of 1 uppercase, 1 lowercase, 1 number and 1 symbol.').bail();
const validateToken4PasswordReset = body("token").notEmpty().withMessage("This field is required.").bail().custom(asyncHandle(mkEmailVerificationTokenIsValid(PASSWORD_RESET_TOKEN))).bail();

authRouter.post('/sign-up',
    hasNoAuthToken,
    validateFirstName4SignUp,
    validateLastName4SignUp,
    validateOtherName4SignUp,
    validateNickName4SignUp,
    validatePreferredName4SignUp,
    validateDateOfBirth4SignUp,
    validateGender4SignUp,
    validateEmail4SignUp,
    validatePhone4SignUp,
    validateMobile4SignUp,
    validatePassword4SignUp,
    validateUsesEmail2FA4SignUp,
    validateUsesAuthenticator2FA4SignUp,
    validateUserStatus4SignUp,
    handleValidationErrors,
    asyncHandle(authController.signUp)
);

authRouter.post('/email-user-2-verify-email',
    validateEmail4EmailUser2VerifyEmail,
    handleValidationErrors,
    asyncHandle(authController.emailUser2VerifyEmail)
);

authRouter.post('/email-user-2-verify-email-again',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    validateUserId4EmailUser2VerifyEmailAgain,
    handleValidationErrors,
    asyncHandle(authController.reEmailUser4EmailVerification)
);

authRouter.get('/email-verification-tokens/:token/confirmation',
    asyncHandle(authController.fetchEmailVerificationConfirmationPage)
);

authRouter.post('/email-verification-tokens/:token/verify',
    validateEmailToken4EmailVerify,
    handleValidationErrors,
    asyncHandle(authController.confirmEmailVerificationToken)
);

authRouter.post('/login',
    hasNoAuthToken,
    validateEmail4Login,
    validatePassword4Login,
    handleValidationErrors,
    asyncHandle(loginCredentialsCorrect),
    asyncHandle(loginEmailVerified),
    asyncHandle(authenticatorSetupCompletedIfRequired),
    asyncHandle(userIsActive),
    asyncHandle(authController.login),
);

authRouter.post('/email-2fa-otp',
    asyncHandle(hasValidAuthToken),
    asyncHandle(authUserUsesEmail2FA),
    asyncHandle(oldEmail2FAOTPExpired),
    asyncHandle(authController.tryEmail2FAOTP)
);

authRouter.post('/validate-2fa-otp',
    asyncHandle(hasValidAuthToken),
    validate2FAOTP,
    validate2FAType,
    handleValidationErrors,
    asyncHandle(authTokenEmailedOTPIsValid),
    asyncHandle(authController.validate2FAOTP)
);

//fetch details about the authenticated user
authRouter.get('/auth/user',
    asyncHandle(hasValidAuthToken),
    asyncHandle(authController.fetchAuthUser)
);

authRouter.post('/reset-password-request',
    hasNoAuthToken,
    validateEmail4Reset,
    handleValidationErrors,
    asyncHandle(loginEmailVerified),
    asyncHandle(userIsActive),
    asyncHandle(authController.emailLink4PasswordReset)
);

authRouter.get('/password-reset-page',
    hasNoAuthToken,
    asyncHandle(authController.fetchPasswordResetPage4Token)
);

authRouter.post('/reset-password',
    hasNoAuthToken,
    validateNewPassword,
    validateToken4PasswordReset,
    handleValidationErrors,
    asyncHandle(authController.resetPassword41)
);

authRouter.post('/logout',
    asyncHandle(hasValidAuthToken),
    asyncHandle(authController.logout)
);

export default authRouter;
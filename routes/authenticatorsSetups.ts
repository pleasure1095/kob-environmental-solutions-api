import { Router } from "express";
import { body, query } from "express-validator";
import { AUTHENTICATOR_OTP, AUTHENTICATOR_SETUP_TOKEN } from "../config/constants";
import authenticatorsSecretsController from "../controllers/authenticatorsSecretsController";
import authenticatorSecretNotSetupForUserWithId from "../expressValidators/authenticatorSecretNotSetupForUserWithId";
import mkEmailVerificationTokenIsValid from "../expressValidators/mkEmailVerificationTokenIsValid";
import mkMatchesAnOption from "../expressValidators/mkMatchesAnOption";
import mkUserWithFieldExists from "../expressValidators/mkUserWithFieldExists";
import mkUserWithFieldUsesAuthenticator2FA from "../expressValidators/mkUserWithFieldUsesAuthenticator2FA";
import userWithIdExists from "../expressValidators/userWithIdExists";
import { hasNoAuthToken, isAuthenticated } from "../middlewares/auth";
import authUserAuthenticatorSecretNotSetUp from "../middlewares/authUserAuthenticatorSecretNotSetUp";
import handleValidationErrors from "../middlewares/handleValidationErrors";

var asyncHandle = require('express-async-handler');

const authenticatorsSetupsRouter = Router();

//validation for authenticator setup page
const validateEmailToken4AuthenticatorSetupPage = query("emailToken").custom(asyncHandle(mkEmailVerificationTokenIsValid(AUTHENTICATOR_SETUP_TOKEN))).bail();

//validation for user-authenticator-secret-setup
const validateUserId = body('userId').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(userWithIdExists)).bail().custom(asyncHandle(authenticatorSecretNotSetupForUserWithId));

//validateoin for email-user-2-goto-authenticator-setup-page
const validateEmail4EmailUser2GotoSetupPage = body("email").notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(mkUserWithFieldExists("email"))).bail().custom(mkUserWithFieldUsesAuthenticator2FA("email")).bail();

//validation for getting authenticator-secret
const validateQEmailedToken4GetAuthSecret = query("emailedToken").custom(asyncHandle(mkEmailVerificationTokenIsValid(AUTHENTICATOR_SETUP_TOKEN)));

//validation for confirm-authenticator-setup
const validateEmailToken4AuthenticatorSetup = body("emailToken").notEmpty().withMessage("This field is required.").bail().custom(asyncHandle(mkEmailVerificationTokenIsValid(AUTHENTICATOR_SETUP_TOKEN)));
const validate2FAOTP = body("otp").notEmpty().withMessage('This field is required.').bail();
const validate2FAType = body("type").notEmpty().withMessage('This field is requied.').bail().custom(mkMatchesAnOption([AUTHENTICATOR_OTP]));

authenticatorsSetupsRouter.post('/authenticator-secret-setup',
    asyncHandle(isAuthenticated),
    asyncHandle(authUserAuthenticatorSecretNotSetUp),
    asyncHandle(authenticatorsSecretsController.setUpAuthUserAuthenticatorSecret)
);

authenticatorsSetupsRouter.post('/user-authenticator-secret-setup',
    asyncHandle(isAuthenticated),
    // TODO: validate that this authenticated user has the privilege to perform this action,
    validateUserId,
    handleValidationErrors,
    asyncHandle(authenticatorsSecretsController.setUpAuthenticatorSecret41User)
);

authenticatorsSetupsRouter.post('/email-user-2-goto-authenticator-setup-page',
    hasNoAuthToken,
    // TODO: validate that this authenticated user has the privilege to perform this action,
    validateEmail4EmailUser2GotoSetupPage,
    handleValidationErrors,
    asyncHandle(authenticatorsSecretsController.setUpAuthenticatorSecret41User)
);

authenticatorsSetupsRouter.get('/authenticator-setup-page',
    //Validation does not occur here, since this request would be sent on click of a button in the e-mail
    // validateEmailToken4AuthenticatorSetupPage,
    // handleValidationErrors,
    asyncHandle(authenticatorsSecretsController.redirect2AuthenticatorSetUpPage)
);

authenticatorsSetupsRouter.get('/authenticator-secret',
    validateQEmailedToken4GetAuthSecret,
    handleValidationErrors,
    asyncHandle(authenticatorsSecretsController.fetchAuthenticatorSecret4EmailedToken)
);

authenticatorsSetupsRouter.post('/confirm-authenticator-setup',
    hasNoAuthToken,
    validate2FAOTP,
    validate2FAType,
    validateEmailToken4AuthenticatorSetup,
    handleValidationErrors,
    asyncHandle(authenticatorsSecretsController.confirmSetup41)
);

authenticatorsSetupsRouter.post('/confirm-auth-user-authenticator-setup',
    asyncHandle(isAuthenticated),
    validate2FAOTP,
    handleValidationErrors,
    asyncHandle(authenticatorsSecretsController.confirmSetup41)
);



export default authenticatorsSetupsRouter;
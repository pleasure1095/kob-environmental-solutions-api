import { Router } from "express";
import { param } from "express-validator";
import { PASSWORD_RESET_TOKEN } from "../config/constants";import emailVerificationTokensController from "../controllers/emailVerificationTokensController";
import mkEmailVerificationTokenIsValid from "../expressValidators/mkEmailVerificationTokenIsValid";
import handleValidationErrors from "../middlewares/handleValidationErrors";

var asyncHandle = require('express-async-handler');

const emailTokensRouter = Router();

const validateEmailTokenValue = param("value").custom(asyncHandle(mkEmailVerificationTokenIsValid(PASSWORD_RESET_TOKEN))).bail();

emailTokensRouter.get('/email-tokens/:value/user', 
    validateEmailTokenValue,
    handleValidationErrors,
    asyncHandle(emailVerificationTokensController.fetchUser41)
);

export default emailTokensRouter;
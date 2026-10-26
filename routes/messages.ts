import { Router } from "express";
import { body, query } from "express-validator";
import { MESSAGE_TARGETS } from "../config/constants";
import messagesConrtoller from "../controllers/messagesController";
import messageWithIdExists from "../expressValidators/messageWithIdExists";
import mkMatchesAnOption from "../expressValidators/mkMatchesAnOption";
import userWithIdExists from "../expressValidators/userWithIdExists";
import { isAuthenticated } from "../middlewares/auth";
import handleValidationErrors from "../middlewares/handleValidationErrors";

var asyncHandle = require('express-async-handler');

//validation for send new msg
const validateParentId4Send = body('parentId').optional({values: 'falsy'}).custom(asyncHandle(messageWithIdExists)).bail();
const validateSenderUserId4Send = body('senderUserId').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(userWithIdExists)).bail();
const validateTargetType4Send = body('targetType').notEmpty().withMessage('This field is required').bail().custom(mkMatchesAnOption(MESSAGE_TARGETS));
const validateTargetId4Send = body('targetId').if(validateTargetType4Send).notEmpty().withMessage('This field is required.').bail();
const validateContent4Send = body('content');

//validation for fetch messages
const validateTargetType4Get = query('targetType').optional({values: 'falsy'}).custom(mkMatchesAnOption(MESSAGE_TARGETS));
const validateTargetId4Get = query('targetId').notEmpty().withMessage('This field is required.');

const messagesRouter = Router();

messagesRouter.post('/message',
    // asyncHandle(isAuthenticated),
    validateParentId4Send,
    // validateSenderUserId4Send,
    validateTargetType4Send,
    validateTargetId4Send,
    validateContent4Send,
    handleValidationErrors,
    asyncHandle(messagesConrtoller.sendMessage)
);

messagesRouter.get('/messages',
    // asyncHandle(isAuthenticated),
    validateTargetType4Get,
    validateTargetId4Get,
    handleValidationErrors,
    asyncHandle(messagesConrtoller.fetchMessages4Target)
)

export default messagesRouter;
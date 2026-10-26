import { Router } from "express";
import { body, param } from "express-validator";
import rentalItemsAttachmentsSessionsController from "../controllers/rentalItemsAttachmentsSessionsController";
import rentalItemAttachmentSessionWithIdExists from "../expressValidators/rentalItemAttachmentSessionWithIdExists";
import rentalItemAttachmentWithIdExists from "../expressValidators/rentalItemAttachmentWithIdExists";
import { isAuthenticated } from "../middlewares/auth";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import userHasNoActiveRentalItemAttachmentSession from "../middlewares/userHasNoActiveRentalItemAttachmentSession";

var asyncHandle = require('express-async-handler');

const rentalItemsAttachmentsSessionsRouter = Router();

//validation 4 reg
const validateRentalItemAttachmentId4Reg = body('rentalItemAttachmentId').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(rentalItemAttachmentWithIdExists)).bail();

//valiadtion 4 activation
const validateRentalItemAttachmentSessionId4Activation = param('id').custom(asyncHandle(rentalItemAttachmentSessionWithIdExists)).bail();

//valiadtion 4 abortion
const validateRentalItemAttachmentSessionId4Abortion = param('id').custom(asyncHandle(rentalItemAttachmentSessionWithIdExists)).bail();

//valiadtion 4 completion
const validateRentalItemAttachmentSessionId4Completion = param('id').custom(asyncHandle(rentalItemAttachmentSessionWithIdExists)).bail();


rentalItemsAttachmentsSessionsRouter.post('/rental-item-attachment-session',
    asyncHandle(isAuthenticated),
    validateRentalItemAttachmentId4Reg,
    handleValidationErrors,
    asyncHandle(userHasNoActiveRentalItemAttachmentSession),
    asyncHandle(rentalItemsAttachmentsSessionsController.reg1)
);

rentalItemsAttachmentsSessionsRouter.post('/rental-items-attachments-sessions/:id/activate',
    asyncHandle(isAuthenticated),
    validateRentalItemAttachmentSessionId4Activation,
    handleValidationErrors,
    asyncHandle(rentalItemsAttachmentsSessionsController.activate1)
);

rentalItemsAttachmentsSessionsRouter.post('/rental-items-attachments-sessions/:id/abort',
    asyncHandle(isAuthenticated),
    validateRentalItemAttachmentSessionId4Abortion,
    handleValidationErrors,
    asyncHandle(rentalItemsAttachmentsSessionsController.abort1)
);

rentalItemsAttachmentsSessionsRouter.post('/rental-items-attachments-sessions/:id/complete',
    asyncHandle(isAuthenticated),
    validateRentalItemAttachmentSessionId4Completion,
    handleValidationErrors,
    asyncHandle(rentalItemsAttachmentsSessionsController.complete1)
);

export default rentalItemsAttachmentsSessionsRouter;
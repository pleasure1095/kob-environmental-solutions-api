import { Router } from "express";
import { body, param } from "express-validator";
import { ADMINS, CUSTOMER, STAFF } from "../config/constants";
import rentalItemsAttachmentsController from "../controllers/rentalItemsAttachmentsController";
import mkRentalItemAttachmentFieldIsUnique from "../expressValidators/mkRentalItemAttachmentFieldIsUnique";
import rentalItemAttachmentVideoOk from "../expressValidators/rentalItemAttachmentVideoOk";
import rentalItemAttachmentWithIdExists from "../expressValidators/rentalItemAttachmentWithIdExists";
import serviceResourceWithIdExists from "../expressValidators/serviceResourceWithIdExits";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import genRentalItemAttachmentVideoErr from "../middlewares/genRentalItemAttachmentVideoErr";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import nameRentalItemAttachmentVideo from "../middlewares/nameRentalItemAttachmentVideo";
import pRentalItemAttachmentCanUpdateToThisName from "../middlewares/pRentalItemAttachmentCanUpdate2ThisName";
import unlinkRentalItemAttachmentVideoIfErr from "../middlewares/unlinkRentalItemAttachmentVideoIfErr";
import uploadRentalItemAttachmentVideo from "../middlewares/uploadRentalItemAttachmentVideo";

var asyncHandle = require('express-async-handler');

const rentalItemsAttachmentsRouter = Router();

//validation for registeration
const validateServiceResourceId4Reg = body('serviceResourceId').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(serviceResourceWithIdExists)).bail();
const validateRegName = body('name').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(mkRentalItemAttachmentFieldIsUnique('name'))).bail();
const validateRentalItemAttachmentVideo4Reg = body('rentalItemAttachmentVideo').notEmpty().withMessage('This field is required.').bail().custom(rentalItemAttachmentVideoOk).bail();

//validation for update
const validateName2Update = body('name').optional({ values: 'falsy' });
const validateRentalItemAttachmentVideo4Update = body('rentalItemAttachmentVideo').optional({ values: 'falsy' }).custom(rentalItemAttachmentVideoOk).bail();

//validate for deletion
const validatePRentalItemAttachmentId4Delete = param('id').custom(asyncHandle(rentalItemAttachmentWithIdExists)).bail();


rentalItemsAttachmentsRouter.post('/rental-item-attachment',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    uploadRentalItemAttachmentVideo.fields([
        { name: 'rentalItemAttachmentVideo' }
    ]),
    genRentalItemAttachmentVideoErr,
    validateRentalItemAttachmentVideo4Reg,
    validateServiceResourceId4Reg,
    validateRegName,
    unlinkRentalItemAttachmentVideoIfErr,
    handleValidationErrors,
    nameRentalItemAttachmentVideo,
    asyncHandle(rentalItemsAttachmentsController.register1)
);

rentalItemsAttachmentsRouter.get('/rental-items-attachments',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF, CUSTOMER])),
    asyncHandle(rentalItemsAttachmentsController.fetchAll)
);

rentalItemsAttachmentsRouter.put('/rental-items-attachments/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    
    uploadRentalItemAttachmentVideo.fields([
        { name: 'rentalItemAttachmentVideo' }
    ]),
    genRentalItemAttachmentVideoErr,
    validateRentalItemAttachmentVideo4Update,
    validateName2Update,
    unlinkRentalItemAttachmentVideoIfErr,
    handleValidationErrors,
    asyncHandle(pRentalItemAttachmentCanUpdateToThisName),
    nameRentalItemAttachmentVideo,
    asyncHandle(rentalItemsAttachmentsController.update1)
);

rentalItemsAttachmentsRouter.delete('/rental-items-attachments/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePRentalItemAttachmentId4Delete,
    handleValidationErrors,
    asyncHandle(rentalItemsAttachmentsController.delete1)
);

export default rentalItemsAttachmentsRouter;
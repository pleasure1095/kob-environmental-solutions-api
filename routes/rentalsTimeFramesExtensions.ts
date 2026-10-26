import { Router } from "express";
import { body, param } from "express-validator";
import { ADMINS, CUSTOMER, EXTERNAL_PAYMENT, PAYMENT_TYPES, STAFF } from "../config/constants";
import rentalsTimeFramesExtensionsController from "../controllers/rentalsTimeFramesExtensionsController";
import arrNotEmpty from "../expressValidators/arrNotEmpty";
import { isPositiveNumber } from "../expressValidators/isPositiveNumber";
import mkAnOptionMatchesValue from "../expressValidators/mkAnOptionMatchesValue";
import mkArrValuesMatchOptions from "../expressValidators/mkArrValuesMatchOptions";
import rentalPackageWithIdExists from "../expressValidators/rentalPackageWithIdExists";
import rentalPackageWithIdIsNotHistory from "../expressValidators/rentalPackageWithIdIsNotHistory";
import timeExtWithIdExists from "../expressValidators/timeExtWithIdExists";
import timeExtWithIdPaymentsCompleted from "../expressValidators/timeExtWithIdPaymentsCompleted";
import timeExtWithIdRentalPackageNotHistory from "../expressValidators/timeExtWithIdRentalPackageNotHistory";
import timeExtWithIdUnApproved from "../expressValidators/timeExtWithIdUnApproved";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import pTimeExtAssigned2AuthStaff from "../middlewares/pTimeExtAssigned2AuthStaff";
import rentalTimeFrameExtensionIsNotDuplicateRequest from "../middlewares/rentalTimeFrameExtensionIsNotDuplicateRequest";
import rentalTimeFrameExtensionPaymentNotByCreditOrCanBeByCredit from "../middlewares/rentalTimeFrameExtensionPaymentNotByCreditOrCanBeByCredit";

var asyncHandle = require('express-async-handler');

const rentalsTimeFrameExtensionsRouter = Router();

//validate registeration
const validateRegRentalPackageId = body('rentalPackageId').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(rentalPackageWithIdExists)).bail().custom(asyncHandle(rentalPackageWithIdIsNotHistory)).bail();
const validateRegDaysCount = body('daysCount').notEmpty().withMessage('This field is required.').bail().isNumeric().withMessage('A number is expected.').bail().custom(isPositiveNumber).bail();
const validateRegPaymentTypes = body('paymentTypes').notEmpty().withMessage('This field is required.').bail().isArray().withMessage('An array is expected.').bail().custom(arrNotEmpty).bail().custom(mkArrValuesMatchOptions(PAYMENT_TYPES)).bail();

const validateRegBankName = body('bankName').if(body('paymentTypes').custom(mkAnOptionMatchesValue(EXTERNAL_PAYMENT))).notEmpty().withMessage('This field is required.').bail();
const validateRegAccountName = body('accountName').if(body('paymentTypes').custom(mkAnOptionMatchesValue(EXTERNAL_PAYMENT))).notEmpty().withMessage('This field is required.').bail();
const validateRegAccountNumber = body('accountNumber').if(body('paymentTypes').custom(mkAnOptionMatchesValue(EXTERNAL_PAYMENT))).notEmpty().withMessage('This field is required.').bail();

const validateTimeExtId4Approve = param('id').custom(asyncHandle(timeExtWithIdExists)).bail().custom(asyncHandle(timeExtWithIdUnApproved)).bail().custom(asyncHandle(timeExtWithIdPaymentsCompleted)).bail().custom(asyncHandle(timeExtWithIdRentalPackageNotHistory)).bail();

// const validateTimeExtId4Del = param('id').custom(asyncHandle(timeExtWithIdExists)).bail().custom(asyncHandle(timeExtWithIdUnApproved)).bail().custom(asyncHandle(timeExtWithIdPaymentsCompleted))

rentalsTimeFrameExtensionsRouter.post('/rental-time-frame-extension',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS, CUSTOMER])),
    validateRegRentalPackageId,
    validateRegDaysCount,
    validateRegPaymentTypes,
    validateRegBankName,
    validateRegAccountName,
    validateRegAccountNumber,
    handleValidationErrors,
    asyncHandle(rentalTimeFrameExtensionPaymentNotByCreditOrCanBeByCredit),
    asyncHandle(rentalTimeFrameExtensionIsNotDuplicateRequest),
    asyncHandle(rentalsTimeFramesExtensionsController.mkRequest)
);

rentalsTimeFrameExtensionsRouter.post('/rental-time-frame-extensions/:id/approve',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS, CUSTOMER])),
    validateTimeExtId4Approve,
    handleValidationErrors,
    asyncHandle(pTimeExtAssigned2AuthStaff),
    asyncHandle(rentalsTimeFramesExtensionsController.approveRequest)
);

// rentalsTimeFrameExtensionsRouter.delete('/rental-time-frame-extensions/:id',
//     asyncHandle(isAuthenticated),
//     asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS])),
// );

export default rentalsTimeFrameExtensionsRouter;
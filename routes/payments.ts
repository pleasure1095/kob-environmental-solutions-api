import { Router } from "express";
import { body, param, query } from "express-validator";
import { ADMINS, CUSTOMER, EXTERNAL_PAYMENT, PAYMENT_STATUSES, STAFF } from "../config/constants";
import paymentsController from "../controllers/paymentsController";
import customerWithIdExists from "../expressValidators/customerWithIdExists";
import gatewaySessionIdIsValid from "../expressValidators/gatewaySessionIdIsValid";
import mkMatchesAnOption from "../expressValidators/mkMatchesAnOption";
import mkPaymentWithIdTypeMatchesRefType from "../expressValidators/mkPaymentWithIdTypeMatchesRefType";
import orderWithIdExists from "../expressValidators/orderWithIdExists";
import paymentWithIdExists from "../expressValidators/paymentWithIdExits";
import paymentWithIdNotCompleted from "../expressValidators/paymentWithIdNotCompleted";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import pPaymentAssigned2AuthStaff from "../middlewares/pPaymentAssigned2AuthStaff";

var asyncHandle = require('express-async-handler');

const paymentsRouter = Router();

//validation for fetching of payments
const validateStatusInGet = query('status').optional({ values: 'falsy' }).custom(mkMatchesAnOption(PAYMENT_STATUSES)).bail();
const validateOrderIdInGet = query('orderId').optional({ values: 'falsy' }).custom(asyncHandle(orderWithIdExists)).bail();
const validateCustomerIdInGet = query('customerId').optional({ values: 'falsy' }).custom(asyncHandle(customerWithIdExists)).bail();
const validatePaymentIdInGet = param('id').custom(asyncHandle(paymentWithIdExists)).bail();

const validateRefNumberInConfirm = body('refNumber').notEmpty().withMessage('This field is required.').bail();
const validatePaymentIdInConfirm = param('id').custom(asyncHandle(paymentWithIdExists)).bail().custom(asyncHandle(paymentWithIdNotCompleted)).bail().custom(asyncHandle(mkPaymentWithIdTypeMatchesRefType(EXTERNAL_PAYMENT))).bail();

//validation for export
const validateStartTimeStamp4Export = query("startTimeStamp");
const validateEndTimeStamp4Export = query("endTimeStamp");
const validateCustomerId4Export = query("customerId");
const validateResourceId4Export = query("resourceId");

//validation for cancelation
const validateSessionID = body('sessionId').notEmpty().withMessage('This field is required').bail().custom(asyncHandle(gatewaySessionIdIsValid)).bail();

paymentsRouter.get('/payments/gateway/success',
    asyncHandle(paymentsController.completeGatewayPayment)
);

paymentsRouter.get('/payments/gateway/cancel',
    asyncHandle(paymentsController.initGatewayPaymentAbortion)
);

paymentsRouter.post('/payments/gateway/cancel',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([CUSTOMER])),
    validateSessionID,
    handleValidationErrors,
    asyncHandle(paymentsController.cancelGatewayPayment)
);

paymentsRouter.get('/payments',
    asyncHandle(isAuthenticated),
    validateStatusInGet,
    validateOrderIdInGet,
    validateCustomerIdInGet,
    handleValidationErrors,
    asyncHandle(paymentsController.fetch)
);

paymentsRouter.get('/payments/:id',
    // asyncHandle(isAuthenticated),
    validatePaymentIdInGet,
    handleValidationErrors,
    // asyncHandle(pPaymentAssigned2AuthStaff),
    asyncHandle(paymentsController.fetch1)
);

paymentsRouter.post('/payments/:id/confirm',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(([STAFF, ...ADMINS]))),
    validatePaymentIdInConfirm,
    validateRefNumberInConfirm,
    handleValidationErrors,
    asyncHandle(pPaymentAssigned2AuthStaff),
    asyncHandle(paymentsController.completeExternalPayment)
);

paymentsRouter.get('/payments-history',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS, CUSTOMER])),
    validateStartTimeStamp4Export,
    validateEndTimeStamp4Export,
    validateCustomerId4Export,
    validateResourceId4Export,
    handleValidationErrors,
    asyncHandle(paymentsController.exportHistory)
);

export default paymentsRouter;
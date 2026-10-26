import { Router } from "express";
import { body, param, query } from "express-validator";
import { ADMINS, COMPLETED, CUSTOMER, DRIVER, EXTERNAL_PAYMENT, INITIALIZED, ORDER_STATUSES, PAYMENT_TYPES, RENTAL_ITEMS_TYPES, STAFF } from "../config/constants";
import deliveryNotesController from "../controllers/deliveryNotesController";
import ordersController from "../controllers/ordersController";
import arrNotEmpty from "../expressValidators/arrNotEmpty";
import customerWithIdEmailVerified from "../expressValidators/customerWithIdEmailVerified";
import customerWithIdExists from "../expressValidators/customerWithIdExists";
import discountIsLesserThanTotalCost from "../expressValidators/discountIsLesserThanTotalCost";
import { isPositiveNumber, isZeroPositiveNumber } from "../expressValidators/isPositiveNumber";
import mkArrValuesMatchOptions from "../expressValidators/mkArrValuesMatchOptions";
import mkCSVMatchOptions from "../expressValidators/mkCSVMatchOptions";
import mkMatchesAnOption from "../expressValidators/mkMatchesAnOption";
import mkOrderWithIdNotInState from "../expressValidators/mkOrderWithIdNotInState";
import mkRoleWithIdExists from "../expressValidators/mkRoleWithIdExists";
import orderWithIdApproved from "../expressValidators/orderWithIdApproved";
import orderWithIdCustomerEmailVerified from "../expressValidators/orderWithIdCustomerEmailVerified";
import orderWithIdExists from "../expressValidators/orderWithIdExists";
import orderWithIdHasDeliveryNote from "../expressValidators/orderWithIdHasDeliveryNote";
import orderWithIdInitialized from "../expressValidators/orderWithIdInitialized";
import orderWithIdPaymentsCompleted from "../expressValidators/orderWithIdPaymentsCompleted";
import orderWithIdUnapproved from "../expressValidators/orderWithIdUnapproved";
import rentalItemsAreAvailable from "../expressValidators/rentalItemsAreAvailable";
import rentalItemsExist from "../expressValidators/rentalItemsExist";
import rentalItemsWellFormatted from "../expressValidators/rentalItemsWellFormatted";
import rentalItemWithIdExists from "../expressValidators/rentalItemWithIdExists";
import siteWithIdExists from "../expressValidators/siteWithIdExists";
import userWithIdExists from "../expressValidators/userWithIdExists";
import userWithIdIsActive from "../expressValidators/userWithIdIsActive";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import customerNot2PayOnCreditOrCustomerToPayOnCreditAndCan from "../middlewares/customerNot2PayOnCreditOrCustomerToPayOnCreditAndCan";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import orderRequestIsNotDuplicate from "../middlewares/orderRequestIsNotDuplicate";
import pOrderAssigned2AuthStaff from "../middlewares/pOrderAssigned2AuthStaff";
import pOrderAssigned2AuthStaffIfAuthRoleIsStaff from "../middlewares/pOrderAssigned2AuthStaffIfAuthRoleIsStaff";
import pOrderDeliveryAssigned2AuthDriver from "../middlewares/pOrderDeliveryAssignedToAuthDriver";
import pOrderRetrievalAssigned2AuthDriver from "../middlewares/pOrderRetrievalAssigned2AuthDriver";

var asyncHandle = require('express-async-handler');

const ordersRouter = Router();

//order-request creation
const validateRegCustomerId = body('customerId').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(customerWithIdExists)).bail().custom(asyncHandle(customerWithIdEmailVerified)).bail();
const validateRegStaffId = body('staffId').if(body('userIsCustomer').isEmpty()).notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(mkRoleWithIdExists(STAFF))).bail().custom(asyncHandle(userWithIdIsActive)).bail();
const validateRegRentalItems = body('rentalItems').notEmpty().withMessage('This field is required.').bail().isArray().withMessage('An array is expected.').bail().custom(arrNotEmpty).bail().custom(rentalItemsWellFormatted).bail().custom(asyncHandle(rentalItemsExist)).bail().custom(rentalItemsAreAvailable).bail();
const validateRegRentalDaysCount = body('rentalDaysCount').notEmpty().withMessage('This field is required.').bail().isNumeric().withMessage('A number is expected.').bail().custom(isPositiveNumber).bail();
const validateRegTransportationFee = body('transportationFee').notEmpty().withMessage('This field is required.').bail().isNumeric().withMessage('A number is expected.').bail().custom(isZeroPositiveNumber).bail();
const validateRegPaymentTypes = body('paymentTypes').notEmpty().withMessage('This field is required.').bail().isArray().withMessage('An array is expected').bail().custom(arrNotEmpty).bail().custom(mkArrValuesMatchOptions(PAYMENT_TYPES)).bail();
const validateRegBankName = body('bankName').if(body('paymentTypes').custom(arrNotEmpty).custom(mkArrValuesMatchOptions([EXTERNAL_PAYMENT]))).notEmpty().withMessage('This field is required.').bail();
const validateRegAccountName = body('accountName').if(body('paymentTypes').custom(arrNotEmpty).custom(mkArrValuesMatchOptions([EXTERNAL_PAYMENT]))).notEmpty().withMessage('This field is required.').bail();
const validateRegAccountNumber = body('accountNumber').if(body('paymentTypes').custom(arrNotEmpty).custom(mkArrValuesMatchOptions([EXTERNAL_PAYMENT]))).notEmpty().withMessage('This field is required.').bail();
const validateSiteId4Reg = body('siteId').optional({ values: 'falsy' }).custom(asyncHandle(siteWithIdExists)).bail();
const validateDeliveryDueDate4Reg = body('deliveryDueDate').notEmpty().withMessage('This field is required.').bail().isDate().withMessage('This field is must have a date format.').bail();
const validateRemarks4Reg = body('remarks').optional({ values: 'falsy' }).isString().withMessage('A short note concerning this request is expected.').bail();
const validateDiscount4Reg = body('discount').if(body('totalCost').notEmpty()).optional({values: 'falsy'}).custom(isZeroPositiveNumber).bail().custom(discountIsLesserThanTotalCost).bail();


//orders fetching
const validateStatusInGet = query('status').optional({ values: 'falsy' }).custom(mkMatchesAnOption(ORDER_STATUSES)).bail();
const validateStatusesInGet = query('statuses').optional({ values: 'falsy' }).custom(mkCSVMatchOptions(ORDER_STATUSES)).bail();

const validateOrderIdInGet = param('id').custom(asyncHandle(orderWithIdExists)).bail();       //validate the id of the order
const validateRentalItemTypeInGet = query('rentalItemType').optional({ values: 'falsy' }).custom(mkMatchesAnOption(RENTAL_ITEMS_TYPES));

const validateCustomerIdInGet = query('customerId').optional({ values: 'falsy' }).custom(asyncHandle(customerWithIdExists)).bail();
const validateStaffIdInGet = query('staffId').optional({ values: 'falsy' }).custom(asyncHandle(mkRoleWithIdExists(STAFF))).bail();
const validateCreatorUserIdInGet = query('creatorUserId').optional({ values: 'falsy' }).custom(asyncHandle(userWithIdExists)).bail();
const validateDeliveryDriverIdInGet = query('deliveryDriverId').optional({ values: 'falsy' }).custom(asyncHandle(mkRoleWithIdExists(DRIVER))).bail();
const validateRetrievalDriverIdInGet = query('retrievalDriverId').optional({ values: 'falsy' }).custom(asyncHandle(mkRoleWithIdExists(DRIVER))).bail();
const validateRentalItemId4Get = query('rentalItemId').optional({ values: 'falsy' }).custom(asyncHandle(rentalItemWithIdExists)).bail();

//order/order-request update
const validateOrderId4Update = param('id').custom(asyncHandle(orderWithIdExists)).bail();       //validate the id of the order
const validateRentalItems4Update = body('rentalItems').optional({ values: "falsy" }).isArray().withMessage('An array is expected.').bail().custom(arrNotEmpty).bail().custom(rentalItemsWellFormatted).bail().custom(asyncHandle(rentalItemsExist)).bail().custom(rentalItemsAreAvailable).bail();
const validateRentalDaysCount4Update = body('rentalDaysCount').optional({ values: "falsy" }).isNumeric().withMessage('A number is expected.').bail().custom(isPositiveNumber).bail();
const validateTransportationFee4Update = body('transportationFee').optional({ values: "falsy" }).isNumeric().withMessage('A number is expected.').bail().custom(isZeroPositiveNumber).bail();
const validatePaymentTypes4Update = body('paymentTypes').optional({ values: "falsy" }).isArray().withMessage('An array is expected').bail().custom(arrNotEmpty).bail().custom(mkArrValuesMatchOptions(PAYMENT_TYPES)).bail();
const validateBankName4Update = body('bankName').if(body('paymentTypes').custom(arrNotEmpty).custom(mkArrValuesMatchOptions([EXTERNAL_PAYMENT]))).notEmpty().withMessage('This field is required.').bail();
const validateAccountName4Update = body('accountName').if(body('paymentTypes').custom(arrNotEmpty).custom(mkArrValuesMatchOptions([EXTERNAL_PAYMENT]))).notEmpty().withMessage('This field is required.').bail();
const validateAccountNumber4Update = body('accountNumber').if(body('paymentTypes').custom(arrNotEmpty).custom(mkArrValuesMatchOptions([EXTERNAL_PAYMENT]))).notEmpty().withMessage('This field is required.').bail();
const validateSiteId4Update = body('siteId').optional({ values: "falsy" }).custom(asyncHandle(siteWithIdExists)).bail();
const validateDeliveryDueDate4Update = body('deliveryDueDate').optional({ values: 'falsy' }).isDate().withMessage('This field is must have a date format.').bail();
const validateRemarks4Update = body('remarks').optional({ values: 'falsy' }).isString().withMessage('A short note concerning this request is expected.').bail();
const validateDiscount4Update = body('discount').if(body('totalCost').notEmpty()).optional({values: 'falsy'}).custom(isZeroPositiveNumber).bail().custom(discountIsLesserThanTotalCost).bail();


//order-request approval
//TODO impelement "orderWithIdPaymentComplete" customer express-validator
const validateIdInApproval = param('id').custom(asyncHandle(orderWithIdExists)).bail().custom(asyncHandle(orderWithIdUnapproved)).bail().custom(asyncHandle(orderWithIdCustomerEmailVerified)).bail().custom(asyncHandle(orderWithIdPaymentsCompleted));       //validate the id of the order
const validateDriverIdInApproval = body('driverId').optional({ values: 'falsy' }).custom(asyncHandle(mkRoleWithIdExists(DRIVER))).bail().custom(asyncHandle(userWithIdIsActive));

//delivery-driver assignment
const validateOrderId4DeliveryAssignment = param('id').custom(asyncHandle(orderWithIdExists)).bail().custom(asyncHandle(orderWithIdApproved)).bail();
const validateDriverId4DeliveryAssignment = body('driverId').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle).custom(asyncHandle(mkRoleWithIdExists(DRIVER))).bail().custom(asyncHandle(userWithIdIsActive)).bail();

const validateOrderId4Departure = param('id').custom(asyncHandle(orderWithIdExists)).bail().custom(asyncHandle(orderWithIdApproved)).bail();

const validateOrderId4DeliveryNoteFetch = param('id').custom(asyncHandle(orderWithIdExists)).bail().custom(asyncHandle(orderWithIdHasDeliveryNote)).bail();

//retrieval-driver assignment
const validateOrderId4RetrievalAssignment = param('id').custom(asyncHandle(orderWithIdExists)).bail().custom(asyncHandle(orderWithIdInitialized)).bail();
const validateDriverId4RetrievalAssignment = body('driverId').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle).custom(asyncHandle(mkRoleWithIdExists(DRIVER))).bail().custom(asyncHandle(userWithIdIsActive)).bail();

const validateOrderId4ConfirmCompletion = param('id').custom(asyncHandle(orderWithIdExists)).bail().custom(asyncHandle(orderWithIdInitialized)).bail();

const validateOrderId4Deletion = param('id').custom(asyncHandle(orderWithIdExists)).bail().custom(asyncHandle(mkOrderWithIdNotInState(INITIALIZED))).bail().custom(asyncHandle(mkOrderWithIdNotInState(COMPLETED))).bail();

//validation for fields for export of orders
const validateStartTimeStamp4Export = query("startTimeStamp");
const validateEndTimeStamp4Export = query("endTimeStamp");
const validateCreatorUserId4Export = query("creatorUserId");
const validateCustomerId4Export = query("customerId");
const validateStaffId4Export = query("staffId");
const validateDeliveryDriverId4Export = query("deliveryDriverId");
const validateRetrievalDriverId4Export = query("retrievalDriverId");

ordersRouter.post('/order',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS, CUSTOMER])),
    validateRegCustomerId,
    validateRegStaffId,
    validateRegRentalItems,
    validateSiteId4Reg,
    validateRegRentalDaysCount,
    validateRegTransportationFee,
    validateRegPaymentTypes,
    validateRegBankName,
    validateRegAccountName,
    validateRegAccountNumber,
    validateDeliveryDueDate4Reg,
    validateRemarks4Reg,
    validateDiscount4Reg,
    handleValidationErrors,
    asyncHandle(orderRequestIsNotDuplicate),
    asyncHandle(customerNot2PayOnCreditOrCustomerToPayOnCreditAndCan),
    asyncHandle(ordersController.mkRequest)
);

ordersRouter.get('/orders',
    asyncHandle(isAuthenticated),
    validateStatusInGet,
    validateStatusesInGet,
    validateCreatorUserIdInGet,
    validateCustomerIdInGet,
    validateStaffIdInGet,
    validateDeliveryDriverIdInGet,
    validateRetrievalDriverIdInGet,
    validateRentalItemId4Get,
    handleValidationErrors,
    asyncHandle(ordersController.fetchOrders)
);

ordersRouter.get('/orders/:id',
    asyncHandle(isAuthenticated),
    validateOrderIdInGet,
    handleValidationErrors,
    asyncHandle(pOrderAssigned2AuthStaff),
    asyncHandle(ordersController.fetch1)
);

ordersRouter.get('/main-order',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([CUSTOMER])),
    validateRentalItemTypeInGet,
    handleValidationErrors,
    asyncHandle(ordersController.fetchLatestOrder)
);

ordersRouter.put('/orders/:id',
    asyncHandle(isAuthenticated),
    validateOrderId4Update,
    validateRentalItems4Update,
    validateSiteId4Update,
    validateRentalDaysCount4Update,
    validateTransportationFee4Update,
    validatePaymentTypes4Update,
    validateBankName4Update,
    validateAccountName4Update,
    validateAccountNumber4Update,
    validateDeliveryDueDate4Update,
    validateRemarks4Update,
    validateDiscount4Update,
    handleValidationErrors,
    asyncHandle(customerNot2PayOnCreditOrCustomerToPayOnCreditAndCan),
    asyncHandle(ordersController.update1)
);

ordersRouter.post('/orders/:id/approve',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS])),
    validateIdInApproval,
    validateDriverIdInApproval,
    handleValidationErrors,
    asyncHandle(pOrderAssigned2AuthStaff),
    asyncHandle(ordersController.approveRequest)
);

ordersRouter.post('/orders/:id/assign-delivery-driver',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS])),
    validateOrderId4DeliveryAssignment,
    validateDriverId4DeliveryAssignment,
    handleValidationErrors,
    asyncHandle(pOrderAssigned2AuthStaff),
    asyncHandle(ordersController.assignDeliveryDriver)
);

ordersRouter.post('/orders/:id/confirm-departure',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([DRIVER, ...ADMINS])),
    validateOrderId4Departure,
    handleValidationErrors,
    asyncHandle(ordersController.confirmDepartureOf1)
);

ordersRouter.get('/orders/:id/delivery-note',
    asyncHandle(isAuthenticated),
    // asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS])),
    validateOrderId4DeliveryNoteFetch,
    handleValidationErrors,
    asyncHandle(pOrderDeliveryAssigned2AuthDriver),
    asyncHandle(deliveryNotesController.fetch4POrder)
)


ordersRouter.post('/orders/:id/assign-retrieval-driver',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS])),
    validateOrderId4RetrievalAssignment,
    validateDriverId4RetrievalAssignment,
    handleValidationErrors,
    asyncHandle(pOrderAssigned2AuthStaffIfAuthRoleIsStaff),
    asyncHandle(ordersController.assignRetrievalDriver)
);

ordersRouter.post('/orders/:id/confirm-completion',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([DRIVER, ...ADMINS])),
    validateOrderId4ConfirmCompletion,
    handleValidationErrors,
    asyncHandle(pOrderRetrievalAssigned2AuthDriver),
    asyncHandle(ordersController.confirmCompletion41)
);

ordersRouter.delete('/orders/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS, CUSTOMER])),
    validateOrderId4Deletion,
    handleValidationErrors,
    asyncHandle(ordersController.delete1)
);

ordersRouter.get('/orders-history',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([STAFF, ...ADMINS, CUSTOMER])),
    validateStartTimeStamp4Export,
    validateEndTimeStamp4Export,
    validateCreatorUserId4Export,
    validateCustomerId4Export,
    validateStaffId4Export,
    validateDeliveryDriverId4Export,
    validateRetrievalDriverId4Export,
    handleValidationErrors,
    asyncHandle(ordersController.exportHistory)
);

export default ordersRouter;
import { Router } from "express";
import { body, param } from "express-validator";
import { ADMINS, CUSTOMER, RENTAL_ITEMS_TYPES, STAFF } from "../config/constants";
import rentalItemsController from "../controllers/rentalItemsController";
import { isPositiveNumber, isZeroPositiveNumber } from "../expressValidators/isPositiveNumber";
import mkMatchesAnOption from "../expressValidators/mkMatchesAnOption";
import mkRentalItemFieldIsUnique from "../expressValidators/mkRentalItemFieldIsUnique";
import mkRoleWithIdExists from "../expressValidators/mkRoleWithIdExists";
import rentalItemImgOk from "../expressValidators/rentalItemImgIsOk";
import rentalItemWithIdExists from "../expressValidators/rentalItemWithIdExists";
import userWithIdIsActive from "../expressValidators/userWithIdIsActive";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import genRentalItemImgErr from "../middlewares/genRentalItemImgErr";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import nameRentalItemImg from "../middlewares/nameRentalItemImg";
import pRentalItemCanUpdateToThisName from "../middlewares/pRentalItemCanUpdate2ThisName";
import unlinkRentalItemImgIfErr from "../middlewares/unlinkRentalItemImgIfErr";
import uploadRentalImg from "../middlewares/uploadRentalItemImg";

var asyncHandle = require('express-async-handler');

const rentalItemsRouter = Router();

//validation for registeration
const validateRegName = body('name').notEmpty().withMessage('This field is required.').bail().isLength({max: 65}).withMessage('Maximum of 65 characters allowed').bail().custom(asyncHandle(mkRentalItemFieldIsUnique('name'))).bail();
const validateRegType = body('type').optional({ values: 'falsy' }).custom(mkMatchesAnOption(RENTAL_ITEMS_TYPES)).bail();
const validateRegStaffId = body('staffId').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(mkRoleWithIdExists(STAFF))).bail().custom(asyncHandle(userWithIdIsActive)).bail();
const validateDescription4Reg = body('description').notEmpty().withMessage('This field is required.').bail().isString().withMessage('A short note concerning this request is expected.').bail();
const validateVirtualLink4Reg = body('virtualLink').optional({ values: 'falsy' }).isURL({ protocols: ['https'], require_protocol: true }).withMessage('Expected format: https://host.tld/path').bail();
const validateRegRentalItemImg = body('rentalItemImg').optional({ values: 'falsy' }).custom(rentalItemImgOk).bail();
const validateRegCount = body('count').notEmpty().withMessage('This field is required.').bail().isInt().withMessage('A positive number is expected.').bail().custom(isPositiveNumber).bail();
const validateRegPricePerDay = body('pricePerDay').notEmpty().withMessage('This field is required.').bail().isNumeric().withMessage('A positive number is expected.').bail().custom(isZeroPositiveNumber).bail();

//validation for update
const validateRentalItemID4Update = param('id').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(rentalItemWithIdExists)).bail();
const validateVirtualLink4Update = body('virtualLink').optional({ values: 'falsy' }).isURL({ protocols: ['https'], require_protocol: true }).withMessage('Expected format: https://host.tld/path').bail();
const validateDescription4Update = body('description').optional({ values: 'falsy' }).isString().withMessage('A short note concerning this request is expected.').bail();
const validateStaffId4Update = body('staffId').optional({ values: 'falsy' }).custom(asyncHandle(mkRoleWithIdExists(STAFF))).bail().custom(asyncHandle(userWithIdIsActive)).bail();
const validateName2Update = body('name').optional({ values: 'falsy' }).isLength({max: 65}).withMessage('Maximum of 65 characters allowed').bail();
const validateRentalItemImg2Update = body('rentalItemImg').optional({ values: 'falsy' }).custom(rentalItemImgOk);
const validateCount2Update = body('count').optional({ values: 'falsy' }).isInt().withMessage('A positive number is expected.').bail().custom(isPositiveNumber).bail();
const validatePricePerDay2Update = body('pricePerDay').optional({ values: 'falsy' }).isNumeric().withMessage('A positive number is expected.').bail().custom(isZeroPositiveNumber).bail();

//validate for deletion
const validatePRentalItemId4Delete = param('id').custom(asyncHandle(rentalItemWithIdExists)).bail();

rentalItemsRouter.post('/rental-item',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    uploadRentalImg.fields([
        { name: 'rentalItemImg' }
    ]),
    genRentalItemImgErr,
    validateRegRentalItemImg,
    validateRegName,
    validateRegType,
    validateDescription4Reg,
    validateVirtualLink4Reg,
    validateRegStaffId,
    validateRegCount,
    validateRegPricePerDay,
    unlinkRentalItemImgIfErr,
    handleValidationErrors,
    nameRentalItemImg,
    asyncHandle(rentalItemsController.register1)
);

rentalItemsRouter.get('/rental-items',
    // asyncHandle(isAuthenticated),
    // asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF, CUSTOMER])),
    asyncHandle(rentalItemsController.fetchAll)
);

rentalItemsRouter.get('/rental-items-export',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    asyncHandle(rentalItemsController.export)
);

rentalItemsRouter.post('/rental-items/:id/toggle-like',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([CUSTOMER])),
    validateRentalItemID4Update,
    handleValidationErrors,
    asyncHandle(rentalItemsController.toggleLike4One)
)

rentalItemsRouter.put('/rental-items/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    uploadRentalImg.fields([
        { name: 'rentalItemImg' }
    ]),
    genRentalItemImgErr,
    validateRentalItemID4Update,
    validateDescription4Update,
    validateVirtualLink4Update,
    validateStaffId4Update,
    validateRentalItemImg2Update,
    validateName2Update,
    validateCount2Update,
    validatePricePerDay2Update,
    unlinkRentalItemImgIfErr,
    handleValidationErrors,
    asyncHandle(pRentalItemCanUpdateToThisName),
    nameRentalItemImg,
    asyncHandle(rentalItemsController.update1)
);

rentalItemsRouter.delete('/rental-items/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePRentalItemId4Delete,
    handleValidationErrors,
    asyncHandle(rentalItemsController.delete1)
);

export default rentalItemsRouter;
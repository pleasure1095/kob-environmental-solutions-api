import { Router } from "express";
import { body, param } from "express-validator";
import { ADMINS, STAFF } from "../config/constants";
import servicesResourcesController from "../controllers/servicesResourcesController";
import { isZeroPositiveNumber } from "../expressValidators/isPositiveNumber";
import mkServiceResourceFieldIsUnique from "../expressValidators/mkServiceResourceFieldIsUnique";
import rentalItemWithIdExists from "../expressValidators/rentalItemWithIdExists";
import serviceResourceImgOk from "../expressValidators/serviceResourceImgIsOk";
import serviceResourceWithIdExists from "../expressValidators/serviceResourceWithIdExits";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import genServiceResourceImgErr from "../middlewares/genServiceResourceImgErr";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import nameServiceResourceImg from "../middlewares/nameServiceResourceImg";
import unlinkServiceResourceImgIfErr from "../middlewares/unlinkServiceResourceImgIfErr";
import uploadServiceResourceImg from "../middlewares/uploadServiceResourceImg";

var asyncHandle: any = asyncHandle = require('express-async-handler')

const servicesResourcesRouter = Router();

//validate for registeration
const validateRentalItemId4Reg = body('rentalItemId').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(rentalItemWithIdExists)).bail();
const validateName4Reg = body('name').notEmpty().withMessage('This field is required.').bail();
const validateResourceImg4Reg = body('resourceImg').optional({ values: 'falsy' }).custom(serviceResourceImgOk).bail();
const validateUnit4Reg = body('unit').optional();
const validateUnitPrice4Reg = body('unitPrice').notEmpty().withMessage('This field is required.').bail().custom(isZeroPositiveNumber).bail();        //price per unit
const validateQuantityLeft4Reg = body('quantityLeft').optional({ values: 'falsy' }).custom(isZeroPositiveNumber).bail();

//validate for update
const validateName4Update = body('name').optional().custom(asyncHandle(mkServiceResourceFieldIsUnique('name'))).bail();
const validateResourceImg4Update = body('resourceImg').optional({ values: 'falsy' }).custom(serviceResourceImgOk).bail();
const validateUnit4Update = body('unit').optional({ values: 'falsy' }).bail();
const validateUnitPrice4Update = body('unitPrice').optional({ values: 'falsy' }).custom(isZeroPositiveNumber).bail();        //price per unit
const validateQuantityLeft4Update = body('quantityLeft').optional({values: 'falsy'}).custom(isZeroPositiveNumber).bail();

const validatePServiceResourceId = param('id').custom(asyncHandle(serviceResourceWithIdExists)).bail();

//validate for deletion
const validatePServiceResourceId4Delete = param('id').custom(asyncHandle(serviceResourceWithIdExists)).bail();


servicesResourcesRouter.post('/service-resource',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    uploadServiceResourceImg.fields([
        { name: 'resourceImg' }
    ]),
    genServiceResourceImgErr,
    validateRentalItemId4Reg,
    validateName4Reg,
    validateResourceImg4Reg,
    validateUnit4Reg,
    validateUnitPrice4Reg,
    validateQuantityLeft4Reg,
    unlinkServiceResourceImgIfErr,
    handleValidationErrors,
    nameServiceResourceImg,
    asyncHandle(servicesResourcesController.mk1)
);

servicesResourcesRouter.get('/services-resources',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    asyncHandle(servicesResourcesController.fetchAll)
)

servicesResourcesRouter.put('/services-resources/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    uploadServiceResourceImg.fields([
        { name: 'resourceImg' }
    ]),
    genServiceResourceImgErr,
    validatePServiceResourceId,
    validateName4Update,
    validateResourceImg4Update,
    validateUnit4Update,
    validateUnitPrice4Update,
    validateQuantityLeft4Update,
    unlinkServiceResourceImgIfErr,
    handleValidationErrors,
    nameServiceResourceImg,
    asyncHandle(servicesResourcesController.update1)
);

servicesResourcesRouter.delete('/services-resources/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePServiceResourceId4Delete,
    handleValidationErrors,
    asyncHandle(servicesResourcesController.delete1)
);

export default servicesResourcesRouter;
import { Router } from "express";
import { body, param } from "express-validator";
import { ADMINS, STAFF } from "../config/constants";
import servicesController from "../controllers/servicesController";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import { isZeroPositiveNumber } from "./isPositiveNumber";
import mkServiceFieldIsUnique from "./mkServiceFieldIsUnique";
import serviceResourceWithIdExists from "./serviceResourceWithIdExits";
import serviceWithIdExists from "./serviceWithIdExists";

var asyncHandle = require('express-async-handler');

const servicesRouter = Router();

//registeration validations
const validateName4Reg = body('name').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(mkServiceFieldIsUnique('name')));
const validateCost4Reg = body('cost').optional({values: 'falsy'}).custom(isZeroPositiveNumber).bail();
const validateDriverCanSeeReg = body('driverCanSee').notEmpty().withMessage('This field is required.').bail();
const validateResourceId4Reg = body('serviceResourceId').optional({values: 'falsy'}).custom(asyncHandle(serviceResourceWithIdExists)).bail();

const validatePServiceId = param('id').custom(serviceWithIdExists).bail();

//update validations
const validateName4Update = body('name').optional({values: 'falsy'}).custom(asyncHandle(mkServiceFieldIsUnique('name')));
const validateCost4Update = body('cost').optional({values: 'falsy'}).custom(isZeroPositiveNumber);
const validateResourceId4Update = body('serviceResourceId').optional({values: 'falsy'}).custom(asyncHandle(serviceResourceWithIdExists)).bail();

servicesRouter.post('/service',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validateName4Reg,
    validateResourceId4Reg,
    validateDriverCanSeeReg,    
    validateCost4Reg,
    handleValidationErrors,
    asyncHandle(servicesController.mk1)
);

servicesRouter.get('/services',
    asyncHandle(isAuthenticated),
    asyncHandle(servicesController.fetchAll)
);

servicesRouter.get('/services-export',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    asyncHandle(servicesController.export)
);

servicesRouter.put('/services/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePServiceId,
    validateName4Update,
    validateCost4Update,
    validateResourceId4Update,
    handleValidationErrors,
    asyncHandle(servicesController.update1)
);

servicesRouter.delete('/services/:id/resource',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePServiceId,
    handleValidationErrors,
    asyncHandle(servicesController.rmvResourceFrom1)
)

export default servicesRouter;
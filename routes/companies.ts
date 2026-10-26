import { Router } from "express";
import { body, param } from "express-validator";
import { ADMINS, STAFF } from "../config/constants";
import companiesController from "../controllers/companiesController";
import companyNameIsUnique from "../expressValidators/companyNameIsUnique";
import companyWithIdExists from "../expressValidators/companyWithIdExists";
import mkCompanyFieldIsUnique from "../expressValidators/mkCompanyFieldIsUnique";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import handleValidationErrors from "../middlewares/handleValidationErrors";

var asyncHandle = require('express-async-handler');

const companiesRouter = Router();

//validation for registeration
const validateName4Registeration = body('name').notEmpty().withMessage('This fields is required.').bail().custom(asyncHandle(companyNameIsUnique)).bail();
const validateCountry4Reg = body('country').notEmpty().withMessage('This field is required.').bail();
const validateState4Reg = body('state').notEmpty().withMessage('This field is required').bail();
const validateMainOfficeAddress4Reg = body('mainOfficeAddress').notEmpty().withMessage('This field is required.').bail();
const validatePhoneNumber4Reg = body('phoneNumber').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(mkCompanyFieldIsUnique('phoneNumber'))).bail();
const validateFaxNumber4Reg = body('faxNumber').optional({ values: 'falsy' }).custom(asyncHandle(mkCompanyFieldIsUnique('faxNumber'))).bail();
const validateEmail4Reg = body('email').notEmpty().withMessage('This field is required.').bail().isEmail().withMessage('This field must contain a valid email-address.').bail().custom(asyncHandle(mkCompanyFieldIsUnique('email'))).bail();
const validateWebsite4Reg = body('website').optional({ values: 'falsy' }).isURL({ protocols: ['http', 'https'], require_protocol: false, require_host: true, require_tld: true }).withMessage('This field must contain a valid URL.').bail().custom(asyncHandle(mkCompanyFieldIsUnique('website'))).bail();

//validation for fetch
const validatePCompanyId4Fetch = param('id').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(companyWithIdExists));


//validation for update
const validatePCompanyId4Update = param('id').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(companyWithIdExists));
const validateName4Update = body('name').optional({ values: 'falsy' }).custom(asyncHandle(companyNameIsUnique)).bail();
const validateCountry4Update = body('country').optional({values: 'falsy'});
const validateState4Update = body('state').optional({values: 'falsy'}).bail();
const validateMainOfficeAddress4Update = body('mainOfficeAddress').optional({values: 'falsy'});
const validatePhoneNumber4Update = body('phoneNumber').optional({values: 'falsy'}).custom(asyncHandle(mkCompanyFieldIsUnique('phoneNumber'))).bail();
const validateFaxNumber4Update = body('faxNumber').optional({ values: 'falsy' }).custom(asyncHandle(mkCompanyFieldIsUnique('faxNumber'))).bail();
const validateEmail4Update = body('email').optional({values: 'falsy'}).isEmail().withMessage('This field must contain a valid email-address.').bail().custom(asyncHandle(mkCompanyFieldIsUnique('email'))).bail();
const validateWebsite4Update = body('website').optional({ values: 'falsy' }).isURL({ protocols: ['http', 'https'], require_protocol: false, require_host: true, require_tld: true }).withMessage('This field must contain a valid URL.').bail().custom(asyncHandle(mkCompanyFieldIsUnique('website'))).bail();


companiesRouter.post('/company',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validateName4Registeration,
    validateCountry4Reg,
    validateState4Reg,
    validateMainOfficeAddress4Reg,
    validatePhoneNumber4Reg,
    validateFaxNumber4Reg,
    validateEmail4Reg,
    validateWebsite4Reg,
    handleValidationErrors,
    asyncHandle(companiesController.reg1)
);

companiesRouter.get('/companies',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    asyncHandle(companiesController.fetchAll)
);

companiesRouter.get('/companies/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePCompanyId4Fetch,
    handleValidationErrors,
    asyncHandle(companiesController.fetch1)
);

companiesRouter.put('/companies/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePCompanyId4Update,
    validateName4Update,
    validateCountry4Update,
    validateState4Update,
    validateMainOfficeAddress4Update,
    validatePhoneNumber4Update,
    validateFaxNumber4Update,
    validateEmail4Update,
    validateWebsite4Update,
    handleValidationErrors,
    asyncHandle(companiesController.update1)
);

export default companiesRouter;
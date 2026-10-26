import { Router } from "express";
import { body, param } from "express-validator";
import { ADMINS, STAFF } from "../config/constants";
import sitesController from "../controllers/sitesController";
import mkSiteFieldIsUnique4Owners from "../expressValidators/mkSiteFieldIsUnique4Owner";
import siteWithIdExists from "../expressValidators/siteWithIdExists";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import handleValidationErrors from "../middlewares/handleValidationErrors";

var asyncHandle = require('express-async-handler');

const sitesRouter = Router();

//validation 4 registeration
const validateName4Reg = body('name').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(mkSiteFieldIsUnique4Owners('name'))).bail();
const validateAddress4Reg = body('address').notEmpty().withMessage('This field is required.').bail();
const validateGoogleMapURL4Reg = body('googleMapURL').optional({ values: 'falsy' });

//validation 4 update
const validatePSiteId4Update = param('id').custom(asyncHandle(siteWithIdExists)).bail();
const validateName4Update = body('name').optional({ values: 'falsy' }).custom(asyncHandle(mkSiteFieldIsUnique4Owners('name'))).bail();
const validateAddress4Update = body('address').optional({ values: 'falsy' });
const validateGoogleMapURL4Update = body('googleMapURL').optional({ values: 'falsy' }).isURL({ protocols: ['https'], require_protocol: true }).withMessage('Expected format: https://host.tld/path').bail();

sitesRouter.post('/site',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validateName4Reg,
    validateAddress4Reg,
    validateGoogleMapURL4Reg,
    handleValidationErrors,
    asyncHandle(sitesController.reg1)
);

sitesRouter.get('/sites',
    asyncHandle(isAuthenticated),
    asyncHandle(sitesController.fetch)
);

sitesRouter.put('/sites/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePSiteId4Update,
    validateName4Update,
    validateAddress4Update,
    validateGoogleMapURL4Update,
    handleValidationErrors,
    asyncHandle(sitesController.Update1)
);

export default sitesRouter;
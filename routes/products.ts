import { Router } from "express";
import { body, param } from "express-validator";
import { ADMINS, C, CUSTOMER, STAFF } from "../config/constants";
import productsController from "../controllers/productsControllers";
import mkProductFieldIsUnique from "../expressValidators/mkProductFieldIsUnique";
import productImgIsOk from "../expressValidators/productImgIsOk";
import productWithIdExists from "../expressValidators/productWithIdExists";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import genProductImgErr from "../middlewares/genProductImgErr";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import nameProductImg from "../middlewares/nameProductImg";
import pProductCanUpdate2ThisName from "../middlewares/pProductCanUpdate2ThisName";
import unlinkProductImgIfErr from "../middlewares/unlinkProductImgIfErr";
import uploadProductImg from "../middlewares/uploadProductImg";

var asyncHandle = require('express-async-handler');

const productsRouter = Router();

const validateName4Reg = body("name").notEmpty().withMessage('This field is required.').bail().isLength({ max: 65 }).withMessage('Maximum of 65 characters allowed').bail().custom(asyncHandle(mkProductFieldIsUnique('name'))).bail();
const validateParentId4Reg = body("parentId").optional({ values: 'falsy' }).custom(asyncHandle(productWithIdExists)).bail();
const validateProductImg = body('productImg').optional({ values: 'falsy' }).custom(productImgIsOk).bail();

const validateProductId4Update = param('id').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(productWithIdExists)).bail();
const validateProductName4Update = body('name').optional({values: 'falsy'});
const validateProductImg4Update = body('productImg').optional({ values: 'falsy' }).custom(productImgIsOk).bail();
const validateParentId4Update = param('id').optional({values: 'falsy'}).custom(asyncHandle(productWithIdExists)).bail();

const validatePProductId4Delete = param('id').notEmpty().withMessage('This field is requried.').bail().custom(asyncHandle(productWithIdExists)).bail();

productsRouter.post('/product',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    uploadProductImg.fields([
        { name: 'productImg' }
    ]),
    genProductImgErr,
    validateProductImg,
    validateName4Reg,
    validateParentId4Reg,
    unlinkProductImgIfErr,
    handleValidationErrors,
    nameProductImg,
    asyncHandle(productsController.mk1)
);

productsRouter.get('/products',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF, CUSTOMER])),
    asyncHandle(productsController.fetchAll)
);

productsRouter.put('/products/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    uploadProductImg.fields([
        { name: 'productImg' }
    ]),
    genProductImgErr,
    validateProductImg4Update,
    validateProductId4Update,
    validateProductName4Update,
    validateParentId4Update,
    unlinkProductImgIfErr,
    handleValidationErrors,
    asyncHandle(pProductCanUpdate2ThisName),
    nameProductImg,
    asyncHandle(productsController.update1)
);

productsRouter.delete('/products/:id',
asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePProductId4Delete,
    handleValidationErrors,
    asyncHandle(productsController.delete1)
);


export default productsRouter;
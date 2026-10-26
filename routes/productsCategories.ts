import { Router } from "express";
import { body, param } from "express-validator";
import { ADMINS, C, CUSTOMER, STAFF } from "../config/constants";
import productsCategoriesController from "../controllers/productsCategoriesControllers";
import mkProductCategoryFieldIsUnique from "../expressValidators/mkProductCategoryFieldIsUnique";
import productCategoryImgIsOk from "../expressValidators/productCategoryImgIsOk";
import productCategoryWithIdExists from "../expressValidators/productCategoryWithIdExists";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";
import genProductCategoryImgErr from "../middlewares/genProductCategoryImgErr";
import handleValidationErrors from "../middlewares/handleValidationErrors";
import nameProductCategoryImg from "../middlewares/nameProductCategoryImg";
import pProductCategoryCanUpdate2ThisName from "../middlewares/pProductCategoryCanUpdate2ThisName";
import unlinkProductCategoryImgIfErr from "../middlewares/unlinkProductCategoryImgIfErr";
import uploadProductCategoryImg from "../middlewares/uploadProductCategoryImg";

var asyncHandle = require('express-async-handler');

const productsCategoriesRouter = Router();

const validateName4Reg = body("name").notEmpty().withMessage('This field is required.').bail().isLength({ max: 65 }).withMessage('Maximum of 65 characters allowed').bail().custom(asyncHandle(mkProductCategoryFieldIsUnique('name'))).bail();
const validateParentId4Reg = body("parentId").optional({ values: 'falsy' }).custom(asyncHandle(productCategoryWithIdExists)).bail();
const validateProductCategoryImg = body('productCategoryImg').optional({ values: 'falsy' }).custom(productCategoryImgIsOk).bail();

const validateProductCategoryId4Update = param('id').notEmpty().withMessage('This field is required.').bail().custom(asyncHandle(productCategoryWithIdExists)).bail();
const validateProductCategoryName4Update = body('name').optional({values: 'falsy'});
const validateProductCategoryImg4Update = body('productCategoryImg').optional({ values: 'falsy' }).custom(productCategoryImgIsOk).bail();
const validateParentId4Update = param('id').optional({values: 'falsy'}).custom(asyncHandle(productCategoryWithIdExists)).bail();

const validatePProductCategoryId4Delete = param('id').notEmpty().withMessage('This field is requried.').bail().custom(asyncHandle(productCategoryWithIdExists)).bail();

productsCategoriesRouter.post('/product-category',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    uploadProductCategoryImg.fields([
        { name: 'productCategoryImg' }
    ]),
    genProductCategoryImgErr,
    validateProductCategoryImg,
    validateName4Reg,
    validateParentId4Reg,
    unlinkProductCategoryImgIfErr,
    handleValidationErrors,
    nameProductCategoryImg,
    asyncHandle(productsCategoriesController.mk1)
);

productsCategoriesRouter.get('/products-categories',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF, CUSTOMER])),
    asyncHandle(productsCategoriesController.fetchAll)
);

productsCategoriesRouter.put('/products-categories/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles(ADMINS)),
    uploadProductCategoryImg.fields([
        { name: 'productCategoryImg' }
    ]),
    genProductCategoryImgErr,
    validateProductCategoryImg4Update,
    validateProductCategoryId4Update,
    validateProductCategoryName4Update,
    validateParentId4Update,
    unlinkProductCategoryImgIfErr,
    handleValidationErrors,
    asyncHandle(pProductCategoryCanUpdate2ThisName),
    nameProductCategoryImg,
    asyncHandle(productsCategoriesController.update1)
);

productsCategoriesRouter.delete('/products-categories/:id',
asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    validatePProductCategoryId4Delete,
    handleValidationErrors,
    asyncHandle(productsCategoriesController.delete1)
);


export default productsCategoriesRouter;
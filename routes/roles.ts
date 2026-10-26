import { Router } from "express";
import { body } from "express-validator";
import { C } from "../config/constants";
import { ROLE } from "../config/modelsNames";
import rolesController from "../controllers/rolesController";
import { isAuthenticated, mkAuthUserCanPerformActionOnModel } from "../middlewares/auth";

var asyncHandle = require('express-async-handler');

const rolesRouter = Router();

const validateName4Reg = body("name");
const validateParentId4Reg = body("parentId");

rolesRouter.post('/role',
    asyncHandle(isAuthenticated),
    asyncHandle(mkAuthUserCanPerformActionOnModel(C, ROLE)),
    validateName4Reg,
    validateParentId4Reg,
    asyncHandle(rolesController.mk1)
);

rolesRouter.get('/roles',
);

rolesRouter.get('/roles/:parentId');

rolesRouter.get('/roles/:id');

rolesRouter.put('/roles/:id');


export default rolesRouter;
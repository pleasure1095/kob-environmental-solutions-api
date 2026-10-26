import { Router } from "express";
import { param } from "express-validator";
import customersController from "../controllers/customersController";
import customerWithIdExists from "../expressValidators/customerWithIdExists";
import { isAuthenticated } from "../middlewares/auth";
import handleValidationErrors from "../middlewares/handleValidationErrors";

var asyncHandle = require('express-async-handler');

const customersRouter = Router();

//customer fetch validator
const validateCustomerIdInGet = param('id').custom(asyncHandle(customerWithIdExists)).bail();

customersRouter.get('/customers/:id',
    asyncHandle(isAuthenticated),
    validateCustomerIdInGet,
    handleValidationErrors,
    asyncHandle(customersController.fetch1)
);

export default customersRouter;
import { Router } from "express";
import unitsController from "../controllers/unitsController";

const asyncHandle = require('express-async-handler');

const unitsRouter = Router();

unitsRouter.get('/units', 
    asyncHandle(unitsController.fetchAll)
);

export default unitsRouter;
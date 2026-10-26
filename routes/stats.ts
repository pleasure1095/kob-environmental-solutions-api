import { Router } from "express";
import { ADMINS, STAFF } from "../config/constants";
import statsController from "../controllers/statsController";
import { isAuthenticated, mkPlaysOneOfRoles } from "../middlewares/auth";

var asyncHandle = require('express-async-handler');

const statsRouter = Router();

statsRouter.get('/general-stats',
    asyncHandle(isAuthenticated),
    asyncHandle(mkPlaysOneOfRoles([...ADMINS, STAFF])),
    asyncHandle(statsController.fetchGeneralStats)
);


export default statsRouter;
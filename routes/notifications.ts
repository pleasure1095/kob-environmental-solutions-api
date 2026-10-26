import { Router } from "express";
import notificationsController from "../controllers/notificationsController";
import { isAuthenticated } from "../middlewares/auth";

var asyncHandle = require('express-async-handler');

const notificationsRouter = Router();

notificationsRouter.get('/notifications',
    asyncHandle(isAuthenticated),
    asyncHandle(notificationsController.fetch)
);

notificationsRouter.delete('/notifications/:id',
    asyncHandle(isAuthenticated),
    asyncHandle(notificationsController.delete1)
);

export default notificationsRouter;
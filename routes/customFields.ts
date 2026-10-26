import { Router } from "express";

const customFieldsRouter = Router();

customFieldsRouter.post('/custom-field');

customFieldsRouter.get('/custom-fields');

customFieldsRouter.put('/custom-fields/:id');


export default customFieldsRouter;
import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {

        console.log(errors);

        res.status(400).send(errors);
        return;
    }

    next();
};

export default handleValidationErrors;
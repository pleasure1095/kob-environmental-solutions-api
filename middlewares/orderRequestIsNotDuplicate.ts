import { NextFunction, Request, Response } from "express";

const orderRequestIsNotDuplicate = async (req: Request, res: Response, next: NextFunction) => {

    next();
}

export default orderRequestIsNotDuplicate;
import { NextFunction, Request } from "express";

const rentalTimeFrameExtensionIsNotDuplicateRequest = async (req: Request, res: Response, next: NextFunction) => {
    next();
}

export default rentalTimeFrameExtensionIsNotDuplicateRequest;
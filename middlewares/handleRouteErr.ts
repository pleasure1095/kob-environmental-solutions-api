import { NextFunction, Request, Response } from "express";

const handleRouteError = (err: string, req: Request, res: Response, next: NextFunction) => {
    //if status-code indicates that everthing is alright,notify client that error is a server-error
    const statusCode = res.statusCode >= 200 && res.statusCode < 300 ? 500 : res.statusCode;

    console.log('trying: ', err);

    res.status(statusCode).json({ errMsg: err, errCode: undefined });
}

export default handleRouteError;
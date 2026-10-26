import { NextFunction, Request, Response } from "express";
import Role from "../db/models/Role";

class RolesController {

    async mk1(req: Request, res: Response, next: NextFunction) {

        const role = await Role.create({
            name: req.body.name,
            parentId: req.body?.parentId ?? undefined
        });

        if (role) {
            res.send(role.getFields);
            return;
        }

        next("Someting went wrong. Please, try again.");
    }
}

const rolesController = new RolesController();

export default rolesController;
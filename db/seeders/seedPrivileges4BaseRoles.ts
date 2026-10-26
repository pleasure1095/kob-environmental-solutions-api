import * as dotEnv from 'dotenv';
import { C, CUSTOMER, D, R, SUPER_ADMIN, U, WORKER } from "../../config/constants";
import { ROLE } from "../../config/modelsNames";
import { properlizeWords } from "../../helpers";
import Privilege, { IAbility } from "../models/Privilege";
import Role from "../models/Role";

dotEnv.config();

require("../index");

const privileges4BaseRoles = [
    {
        roleName: SUPER_ADMIN,
        abilities: [
            {
                modelName: ROLE,
                actions: [C, R, U, D],
                actionsNotPerformable: undefined
            }
        ]
    },
    {
        roleName: WORKER,
        abilities: [
            {
                modelName: ROLE,
                actions: [R],
                actionsNotPerformable: [C, U, D]
            }
        ]
    },
    {
        roleName: CUSTOMER,
        abilities: [
            {
                modelName: ROLE,
                actions: [R],
                actionsNotPerformable: [C, U, D]
            }
        ]
    }
];

async function seedPrivileges4BaseRoles() {
    for (const privilege of privileges4BaseRoles) {
        const role = await Role.findOne({ name: privilege.roleName });

        if (role) {

            let abilities: IAbility[] = [];

            for (const ability of privilege.abilities) {

                const modelName = ability.modelName;

                abilities = [
                    ...abilities,
                    {
                        modelName,
                        actions: ability.actions,
                        actionsNotPerformable: ability?.actionsNotPerformable ?? undefined,
                        propsActions: []
                    }
                ]
            }

            console.log(`Seeding Privilege for base-role "${properlizeWords(privilege.roleName)}"`);

            try {
                const realPrivilege = await Privilege.create({
                    roleId: role._id.toString(),
                    abilities
                });

                console.log(`Successfully seeded Privilege for base-role "${properlizeWords(privilege.roleName)}"`);
            } catch (err) {
                console.log(`Could not Privilege for base-role "${properlizeWords(privilege.roleName)}": ${err}`);
                process.exit(-1);

            }
        }
    }

    process.exit(0);
}

seedPrivileges4BaseRoles();
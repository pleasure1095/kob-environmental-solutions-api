import { defineAbility } from "@casl/ability";
import { C, D, R, U } from "../config/constants";
import Privilege, { IPrivilege } from "../db/models/Privilege"
import { IUser } from "../db/models/users/User";

const defineAbilities4Privilege = async (privilege?: IPrivilege) => {

    return defineAbility((can, cannot) => {

        if (privilege) {

            for (const ability of privilege.abilities) {

                const modelName = ability.modelName;
                const actions = ability.actions;

                for (const action of actions) {
                    switch (action) {
                        case C:
                            can(C, modelName);
                            break;
                        case R:
                            can(R, modelName);
                            break;
                        case U:
                            can(U, modelName);
                            break;
                        case D:
                            can(D, modelName);
                            break;
                    }
                }

                if (ability?.actionsNotPerformable) {
                    const disabilities = ability.actionsNotPerformable;

                    for (const disability of disabilities) {
                        switch (disability) {
                            case C:
                                cannot(C, modelName);
                                break;
                            case R:
                                cannot(R, modelName);
                                break;
                            case U:
                                cannot(U, modelName);
                                break;
                            case D:
                                cannot(D, modelName);
                                break;
                        }
                    }
                }
            }

        } else {
            can("manage", "all");
        }

    });
}

const defineAbilities4RoleById = async (roleId: string) => {

    const privilege = await Privilege.findOne({ roleId });

    if (!privilege) {
        return undefined;
    }
    return defineAbilities4Privilege(privilege ?? undefined);
}

const defineAbilities4UserById = async (userId: string) => {
    const privilege = await Privilege.findOne({ userId });

    if (!privilege) {
        return undefined;
    }
    return defineAbilities4Privilege(privilege ?? undefined);
}

const defineAbilities4UserByPrivilegeId = async (privilegeId: string) => {
    const privilege = await Privilege.findOne({ _id: privilegeId });

    if (!privilege) {
        return undefined;
    }
    return defineAbilities4Privilege(privilege ?? undefined);
}


export const getAbilities4User = async (user: IUser) => {
    return {
        customAbilities: user?.privilegeId ? (await defineAbilities4UserByPrivilegeId(user.privilegeId)) : undefined,
        userAbilities: await defineAbilities4UserById(user._id),
        roleAbilities: await defineAbilities4RoleById(user.roleId),
    }
}
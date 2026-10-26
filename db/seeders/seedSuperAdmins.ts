import * as dotEnv from 'dotenv';
import { SUPER_ADMIN } from "../../config/constants";
import Role from "../models/Role";
import User from "../models/users/User";

dotEnv.config();

require("../index");

const superAdmins = [
    {
        firstName: "Super",
        lastName: "Admin",
        email: "superadmin001@gmail.com",
        emailVerifiedAt: "1",
        phone: "00000000000",
        role: SUPER_ADMIN,
        password: "admin",
    }
];

async function seedSuperAdmins() {
    for (const superAdmin of superAdmins) {

        console.log("Seeding a new Super Admin");

        try {
            const role = await Role.findOne({ name: superAdmin.role });

            if (role) {
                let newSuperAdmin: any = superAdmin;
                newSuperAdmin = {
                    ...newSuperAdmin,
                    role: undefined,
                    roleId: role._id.toString()

                }

                if (await User.create(newSuperAdmin)) {
                    console.log("Seeded a new Super Admin");
                }

            } else {
                console.log(`Error: Could not find role "${superAdmin.role}"`);
                process.exit(-1);
            }
        } catch (err) {
            console.log(`could not seed database "${process.env.DB_NAME}" with Super Admin "${superAdmin.firstName}": ${err}`);
            process.exit(-1);
        }
    }

    process.exit(0);
}

seedSuperAdmins();
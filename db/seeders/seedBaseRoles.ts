import * as dotEnv from 'dotenv';
import { ADMIN, CUSTOMER, STAFF, SUPER_ADMIN, TUTOR, WORKER } from '../../config/constants';
import Role from '../models/Role';

dotEnv.config();

require("../index");

const baseRoles = [
    {
        name: SUPER_ADMIN
    },
    {
        name: ADMIN
    },
    {
        name: WORKER
    },
    {
        name: STAFF
    },
    {
        name: TUTOR
    },
    {
        name: CUSTOMER
    }
];

async function seedBaseRoles() {
    for (const role of baseRoles) {
        try {

            console.log("Seeding a new base-role");

            await Role.create(role);

            console.log(`Successfully seeded new base-role "${role.name}"`);
        } catch(err) {
            console.log(`could not seed database "${process.env.DB_NAME}" with base-role "${role.name}": ${err}`);
            process.exit(-1);
        }
    }

    process.exit(0);
}

seedBaseRoles();
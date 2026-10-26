import * as dotEnv from 'dotenv';
import { CUSTOMER, SUPER_ADMIN } from "../../config/constants";
import Role from "../models/Role";
import User from "../models/users/User";

dotEnv.config();

require("../index");

const customers = [
    {
        firstName: "Annoy",
        lastName: "mous",
        email: "annonymous001@gmail.com",
        emailVerifiedAt: "1",
        phone: "00000000000",
        role: CUSTOMER,
        password: "customer",
    }
];

async function seedCustomers() {
    for (const customer of customers) {

        console.log("Seeding a new Customer");

        try {
            const role = await Role.findOne({ name: customer.role });

            if (role) {
                let newCustomer: any = customer;
                newCustomer = {
                    ...newCustomer,
                    role: undefined,
                    roleId: role._id.toString()

                }

                if (await User.create(newCustomer)) {
                    console.log("Seeded a new Customer");
                }

            } else {
                console.log(`Error: Could not find role "${customer.role}"`);
                process.exit(-1);
            }
        } catch (err) {
            console.log(`could not seed database "${process.env.DB_NAME}" with Customer "${customer.firstName}": ${err}`);
            process.exit(-1);
        }
    }

    process.exit(0);
}

seedCustomers();
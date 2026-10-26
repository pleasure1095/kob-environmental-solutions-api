import * as dotEnv from 'dotenv';
import { ADMIN, CUSTOMER, DIAMOND, GOLD, MEMBERSHIP, PLATINUM, SILVER, STAFF, SUPER_ADMIN, TUTOR, WORKER } from '../../config/constants';
import { convertRateToDaily } from '../../helpers';
import RentalItem from '../models/RentalItem';
import Role from '../models/Role';
import User from '../models/users/User';

dotEnv.config();

require("../index");

const memberships: any[] = [
    {
        name: SILVER,
        type: MEMBERSHIP,
        description: 'The most baisc membership',
        pricePerDay: convertRateToDaily(3000)
    },
    {
        name: GOLD,
        type: MEMBERSHIP,
        description: 'The standard membership',
        pricePerDay: convertRateToDaily(5000)
    },
    {
        name: PLATINUM,
        type: MEMBERSHIP,
        description: 'The luxerious membership',
        pricePerDay: convertRateToDaily(25000)
    },
    {
        name: DIAMOND,
        type: MEMBERSHIP,
        description: 'The supreme membership',
        pricePerDay: convertRateToDaily(50000)
    }
];

async function seedMemberships() {
    for (let memberhsip of memberships) {
        try {

            const role = await Role.findOne({name: SUPER_ADMIN});

            const superAdmin = await User.findOne({roleId: role?._id?.toString() ?? ""});

            if (!superAdmin) {
                throw new Error('The super admin has not been seeded');
            }

            memberhsip = {
                ...memberhsip,
                staffId: superAdmin._id.toString(),
                count: 100000
            }

            console.log("Seeding a new memberhsip");

            await RentalItem.create(memberhsip);

            console.log(`Successfully seeded new memberhsip "${memberhsip.name}"`);
        } catch(err) {
            console.log(`could not seed database "${process.env.DB_NAME}" with memberhsip "${memberhsip.name}": ${err}`);
            process.exit(-1);
        }
    }

    process.exit(0);
}

seedMemberships();
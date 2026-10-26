import { IS_HISTORY } from "../config/constants";
import Order from "../db/models/Order";
import RentalItem from "../db/models/RentalItem";
import RentalPackage from "../db/models/RentalPackage";
import Customer from "../db/models/users/Customer";

class RentalPackagesController {

    async getRentalPackagesIdsForDeliveryDriverId(deliveryDriverId: string) {
        let ids = [];

        const rentalPackages = await RentalPackage.find({ deliveryDriverId });

        if (rentalPackages) {

            for (let i = 0; i < rentalPackages.length; i++) {
                ids[i] = (rentalPackages[i]._id).toString();
            }
        }


        return ids;
    }

    async filterPackages(rentalPackageFilter: any = null) {
        const filter: any = rentalPackageFilter ?? {
            deliveryDriverId: undefined,
            retrievalDriverId: undefined
        }

        const query = RentalPackage.find();

        for (const key in filter) {
            if (filter[key] !== undefined) {
                query.where(`${key}`).equals(filter[key]);
            }
        }

        const packages = await query.exec();

        if (!packages) {
            return [];
        }

        return packages;
    }

    async getRentalPackagesIdsForRetrievalDriverId(retrievalDriverId: string) {
        let ids = [];

        const rentalPackages = await RentalPackage.find({ retrievalDriverId });

        if (rentalPackages) {

            for (let i = 0; i < rentalPackages.length; i++) {
                ids[i] = (rentalPackages[i]._id).toString();
            }
        }


        return ids;
    }

    async mkRentalPackage(data: any) {
        return await RentalPackage.create(data);
    }

    async getRentalPackageById(id: any) {
        const rentalPackage = await RentalPackage.findOne({ _id: id });

        if (rentalPackage) {
            return await rentalPackage.getFields();
        }

        throw new Error('Something went wrongg. Please, try again.')
    }

    /**
     * 
     * @param {*} id the _id of the RentalPackage
     */
    async getCustomer4RentalPackageById(id: string) {
        const order = await Order.findOne({ rentalPackageId: id });

        if (!order) {
            throw new Error('could not fetch order');
        }

        return await Customer.findOne({ _id: order.customerId });
    }

    async delete1ById(_id: string) {
        const rentalPackage = await RentalPackage.findOne({ _id });

        if (!rentalPackage) {
            throw new Error('could not rental package');
        }

        return await RentalPackage.deleteOne({ _id });
    }

}

const rentalPackagesController = new RentalPackagesController();

export default rentalPackagesController;
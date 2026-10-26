import RentalPackage from "../db/models/RentalPackage";

const rentalPackageWithIdExists = async (id: string) => {

    if (await RentalPackage.findOne({ _id: id })) {
        return true;
    }

    throw new Error('Invalid rental-package-id');
}

export default rentalPackageWithIdExists;
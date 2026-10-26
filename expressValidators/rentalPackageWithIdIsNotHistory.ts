import { IS_HISTORY } from "../config/constants";
import RentalPackage from "../db/models/RentalPackage";

const rentalPackageWithIdIsNotHistory = async (id: string) => {
    
    const rentalPackage = await RentalPackage.findOne({_id: id});

    if (rentalPackage && rentalPackage.status !== IS_HISTORY) {
        return true;
    }

    throw new Error('Rental package is history (Either the order was canceled or completed).');
}

export default rentalPackageWithIdIsNotHistory;
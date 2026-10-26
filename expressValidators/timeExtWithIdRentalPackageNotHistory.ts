import { IS_HISTORY } from "../config/constants";
import RentalPackage from "../db/models/RentalPackage";
import RentalTimeFrameExtension from "../db/models/RentalTimeFrameExtension";

const timeExtWithIdRentalPackageNotHistory = async (_id: string) => {
    const timeExt = await RentalTimeFrameExtension.findOne({ _id });

    const rentalPackage = await RentalPackage.findOne({ _id: timeExt?.rentalPackageId ?? "" });

    if (rentalPackage && rentalPackage.status !== IS_HISTORY) {
        return true;
    }

    throw new Error('The concerned rental package is history, already.');
}

export default timeExtWithIdRentalPackageNotHistory;
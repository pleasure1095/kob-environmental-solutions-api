import { UNAPPROVED } from "../config/constants";
import RentalTimeFrameExtension from "../db/models/RentalTimeFrameExtension";

const timeExtWithIdUnApproved = async (_id: string) => {
    const timeExt = await RentalTimeFrameExtension.findOne({ _id });

    if (timeExt && timeExt.status === UNAPPROVED) {
        return true;
    }

    throw new Error('The rental time-frame extension has already been approved.');
}

export default timeExtWithIdUnApproved;
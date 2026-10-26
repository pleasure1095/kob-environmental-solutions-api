import mongoose from "mongoose";
import RentalItem from "../db/models/RentalItem";


const rentalItemsExist = async (items: any) => {

    let errStr = '';
    let itr = 0;

    for (const item of items) {
        itr++;
        
        if (!mongoose.Types.ObjectId.isValid(item._id) || !(await RentalItem.findOne({ _id: item._id }))) {
            if (itr === 1) {
                errStr = `At value in index 0, "${item._id}"`;
            } else {
                errStr += itr === items.length ? ` and at value in index ${itr - 1}, "${item._id}"` : `; at value in index ${itr - 1}, "${item._id}"`;
            }
        }
    }

    if (errStr !== '') {
        throw new Error(`${errStr} ${ itr > 1 ? 'are invalid rentalItems\'s ID.' : 'is an invalid rental-item ID.'}`)
    }

}


export default rentalItemsExist;
import RentalItem, { IRentalItem } from "../db/models/RentalItem";

const rentalItemsAreAvailable = async (rentalItems: any) => {
    let errs = [];
    let errsStr = '';
    let itr = 0;

    for (const item of rentalItems) {
        const rentalItem: IRentalItem | null = await RentalItem.findOne({ _id: item._id });

        if (!rentalItem) {
            throw new Error('some rental Items could not be fond');
        }

        const availableCount = rentalItem.countAvailable();

        if ((parseFloat(item.count as string)) > availableCount) {
            errs[itr++] = `for ${rentalItem.name}: ${availableCount} available, but ${item.count} requested.`
        }
    }

    if (errs.length > 0) {
        itr = 0;

        for (const err of errs) {
            
            if (itr === 0 ) {
                errsStr  += errs[itr];
            } else {
                errsStr += (itr === (errs.length - 1)) ? `; and ${err}` : `; ${err}`;
            }

            itr++
        }

        throw new Error(errsStr);
    }

    return true;
}

export default rentalItemsAreAvailable;
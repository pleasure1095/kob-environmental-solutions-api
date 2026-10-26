import RentalItem from "../db/models/RentalItem";


const mkRentalItemFieldIsUnique = (fieldName: string) => {
    return async (value: string) => {
        const rentalItem = await RentalItem.findOne({
            [fieldName]: value
        });

        if (rentalItem) {         //the passed field's value already exists in the database
            throw new Error(`This ${fieldName} has already been chosen. Please, input something else`);
        }

        return true;
    }
}

export default mkRentalItemFieldIsUnique;
import RentalItemAttachment from "../db/models/RentalItemAttachment";


const mkRentalItemAttachmentFieldIsUnique = (fieldName: string) => {
    return async (value: string) => {
        const rentalItemAttachment = await RentalItemAttachment.findOne({
            [fieldName]: value
        });

        if (rentalItemAttachment) {         //the passed field's value already exists in the database
            throw new Error(`This ${fieldName} has already been chosen. Please, input something else`);
        }

        return true;
    }
}

export default mkRentalItemAttachmentFieldIsUnique;
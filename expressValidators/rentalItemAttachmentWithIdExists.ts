import RentalItem from "../db/models/RentalItem";
import RentalItemAttachment from "../db/models/RentalItemAttachment";

const rentalItemAttachmentWithIdExists = async (id: string) => {
  
    const rentalItemAttachment = await RentalItemAttachment.findOne({_id: id});

    if (rentalItemAttachment) {
        return true;
    }

    throw  new Error('Invalid rental-item-attachment-ID.');
}

export default rentalItemAttachmentWithIdExists;
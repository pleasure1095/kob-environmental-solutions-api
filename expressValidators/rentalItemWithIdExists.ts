import RentalItem from "../db/models/RentalItem";

const rentalItemWithIdExists = async (id: string) => {
  
    const rentalItem = await RentalItem.findOne({_id: id});

    if (rentalItem) {
        return true;
    }

    throw  new Error('Invalid rental-item-ID.');
}

export default rentalItemWithIdExists;
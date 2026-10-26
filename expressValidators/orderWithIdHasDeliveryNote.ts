import DeliveryNote, { IDeliveryNote } from "../db/models/DeliveryNote";

const orderWithIdHasDeliveryNote = async (orderId: string) => {

    const deliveryNote: IDeliveryNote | null = await DeliveryNote.findOne({ orderId });

    if (deliveryNote) {
        return true;
    }

    throw new Error('There is not delivery note for the order.');
}

export default orderWithIdHasDeliveryNote;
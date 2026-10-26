export const PAYMENT_COMPLETION = 'payment completion';
export const TIME_FRAME_EXTENSION_APPROVAL = 'time-frame extension approval';
export const ORDER_REQUEST_ASSIGNED = 'order request assigned';
export const DELIVERY_DRIVER_ASSIGNMENT = 'delivery driver assignment';
export const RETRIEVAL_DRIVER_ASSIGNMENT = 'retrieval driver assignment';
export const RETRIEVAL_CONFIRMATION = 'retrieval confirmation';
export const ORDER_DELETION = 'order deletion';
export const DELIVERY_CONFIRMATION = 'delivery confirmation';

export const APP_UPDATE_AVAILABLE = 'app update available';
export const USER_MESSAGE_AVAILABLE = 'user message available';

export const forwardMessageNotification2Receiver = (socket: any) => {
    return (userId: string) => {

        socket.join(userId);
        socket.to(userId).emit(USER_MESSAGE_AVAILABLE);

        console.log('dedicated socket to user');

    }
}
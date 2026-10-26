import { FILE_2_LARGE, FILE_TYPE_INVALID, MAX_RENTAL_ATTACHMENT_IMG_SIZE, MAX_RENTAL_ITEM_ATTACHMENT_VIDEO_SIZE } from "../config/constants";


const rentalItemAttachmentVideoOk = (value: string) => {

    switch (value) {
        case FILE_2_LARGE:
            throw new Error(`Video file-size must not exceed ${MAX_RENTAL_ITEM_ATTACHMENT_VIDEO_SIZE}bytes.`);
        case FILE_TYPE_INVALID:
            throw new Error(`Video file-type is invalid. (valid type: .mp4)`)
        default:
            return true;
    }
}

export default rentalItemAttachmentVideoOk;
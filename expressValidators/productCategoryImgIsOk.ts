import { FILE_2_LARGE, FILE_TYPE_INVALID, MAX_USER_IMG_SIZE } from "../config/constants";

const productCategoryImgIsOk = (value: string) => {

    switch (value) {
        case FILE_2_LARGE:
            throw new Error(`Image file-size must not exceed ${MAX_USER_IMG_SIZE}bytes.`);
        case FILE_TYPE_INVALID:
            throw new Error(`Image file-type is invalid. (valid types: .png, .jpeg, .jpg, and .webp)`)
        default:
            return true;
    }
}

export default productCategoryImgIsOk;
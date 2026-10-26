const { FILE_2_LARGE, MAX_USER_IMG_SIZE, FILE_TYPE_INVALID } = require("../config/constants");

const usrImgOk = (value: string) => {

    switch (value) {
        case FILE_2_LARGE:
            throw new Error(`Image file-size must not exceed ${MAX_USER_IMG_SIZE}bytes.`);
        case FILE_TYPE_INVALID:
            throw new Error(`Image file-type is invalid. (valid types: .png, .jpeg, .jpg, and .webp)`)
        default:
            return true;
    }
}

export default usrImgOk;
var multer = require('multer');
const { FILE_TYPE_INVALID } = require('../config/constants');
const { getBaseDirPath, isStaticImg } = require('../helpers');


const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        cb(null, `${getBaseDirPath()}/public/images/products/`);
    },
    filename: (req: any, file: any, cb: any) => {
        const ext = file.mimetype.split('/')[1];
        const newName = `product${(new Date()).getTime().toString()}`;

        cb(null, `${newName}.${ext}`);
    }
});

const uploadProductImg = multer({
    storage,
    fileFilter(req: any, file: any, cb: any) {

        //filter file by MIME-type and file-size
        if ((file && !isStaticImg(file.mimetype)) || (file && req.body[file?.fieldname] == FILE_TYPE_INVALID)) {
            req.body[file.fieldname] = FILE_TYPE_INVALID;

            cb(null, false);
            return;
        }

        cb(null, true);
        return;
    },

});

export default uploadProductImg;
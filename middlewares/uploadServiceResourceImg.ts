import { FILE_TYPE_INVALID } from "../config/constants";
import { getBaseDirPath, isStaticImg } from "../helpers";

var multer = require('multer');


const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        cb(null, `${getBaseDirPath()}/public/images/servicesResources/`);
    },
    filename: (req: any, file: any, cb: any) => {
        const ext = file.mimetype.split('/')[1];
        const newName = `serviceResource${(new Date()).getTime().toString()}`;

        cb(null, `${newName}.${ext}`);
    }
});

const uploadServiceResourceImg = multer({
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

export default uploadServiceResourceImg;
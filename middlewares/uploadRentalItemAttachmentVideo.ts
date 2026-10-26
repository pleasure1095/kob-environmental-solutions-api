import { FILE_TYPE_INVALID } from "../config/constants";
import { getBaseDirPath, isStaticImg, isVideo } from "../helpers";

var multer = require('multer');


const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        cb(null, `${getBaseDirPath()}/public/videos/rentalItemsAttachments/`);
    },
    filename: (req: any, file: any, cb: any) => {
        const ext = file.mimetype.split('/')[1];
        const newName = `rentalItemAttachment${(new Date()).getTime().toString()}`;

        cb(null, `${newName}.${ext}`);
    }
});

const uploadRentalItemAttachmentVideo = multer({
    storage,
    fileFilter(req: any, file: any, cb: any) {

        console.log("kill");

        //filter file by MIME-type and file-size
        if ((file && !isVideo(file.mimetype)) || (file && req.body[file?.fieldname] == FILE_TYPE_INVALID)) {
            req.body[file.fieldname] = FILE_TYPE_INVALID;

            cb(null, false);
            return;
        }

        cb(null, true);
        return;
    },

});

export default uploadRentalItemAttachmentVideo;
import { NextFunction, Request, Response } from "express";
import authController from "../controllers/authController";
import RentalItem from "../db/models/RentalItem";
import RentalItemAttachment from "../db/models/RentalItemAttachment";
import RentalItemSession from "../db/models/RentalItemSession";
import ServiceResource from "../db/models/ServiceResource";

const userHasNoActiveRentalItemAttachmentSession = async (req: Request, res: Response, next: NextFunction) => {
    const user = await authController.getAuthUser(req);

    if (!user) {
        next();
        return;
    }


    const attachment = await RentalItemAttachment.findOne({ _id: req.body.rentalItemAttachmentId });

    if (attachment) {
        const serviceResource = await ServiceResource.findOne({ _id: attachment.serviceResourceId });

        if (serviceResource) { 
            const rentalItem = await RentalItem.findOne({_id: serviceResource.rentalItemId});

            if (rentalItem) {
                const rentalItemSession = await RentalItemSession.findOne({userId: user._id.toString(), rentalItemId: rentalItem._id.toString(), abortionTimeStamp: undefined, completionTimeStamp: undefined});

                if (rentalItemSession) {
                    const itemSessionData = await rentalItemSession.getFields();
                    
                    for (const resourceSession of itemSessionData.servicesResourcesSessions) {

                        if (resourceSession.serviceResourceId === serviceResource._id.toString()) {

                            for (const attachmentSession of resourceSession.rentalItemsAttachmentsSessions) {
                                if (attachmentSession.rentalItemId === rentalItem._id) {
                                    res.status(400).send({

                                    });
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    next();
}

export default userHasNoActiveRentalItemAttachmentSession;
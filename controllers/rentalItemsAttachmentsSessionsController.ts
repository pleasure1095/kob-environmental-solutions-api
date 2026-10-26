import { NextFunction, Request, Response } from "express";
import RentalItem from "../db/models/RentalItem";
import RentalItemAttachment from "../db/models/RentalItemAttachment";
import RentalItemAttachmentSession from "../db/models/RentalItemAttachmentSession";
import RentalItemSession from "../db/models/RentalItemSession";
import ServiceResource from "../db/models/ServiceResource";
import ServiceResourceSession from "../db/models/ServiceResourceSession";
import authController from "./authController";

class RentalItemsAttachmentsSessionsController {

    async activateById(sessionID: string) {
        const rentalItemAttachmentSession = await RentalItemAttachmentSession.findOne({ _id: sessionID });

        if (rentalItemAttachmentSession) {
            rentalItemAttachmentSession.activationTimeStamp = (new Date()).getTime();
            rentalItemAttachmentSession.abortionTimeStamp = undefined;
            rentalItemAttachmentSession.completionTimeStamp = undefined;

            await rentalItemAttachmentSession.save();

            const serviceResourceSession = await ServiceResourceSession.findOne({ _id: rentalItemAttachmentSession.serviceResourceSessionId });

            if (serviceResourceSession) {

                serviceResourceSession.activeRentalItemAttachmentSessionId = rentalItemAttachmentSession._id.toString();

                serviceResourceSession.activationTimeStamp = (new Date()).getTime();
                serviceResourceSession.abortionTimeStamp = undefined;
                serviceResourceSession.completionTimeStamp = undefined;

                await serviceResourceSession.save();

                const rentalItemSession = await RentalItemSession.findOne({ _id: serviceResourceSession.rentalItemSessionId });

                if (rentalItemSession) {

                    rentalItemSession.activeServiceResourceSessionId = serviceResourceSession._id.toString();

                    rentalItemSession.activationTimeStamp = (new Date()).getTime();
                    rentalItemSession.abortionTimeStamp = undefined;
                    rentalItemSession.completionTimeStamp = undefined;

                    await rentalItemSession.save();

                    return true;
                }
            }
        }

        return false;
    }

    async reg1(req: Request, res: Response, next: NextFunction) {

        const user = await authController.getAuthUser(req);

        if (user) {
            //generate a serviceResourceSessionId
            let serviceResourceSessionId = '';


            const rentalItemAttachment = await RentalItemAttachment.findOne({ _id: req.body.rentalItemAttachmentId });
            const serviceResource = await ServiceResource.findOne({ _id: rentalItemAttachment?.serviceResourceId ?? '' });
            const rentalItem = await RentalItem.findOne({ _id: serviceResource?.rentalItemId ?? '' });

            if (rentalItem && serviceResource && rentalItemAttachment) {
                const rentalItemSession = await RentalItemSession.findOne({ userId: user._id.toString(), rentalItemId: rentalItem._id });

                if (rentalItemSession) {
                    const serviceResourceSession = await ServiceResourceSession.findOne({ rentalItemSessionId: rentalItemSession._id.toString(), serviceResourceId: serviceResource._id.toString() });

                    if (serviceResourceSession) {
                        serviceResourceSessionId = serviceResourceSession._id.toString();
                    } else {
                        const newServiceResourceSession = await ServiceResourceSession.create({ rentalItemSessionId: rentalItemSession._id.toString(), serviceResourceId: serviceResource._id.toString(), creationTimeStamp: (new Date()).getTime(), activationTimeStamp: (new Date()).getTime() });

                        serviceResourceSessionId = newServiceResourceSession?._id?.toString() ?? '';
                    }

                } else {
                    const newRentalItemSession = await RentalItemSession.create({ userId: user._id.toString(), rentalItemId: rentalItem._id, creationTimeStamp: (new Date()).getTime(), activationTimeStamp: (new Date()).getTime() });

                    if (newRentalItemSession) {
                        const newServiceResourceSession = await ServiceResourceSession.create({ rentalItemSessionId: newRentalItemSession._id.toString(), serviceResourceId: serviceResource._id.toString(), creationTimeStamp: (new Date()).getTime(), activationTimeStamp: (new Date()).getTime() });

                        serviceResourceSessionId = newServiceResourceSession?._id?.toString() ?? '';
                    }


                }

                if (serviceResourceSessionId !== '') {
                    const rentalItemAttachmentSession = await RentalItemAttachmentSession.create({ serviceResourceSessionId, rentalItemAttachmentId: rentalItemAttachment._id.toString(), creationTimeStamp: (new Date()).getTime(), activationTimeStamp: (new Date()).getTime() });

                    if (rentalItemAttachmentSession) {


                        const resourceSession = await ServiceResourceSession.findOne({ _id: rentalItemAttachmentSession.serviceResourceSessionId });

                        if (resourceSession) {
                            resourceSession.activeRentalItemAttachmentSessionId = rentalItemAttachmentSession._id.toString();

                            resourceSession.activationTimeStamp = (new Date()).getTime();
                            resourceSession.abortionTimeStamp = undefined;
                            resourceSession.completionTimeStamp = undefined;

                            await resourceSession.save();

                            const itemSession = await RentalItemSession.findOne({ _id: resourceSession._id.toString() });

                            if (itemSession) {
                                itemSession.activeServiceResourceSessionId = resourceSession._id.toString();

                                itemSession.activationTimeStamp = (new Date()).getTime();
                                itemSession.abortionTimeStamp = undefined;
                                itemSession.completionTimeStamp = undefined;

                                await itemSession.save();
                            }
                        }

                        const controller = new RentalItemsAttachmentsSessionsController();

                        await controller.activateById(rentalItemAttachmentSession._id.toString());

                        res.status(200).send({
                            msg: 'successful'
                        });
                        return;
                    }
                }
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async activate1(req: Request, res: Response, next: NextFunction) {

        const rentalItemAttachmentSession = await RentalItemAttachmentSession.findOne({ _id: req.params.id });

        if (rentalItemAttachmentSession) {
            rentalItemAttachmentSession.activationTimeStamp = (new Date()).getTime();
            rentalItemAttachmentSession.abortionTimeStamp = undefined;
            rentalItemAttachmentSession.completionTimeStamp = undefined;

            await rentalItemAttachmentSession.save();

            const serviceResourceSession = await ServiceResourceSession.findOne({ _id: rentalItemAttachmentSession.serviceResourceSessionId });

            if (serviceResourceSession) {

                serviceResourceSession.activeRentalItemAttachmentSessionId = rentalItemAttachmentSession._id.toString();

                serviceResourceSession.activationTimeStamp = (new Date()).getTime();
                serviceResourceSession.abortionTimeStamp = undefined;
                serviceResourceSession.completionTimeStamp = undefined;

                await serviceResourceSession.save();

                const rentalItemSession = await RentalItemSession.findOne({ _id: serviceResourceSession.rentalItemSessionId });

                if (rentalItemSession) {

                    rentalItemSession.activeServiceResourceSessionId = serviceResourceSession._id.toString();

                    rentalItemSession.activationTimeStamp = (new Date()).getTime();
                    rentalItemSession.abortionTimeStamp = undefined;
                    rentalItemSession.completionTimeStamp = undefined;

                    await rentalItemSession.save();

                    res.status(200).send({
                        msg: 'successful'
                    });
                    return;
                }
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async abort1(req: Request, res: Response, next: NextFunction) {

        const rentalItemAttachmentSession = await RentalItemAttachmentSession.findOne({ _id: req.params.id });

        if (rentalItemAttachmentSession) {
            rentalItemAttachmentSession.activationTimeStamp = undefined;
            rentalItemAttachmentSession.abortionTimeStamp = (new Date()).getTime();
            rentalItemAttachmentSession.completionTimeStamp = undefined;

            const serviceResourceSession = await ServiceResourceSession.findOne({ _id: rentalItemAttachmentSession.serviceResourceSessionId });

            if (serviceResourceSession) {
                if (serviceResourceSession.activeRentalItemAttachmentSessionId === rentalItemAttachmentSession._id.toString()) {
                    serviceResourceSession.activeRentalItemAttachmentSessionId = undefined;

                    await serviceResourceSession.save();
                }

                res.status(200).send({
                    msg: 'successful'
                });
                return;
            }
        }

        next('Something went wrong. Please, try again.');
    }

    async complete1(req: Request, res: Response, next: NextFunction) {

        const rentalItemAttachmentSession = await RentalItemAttachmentSession.findOne({ _id: req.params.id });

        if (rentalItemAttachmentSession) {
            rentalItemAttachmentSession.abortionTimeStamp = undefined;
            rentalItemAttachmentSession.activationTimeStamp = undefined;
            rentalItemAttachmentSession.completionTimeStamp = (new Date()).getTime();
        }

        next('Something went wrong. Please, try again.');
    }

}

const rentalItemsAttachmentsSessionsController = new RentalItemsAttachmentsSessionsController();

export default rentalItemsAttachmentsSessionsController;
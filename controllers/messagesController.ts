import { NextFunction, Request, Response } from "express";
import { USER_TARGET } from "../config/constants";
import Message, { IMessage } from "../db/models/Message";
import User, { IUser } from "../db/models/users/User";
import { properlizeWords } from "../helpers";
import { tryEmail } from "../serviceProviders/emailer";
import Customer from "../db/models/users/Customer";

interface IConversationData {
    pair: any;      //await user.getFields()
    messages: any[];        //arr of (await message.getFields())
}

const converations: IConversationData[] = [];

class MessagesController {

    async getBaseConversationsData(messages: any, subjectId: string) {
        let baseConvos: any[] = [];

        for (const msg of messages) {

            let pairConvoAdded = false;

            for (const baseConvo of baseConvos) {
                if ((baseConvo.pair._id === msg.senderUserId) || (baseConvo.pair._id.toString() === msg.receiverUserId)) {
                    pairConvoAdded = true;
                    break;
                }
            }

            if (!pairConvoAdded) {

                const pair = await User.findOne({ _id: (msg.senderUserId === subjectId) ? msg.receiverUserId : msg.senderUserId });

                if (pair) {
                    baseConvos = [
                        ...baseConvos,
                        {
                            pair: await pair.getFields(),
                            messages: [await msg.getFields()]
                        }
                    ]
                }
            }
        }

        return baseConvos;
    }

    async getConversations4UserWithId(_id: string) {

        const controller = new MessagesController();

        //fetch all the direct messages of user
        let query = Message.find({ targetType: USER_TARGET });

        let ors: { [field: string]: string }[] = [{ senderUserId: _id }, { receiverUserId: _id }];


        query = query.or(ors);

        const messages = await query.exec();

        if (messages) {
            //sort the messages into conversations (each containing 1 message: the first message)
            const baseConversationsData = await controller.getBaseConversationsData(messages, _id);

            if (baseConversationsData) {
                let conversationsData: IConversationData[] = [];

                for (const conversation of baseConversationsData) {

                    let query2 = Message.find({ targetType: USER_TARGET });

                    let ors2 = [{ senderUserId: _id, receiverUserId: conversation.pair._id }, { senderUserId: conversation.pair._id, receiverUserId: _id }];

                    query2 = query2.or(ors2);

                    const messages2 = await query2.exec();
                    let messagesData: any[] = [];

                    if (messages2) {
                        for (const msg of messages2) {
                            messagesData = [
                                ...messagesData,
                                await msg.getFields()
                            ]
                        }
                    }


                    conversationsData = [
                        ...conversationsData,
                        {
                            pair: conversation.pair,
                            messages: messagesData
                        }
                    ]
                }

                return conversationsData;
            }
        }

        return [];
    }


    async sendMessage(req: Request, res: Response, next: NextFunction) {

        const sender = await User.findOne({email: "annonymous001@gmail.com"});

        if (!sender) {
            next('Something went wrong. Please, try again.');
            return;
        }

        const data = {
            parentId: (req.body?.parentId && (req.body?.parentId !== '')) ? req.body?.parentId : undefined,
            senderUserId: sender._id.toString(),
            targetType: req.body.targetType,
            targetId: req.body.targetId,
            content: req.body.content
        }

        const message = await Message.create(data);

        if (message) {
            const sender = await User.findOne({ _id: message.senderUserId });
            const receiver = await User.findOne({ _id: (await message.deduceReceiverUserId()) });

            if (receiver && sender) {
                const emailData = {
                    receiverFirstName: properlizeWords(receiver.firstName),
                    senderFirstName: properlizeWords(sender.firstName),
                    content: message.content
                }

                try {
                    await tryEmail('messageDelivery', receiver.email, `Message From ${properlizeWords(sender.firstName)}.`, emailData);

                    res.status(200).send({
                        msg: 'Message sent successfully',
                        receiverUserId: receiver._id.toString()
                    });
                    return;
                } catch (err) {
                    console.log('sendMessage:: ', err);
                    next("Messaged sent successfully, but receiver could not be sent an e-mail notification");
                    return;
                }
            }

            //TODO: notify the receiver of the user about the message
        }

        next('Something went wrong. Please, try again.');
    }

    async fetchMessages4Target(req: Request, res: Response, next: NextFunction) {

        // console.log('target-type: ', req.query.targetType);

        const messages = await Message.find({ targetId: req.query.targetId as string });

        if (messages) {
            let data: any[] = [];

            for (const msg of messages) {

                if (!msg?.parentId) {
                    data = [
                        ...data,
                        await msg.getFields()
                    ];
                }
            }

            res.status(200).send(data);
            return;
        }

        next('Something went wrong. Please, try again.');
    }
}

const messagesConrtoller = new MessagesController();

export default messagesConrtoller;
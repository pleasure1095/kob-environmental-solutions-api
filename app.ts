var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

import * as dotenv from 'dotenv';
var cors = require('cors');
const http = require('http');


dotenv.config();

declare global {
    var __basedir: string;
}

global.__basedir = __dirname;

import { Request, Response } from 'express';
import { Server } from 'socket.io';
import servicesRouter from './expressValidators/services';
import handleRouteError from './middlewares/handleRouteErr';
import notFound from './middlewares/notFound';
import adminsRouter from './routes/admins';
import authRouter from './routes/auth';
import authenticatorsSetupsRouter from './routes/authenticatorsSetups';
import companiesRouter from './routes/companies';
import customersRouter from './routes/customers';
import customFieldsRouter from './routes/customFields';
import driversRouter from './routes/drivers';
import emailTokensRouter from './routes/emailTokens';
import messagesRouter from './routes/messages';
import notificationsRouter from './routes/notifications';
import ordersRouter from './routes/orders';
import paymentsRouter from './routes/payments';
import rentalItemsRouter from './routes/rentalItems';
import rentalItemsAttachmentsRouter from './routes/rentalItemsAttachments';
import rentalItemsAttachmentsSessionsRouter from './routes/rentalItemsAttachmentsSessions';
import rentalItemsSessionsRouter from './routes/rentalItemsSessions';
import rentalsTimeFrameExtensionsRouter from './routes/rentalsTimeFramesExtensions';
import rolesRouter from './routes/roles';
import servicesResourcesRouter from './routes/servicesResources';
import servicesResourcesSessionsRouter from './routes/servicesResourcesSessions';
import sitesRouter from './routes/sites';
import staffsRouter from './routes/staffs';
import statsRouter from './routes/stats';
import unitsRouter from './routes/units';
import usersRouter from './routes/users';
import { forwardMessageNotification2Receiver, USER_MESSAGE_AVAILABLE } from './serviceProviders/socketIOManager';

require('./db/index');

console.log("App: ", process.env.APP_NAME)

var app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', authRouter);
app.use('/api', emailTokensRouter);
app.use('/api', authenticatorsSetupsRouter);
app.use('/api', usersRouter);
app.use('/api', customersRouter);
app.use('/api', adminsRouter);
app.use('/api', staffsRouter);
app.use('/api', driversRouter);
app.use('/api', rolesRouter);
app.use('/api', customFieldsRouter);
app.use('/api', companiesRouter);
app.use('/api', sitesRouter);
app.use('/api', notificationsRouter);
app.use('/api', ordersRouter);
app.use('/api', paymentsRouter);
app.use('/api', rentalItemsRouter);
app.use('/api', rentalsTimeFrameExtensionsRouter);
app.use('/api', rentalItemsAttachmentsRouter);
app.use('/api', unitsRouter);
app.use('/api', servicesResourcesRouter);
app.use('/api', servicesRouter);
app.use('/api', messagesRouter);
app.use('/api', statsRouter);
app.use('/api', rentalItemsSessionsRouter);
app.use('/api', servicesResourcesSessionsRouter);
app.use('/api', rentalItemsAttachmentsSessionsRouter);


app.get('*', (req: Request, res: Response) => res.sendFile(path.join(__dirname + '/public/index.html')));

app.use(notFound);
app.use(handleRouteError);


app.get('*', (req: Request, res: Response) => {
    res.status(404).json({ message: 'NOT FOUND' });
});

export const server = http.createServer(app);

//initialize web-socket server
const io = new Server(server, {
  cors: {
    origin: process.env.APP_HOST_NAME,
    methods: ["GET", "POST"]
  }
});

io.on('connection', socket => {
  console.log(`New socket with ID: ${socket.id}`);
    

    socket.on(USER_MESSAGE_AVAILABLE, forwardMessageNotification2Receiver);
});


export default app;

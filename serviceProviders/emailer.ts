var nodemailer = require('nodemailer');
const Email = require('email-templates');

console.log("app-name ", process.env.APP_NAME);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    service: process.env.SMTP_SERVICE,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
    },
    secure: true,

});

transporter.verify((err: any, success: any) => {
    console.log('tried to verify smtp connection');

    if (err) {
        console.log('Connection to SMTP server failed :', err);
    } else {
        console.log('Connetion to SMTP server successful');
    }
});


export const email = new Email({
    views: { options: { extension: 'ejs' } },
    message: {
        from: process.env.SMTP_USERNAME,
        attachments: []
    },
    preview: false,
    send: true,
    transport: transporter
})

export async function tryEmail(template: string, emailAddr: string, subject: string, emailData: any) {
    return await email.send({
        template: template,
        message: {
            to: emailAddr,
            subject: subject
        },
        locals: emailData
    });
}

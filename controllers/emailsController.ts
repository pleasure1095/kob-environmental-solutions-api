import { Request } from "express";
import { email } from "../serviceProviders/emailer";

class EmailsController {
    async tryResendPrevEmail4Payment(req: Request) {
        
    }

    async tryEmail(template: string, emailAddr: string, subject: string, emailData: any) {
        return await email.send({
            template: template,
            message: {
                to: emailAddr,
                subject: subject
            },
            locals: emailData
        });
    }

}

const emailsController = new EmailsController();

export default emailsController;
import * as mst from "mustache";
import { Config } from "./config";
import winston = require("winston");
import * as nodemailer from "nodemailer";

export async function sendEmail(
    config: Config,
    to: string | string [],
    subject: string,
    emailText: string,
    referrerPage: string,
): Promise<void> {
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        tls: { rejectUnauthorized: false },
    });

    const emailMessage = {
        from: config.fromEmail,
        subject : subject || mst.render(config.subject, { referrerUrl: referrerPage }),
        text: emailText,
        to: to || config.recipientEmails,
    };

    winston.debug(`Sending email.`);
    await transporter.sendMail(emailMessage);
    winston.info(`Message has been sent to ${to}`);
}

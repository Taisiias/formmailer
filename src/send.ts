import * as nodemailer from "nodemailer";
import winston = require("winston");
import { Config } from "./config";

export async function sendEmail(
    config: Config,
    to: string | string[],
    subject: string,
    text: string,
): Promise<void> {
    const transporter = nodemailer.createTransport(config.smtpOptions);

    const emailMessage = {
        from: config.fromEmail,
        html: "<h1>HTML email</h1>",
        subject,
        text,
        to,
    };

    winston.debug(`Sending email.`);
    await transporter.sendMail(emailMessage);
    winston.info(`Message has been sent to ${to}`);
}

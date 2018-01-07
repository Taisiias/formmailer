import * as nodemailer from "nodemailer";
import winston = require("winston");
import { Config } from "./config";

export async function sendEmail(
    config: Config,
    to: string | string[],
    subject: string,
    text: string,
    html: string,
): Promise<void> {
    const transporter = nodemailer.createTransport(config.smtpOptions);
    winston.debug(`Test Subject: ${text}`);
    const emailMessage = {
        from: config.fromEmail,
        html: config.enableHtmlEmail ? html : "",
        subject,
        text,
        to,
    };

    winston.debug(`Sending email.`);
    await transporter.sendMail(emailMessage);
    winston.info(`Message has been sent to ${to}`);
}

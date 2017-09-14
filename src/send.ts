import { Config } from "./config";
import winston = require("winston");
import * as nodemailer from "nodemailer";

export async function sendEmail(
    config: Config,
    to: string | string[],
    subject: string,
    text: string,
): Promise<void> {
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        tls: { rejectUnauthorized: false },
    });

    const emailMessage = {
        from: config.fromEmail,
        subject,
        text,
        to,
    };

    winston.debug(`Sending email.`);
    await transporter.sendMail(emailMessage);
    winston.info(`Message has been sent to ${to}`);
}

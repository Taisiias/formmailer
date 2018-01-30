import { getLogger } from "log4js";
import * as nodemailer from "nodemailer";
import { Config } from "./config";

export async function sendEmail(
    config: Config,
    to: string | string[],
    subject: string,
    text: string,
    html: string,
): Promise<void> {

    const logger = getLogger("formMailer");

    const transporter = nodemailer.createTransport(config.smtpOptions);
    const emailMessage = {
        from: config.fromEmail,
        html: config.enableHtmlEmail ? html : "",
        subject,
        text,
        to,
    };

    logger.debug(`Sending email.`);
    await transporter.sendMail(emailMessage);
    logger.info(`Message has been sent to ${to}`);
}

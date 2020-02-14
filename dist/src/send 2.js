"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_1 = require("log4js");
const nodemailer = require("nodemailer");
function sendEmail(config, to, subject, text, html) {
    return __awaiter(this, void 0, void 0, function* () {
        const logger = log4js_1.getLogger("formMailer");
        const transporter = nodemailer.createTransport(config.smtpOptions);
        const emailMessage = {
            from: config.fromEmail,
            html: config.enableHtmlEmail ? html : "",
            subject,
            text,
            to,
        };
        logger.debug(`Sending email.`);
        yield transporter.sendMail(emailMessage);
        logger.info(`Message has been sent to ${to}`);
    });
}
exports.sendEmail = sendEmail;

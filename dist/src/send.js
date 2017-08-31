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
const mst = require("mustache");
const winston = require("winston");
const nodemailer = require("nodemailer");
function sendEmail(config, emailText, referrerPage) {
    return __awaiter(this, void 0, void 0, function* () {
        const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            tls: { rejectUnauthorized: false },
        });
        const emailMessage = {
            from: config.fromEmail,
            subject: mst.render(config.subject, { referrerUrl: referrerPage }),
            text: emailText,
            to: config.recipientEmails,
        };
        winston.debug(`Sending email.`);
        yield transporter.sendMail(emailMessage);
        winston.info(`Message has been sent to ${config.recipientEmails}`);
    });
}
exports.sendEmail = sendEmail;

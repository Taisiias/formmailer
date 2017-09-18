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
const fs = require("fs");
const mst = require("mustache");
const qs = require("querystring");
const winston = require("winston");
const url = require("url");
const captcha_1 = require("./captcha");
const database_1 = require("./database");
const helpers_1 = require("./form-target/helpers");
const message_1 = require("./message");
const send_1 = require("./send");
const stream_1 = require("./stream");
const EMAIL_TEMPLATE_PATH = "./assets/email-template.mst";
const THANKS_URL_PATH = "/thanks";
const SUBMIT_URL_PATH = "/submit";
class NotFoundError extends Error {
}
function formHandler(config, key, req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const bodyStr = yield stream_1.readReadable(req, config.maxHttpRequestSize);
        const post = qs.parse(bodyStr);
        yield captcha_1.checkCaptcha(post["g-recaptcha-response"], config.requireReCaptchaResponse, req.connection.remoteAddress, config.reCaptchaSecret);
        let userMessage = yield message_1.constructUserMessage(post);
        winston.debug(`User Message: ${userMessage}`);
        const referrerUrl = post._formurl || req.headers.Referrer || "Unspecified URL";
        const formName = post._formname ? `Submitted form: ${post._formname}\n` : "";
        const template = fs.readFileSync(EMAIL_TEMPLATE_PATH).toString();
        const templateData = {
            incomingIp: req.connection.remoteAddress,
            referrerUrl,
            formName,
            userMessage,
        };
        userMessage = mst.render(template, templateData);
        let subject = config.subject;
        let recepients = config.recipientEmails;
        if (key) {
            const formTargetSubject = helpers_1.getSubject(config, key);
            subject = formTargetSubject ? formTargetSubject : subject;
            const formTargetRecepients = helpers_1.getRecipients(config, key);
            recepients = formTargetRecepients ? formTargetRecepients : recepients;
        }
        const renderedSubject = mst.render(subject, { referrerUrl, formName });
        yield send_1.sendEmail(config, recepients, renderedSubject, userMessage);
        database_1.insertEmail(config.databaseFileName, req.connection.remoteAddress, bodyStr, referrerUrl, formName, recepients, userMessage);
        const redirectUrl = post._redirect || THANKS_URL_PATH;
        winston.debug(`Redirecting to ${redirectUrl}`);
        res.writeHead(303, { Location: redirectUrl });
        res.end();
    });
}
function requestHandler(config, req, res, fileServer) {
    return __awaiter(this, void 0, void 0, function* () {
        winston.debug(`Incoming request: ${req.url} (method: ${req.method})`);
        const urlPathName = url.parse(req.url, true);
        if (urlPathName.pathname
            && urlPathName.pathname.toString().startsWith(SUBMIT_URL_PATH)
            && req.method === "POST") {
            let key = "";
            winston.debug(`Provided urlPathName: "${urlPathName.pathname}"`);
            key = urlPathName.pathname.slice(urlPathName.pathname.lastIndexOf("/submit") + 8);
            if (key.endsWith("/")) {
                key = key.slice(0, key.lastIndexOf("/"));
            }
            winston.debug(`Provided form target key: "${key}"`);
            if (key) {
                if (!config.formTargets.hasOwnProperty(key)) {
                    throw new NotFoundError(`Target form "${key}" doesn't exist in config.`);
                }
            }
            yield formHandler(config, key, req, res);
        }
        else if (urlPathName.pathname === THANKS_URL_PATH) {
            fileServer.serveFile("thanks.html", 200, {}, req, res);
        }
        else {
            throw new NotFoundError(`Incorrect request: ${urlPathName.pathname} (${req.method})`);
        }
    });
}
function constructConnectionHandler(config, fileServer) {
    return (req, res) => {
        requestHandler(config, req, res, fileServer).catch((err) => {
            winston.warn(`Error in Connection Handler: ${err}`);
            if (err instanceof NotFoundError) {
                fileServer.serveFile("error404.html", 404, {}, req, res);
                return;
            }
            if (err instanceof captcha_1.RecaptchaFailure) {
                res.end();
                return;
            }
            fileServer.serveFile("error502.html", 502, {}, req, res);
        });
    };
}
exports.constructConnectionHandler = constructConnectionHandler;

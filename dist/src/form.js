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
const captcha_1 = require("./captcha");
const database_1 = require("./database");
const helpers_1 = require("./form-target/helpers");
const handler_1 = require("./handler");
const header_1 = require("./header");
const message_1 = require("./message");
const send_1 = require("./send");
const stream_1 = require("./stream");
const EMAIL_TEMPLATE_PATH = "./assets/email-template.mst";
class NotFoundError extends Error {
}
exports.NotFoundError = NotFoundError;
function formHandler(config, pathname, req, res, isAjax) {
    return __awaiter(this, void 0, void 0, function* () {
        // getting form target key if there is one
        let formTargetKey = "";
        winston.debug(`Provided URL path name: "${pathname}"`);
        formTargetKey = pathname.slice(pathname.lastIndexOf("/submit") + 8);
        if (formTargetKey.endsWith("/")) {
            formTargetKey = formTargetKey.slice(0, formTargetKey.lastIndexOf("/"));
        }
        winston.debug(`Provided form target key: "${formTargetKey}"`);
        if (formTargetKey) {
            if (!config.formTargets.hasOwnProperty(formTargetKey)) {
                throw new NotFoundError(`Target form "${formTargetKey}" doesn't exist in config.`);
            }
        }
        // getting posted data from the request
        const bodyStr = yield stream_1.readReadable(req, config.maxHttpRequestSize);
        const postedData = isAjax ? JSON.parse(bodyStr) : qs.parse(bodyStr);
        winston.debug(`Request body: ${JSON.stringify(postedData)}`);
        // gathering information
        const incomingIp = req.connection.remoteAddress || "unknown remote address";
        const refererUrl = getRefererUrl(postedData, req);
        const formName = postedData._formname ? `Submitted form: ${postedData._formname}\n` : "";
        yield captcha_1.checkCaptcha(postedData["g-recaptcha-response"], config.requireReCaptchaResponse, incomingIp, config.reCaptchaSecret);
        // rendering email contents
        const fieldsValuesStr = yield message_1.constructFieldsValuesStr(postedData);
        winston.debug(`Fields: ${fieldsValuesStr}`);
        const template = fs.readFileSync(EMAIL_TEMPLATE_PATH).toString();
        const templateData = {
            fieldsValuesStr,
            formName,
            incomingIp,
            refererUrl,
        };
        const emailMessage = mst.render(template, templateData);
        // getting email subject and recepients
        const subject = helpers_1.getSubject(config, formTargetKey);
        const recepients = helpers_1.getRecipients(config, formTargetKey);
        const renderedSubject = mst.render(subject, { refererUrl, formName });
        // sending and saving email
        yield send_1.sendEmail(config, recepients, renderedSubject, emailMessage);
        database_1.saveEmailToDB(config.databaseFileName, incomingIp, bodyStr, refererUrl, formName, recepients, emailMessage);
        // preparing response
        if (isAjax) {
            header_1.setCorsHeaders(res);
            res.setHeader("content-type", "application/json");
            res.write(JSON.stringify({ result: "ok" }));
        }
        else {
            const redirectUrl = postedData._redirect || handler_1.THANKS_URL_PATH;
            winston.debug(`Redirecting to ${redirectUrl}`);
            res.writeHead(303, { Location: redirectUrl });
        }
        res.end();
    });
}
exports.formHandler = formHandler;
function getRefererUrl(post, req) {
    const headerRefererUrl = (req.headers.referer instanceof Array) ?
        req.headers.referer[0] : req.headers.referer;
    return post._formurl || headerRefererUrl || "Unspecified URL";
}

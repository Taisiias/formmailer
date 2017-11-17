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
const winston = require("winston");
const database_1 = require("./database");
const helpers_1 = require("./form-target/helpers");
const handler_1 = require("./handler");
const header_1 = require("./header");
const message_1 = require("./message");
const recaptcha_1 = require("./recaptcha");
const request_1 = require("./request");
const send_1 = require("./send");
class NotFoundError extends Error {
}
exports.NotFoundError = NotFoundError;
function submitHandler(config, pathname, req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const [parsedRequestData, bodyStr] = yield request_1.parseRequestData(req, config.maxHttpRequestSize);
        winston.debug(`Parsed Request Data ${JSON.stringify(parsedRequestData)}`);
        // gathering information
        const senderIpAddress = req.connection.remoteAddress || "unknown remote address";
        const reCaptchaPassed = recaptcha_1.processReCaptcha(config, parsedRequestData, senderIpAddress, res);
        if (!reCaptchaPassed) {
            return;
        }
        const refererUrl = getRefererUrl(parsedRequestData, req);
        const formName = parsedRequestData._formname ?
            `Submitted form: ${parsedRequestData._formname}\n` : "";
        const isAjax = request_1.isAjaxRequest(req);
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
        const [plainTextEmailMessage, htmlEmailMessage] = message_1.renderEmailContent(parsedRequestData, formName, refererUrl, senderIpAddress);
        // getting email subject and recepients
        const subject = helpers_1.getSubject(config, formTargetKey);
        const recepients = helpers_1.getRecipients(config, formTargetKey);
        const renderedSubject = message_1.renderSubject(subject, refererUrl, formName);
        // sending and saving email
        yield send_1.sendEmail(config, recepients, renderedSubject, plainTextEmailMessage, htmlEmailMessage);
        yield database_1.saveEmailToDB(config.databaseFileName, senderIpAddress, bodyStr, refererUrl, formName, recepients, plainTextEmailMessage);
        // preparing response
        if (isAjax) {
            header_1.setCorsHeaders(res);
            res.setHeader("content-type", "application/json");
            res.write(JSON.stringify({ result: "ok" }));
        }
        else {
            const redirectUrl = parsedRequestData._redirect || handler_1.THANKS_URL_PATH;
            winston.debug(`Redirecting to ${redirectUrl}`);
            res.writeHead(303, { Location: redirectUrl });
        }
        res.end();
    });
}
exports.submitHandler = submitHandler;
function getRefererUrl(post, req) {
    const headerRefererUrl = (req.headers.referer instanceof Array) ?
        req.headers.referer[0] : req.headers.referer;
    return post._formurl || headerRefererUrl || "Unspecified URL";
}

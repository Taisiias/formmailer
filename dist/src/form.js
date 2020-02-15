"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const mst = require("mustache");
const log4js_1 = require("log4js");
const asset_1 = require("./asset");
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
        const [parsedRequestData, bodyStr, isAjax] = yield request_1.parseRequestData(req, config.maxHttpRequestSize);
        log4js_1.getLogger("formMailer").debug(`Parsed Request Data ${JSON.stringify(parsedRequestData)}`);
        const senderIpAddress = req.connection.remoteAddress || "unknown remote address";
        if (!(yield recaptcha_1.processReCaptcha(config, parsedRequestData, senderIpAddress, res, pathname, isAjax))) {
            return;
        }
        const refererUrl = getRefererUrl(parsedRequestData, req);
        // getting form target key if there is one
        const formTargetKey = getFormTargetKey(config, pathname);
        const renderedSubject = message_1.renderSubject(helpers_1.getSubjectTemplate(config, formTargetKey), refererUrl, parsedRequestData._formname);
        const [plainTextEmailMessage, htmlEmailMessage] = message_1.renderEmailContent(parsedRequestData, refererUrl, senderIpAddress, config.assetsFolder);
        const recepients = helpers_1.getRecipients(config, formTargetKey);
        yield send_1.sendEmail(config, recepients, renderedSubject, plainTextEmailMessage, htmlEmailMessage);
        yield database_1.saveEmailToDB(config.databaseFileName, senderIpAddress, bodyStr, refererUrl, parsedRequestData._formname, recepients, plainTextEmailMessage);
        // preparing response
        if (isAjax) {
            header_1.setCorsHeaders(res);
            res.setHeader("content-type", "application/json");
            res.write(JSON.stringify({ result: "ok" }));
        }
        else {
            const redirectUrl = parsedRequestData._redirect || handler_1.THANKS_URL_PATH;
            log4js_1.getLogger("formMailer").debug(`Redirecting to ${redirectUrl}`);
            res.writeHead(303, { Location: redirectUrl });
        }
        res.end();
    });
}
exports.submitHandler = submitHandler;
function viewEmailHistory(res, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const htmlTemplate = fs.readFileSync(asset_1.getAssetFolderPath(config.assetsFolder, "view.html")).toString();
        const sentEmails = yield database_1.loadSentEmailsInfo(config.databaseFileName);
        const templateData = {
            sentEmails,
        };
        log4js_1.getLogger("formMailer").debug(`Rendering View sent emails page.`);
        const renderedHtml = mst.render(htmlTemplate, templateData);
        res.write(renderedHtml);
        res.end();
    });
}
exports.viewEmailHistory = viewEmailHistory;
function getFormTargetKey(config, pathname) {
    let formTargetKey = "";
    log4js_1.getLogger("formMailer").debug(`Provided URL path name: "${pathname}"`);
    formTargetKey = pathname.slice(pathname.lastIndexOf("/submit") + 8);
    if (formTargetKey.endsWith("/")) {
        formTargetKey = formTargetKey.slice(0, formTargetKey.lastIndexOf("/"));
    }
    log4js_1.getLogger("formMailer").debug(`Provided form target key: "${formTargetKey}"`);
    if (formTargetKey) {
        if (!config.formTargets.hasOwnProperty(formTargetKey)) {
            throw new NotFoundError(`Target form "${formTargetKey}" doesn't exist in config.`);
        }
    }
    return formTargetKey;
}
function getRefererUrl(post, req) {
    const ref = req.headers.referer;
    if (typeof ref === "undefined") {
        return post._formurl || "Unspecified URL";
    }
    else if (ref instanceof Array) {
        return ref[0];
    }
    else {
        return ref;
    }
}

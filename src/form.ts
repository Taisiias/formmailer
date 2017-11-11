import * as fs from "fs";
import * as http from "http";
import * as mst from "mustache";
import winston = require("winston");
import { processReCaptcha, RecaptchaFailure } from "./captcha";
import { Config } from "./config";
import { saveEmailToDB } from "./database";
import { getRecipients, getSubject } from "./form-target/helpers";
import { SUBMIT_URL_PATH, THANKS_URL_PATH } from "./handler";
import { setCorsHeaders } from "./header";
import { constructFieldsArrayForMustache } from "./message";
import { isAjaxRequest, parseRequestData } from "./request";
import { sendEmail } from "./send";

const PLAIN_TEXT_EMAIL_TEMPLATE_PATH = "./assets/plain-text-email-template.mst";
const HTML_EMAIL_TEMPLATE_PATH = "./assets/html-email-template.html";

export class NotFoundError extends Error { }

export async function submitHandler(
    config: Config,
    pathname: string,
    req: http.IncomingMessage,
    res: http.ServerResponse,
): Promise<void> {
    const [parsedRequestData, bodyStr] = await parseRequestData(req, config.maxHttpRequestSize);
    winston.debug(`Parsed Request Data ${JSON.stringify(parsedRequestData)}`);

    // gathering information
    const senderIpAddress = req.connection.remoteAddress || "unknown remote address";
    const refererUrl = getRefererUrl(parsedRequestData, req);

    const isAjax = isAjaxRequest(req);

    // TODO: separate recaptcha logic into separate function.
    if (!config.disableRecaptcha && config.reCaptchaSecret) {
        if (parsedRequestData["g-recaptcha-response"]) {
            await processReCaptcha(
                parsedRequestData["g-recaptcha-response"],
                config.disableRecaptcha,
                senderIpAddress,
                config.reCaptchaSecret);
        } else {

            if (!config.reCaptchaSiteKey) {
                throw new RecaptchaFailure(
                    `reCaptcha is enabled but site-key is not provided`);
            }
            renderAutomaticRecaptchaPage(config, parsedRequestData, res);
            return;
        }
    }
    // TODO: join with formHandler() and refactor.
    await formHandler(
        config, pathname, isAjax, res, parsedRequestData, bodyStr, senderIpAddress, refererUrl);
}

function renderAutomaticRecaptchaPage(
    config: Config,
    postedData: { [k: string]: string },
    res: http.ServerResponse,
): void {
    const htmlTemplate = fs.readFileSync("./assets/recaptcha.html").toString();
    const templateData = {
        dataSiteKey: config.reCaptchaSiteKey,
        parsedRequestData: JSON.stringify(postedData),
        submitUrl: SUBMIT_URL_PATH,
        thanksPageUrl: postedData._redirect || THANKS_URL_PATH,
    };
    winston.debug(`Rendering Automatic reCaptcha page.`);
    const renderedHtml = mst.render(htmlTemplate, templateData);
    res.write(renderedHtml);
    res.end();
}

async function formHandler(
    config: Config,
    pathname: string,
    isAjax: boolean,
    res: http.ServerResponse,
    postedData: { [k: string]: string },
    bodyStr: string,
    senderIpAddress: string,
    refererUrl: string,
): Promise<void> {

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

    // gathering information
    const formName = postedData._formname ? `Submitted form: ${postedData._formname}\n` : "";

    // rendering email contents
    const mustacheTemplateData = constructFieldsArrayForMustache(postedData);

    const plainTextEmailTemplate = fs.readFileSync(PLAIN_TEXT_EMAIL_TEMPLATE_PATH).toString();
    const htmlEmailTemplate = fs.readFileSync(HTML_EMAIL_TEMPLATE_PATH).toString();

    const templateData = {
        formName,
        mustacheTemplateData,
        refererUrl,
        senderIpAddress,
    };

    const plainTextEmailMessage = mst.render(plainTextEmailTemplate, templateData);
    const htmlEmailMessage = mst.render(htmlEmailTemplate, templateData);

    // getting email subject and recepients
    const subject = getSubject(config, formTargetKey);
    const recepients = getRecipients(config, formTargetKey);

    const renderedSubject = mst.render(subject, { refererUrl, formName });

    // sending and saving email
    await sendEmail(config, recepients, renderedSubject, plainTextEmailMessage, htmlEmailMessage);

    await saveEmailToDB(
        config.databaseFileName, senderIpAddress, bodyStr, refererUrl, formName,
        recepients, plainTextEmailMessage);

    // preparing response
    if (isAjax) {
        setCorsHeaders(res);
        res.setHeader("content-type", "application/json");
        res.write(JSON.stringify({ result: "ok" }));
    } else {
        const redirectUrl = postedData._redirect || THANKS_URL_PATH;
        winston.debug(`Redirecting to ${redirectUrl}`);
        res.writeHead(303, { Location: redirectUrl });
    }
    res.end();
}

function getRefererUrl(
    post: { [k: string]: string },
    req: http.IncomingMessage,
): string {
    const headerRefererUrl: string =
        (req.headers.referer instanceof Array) ?
            req.headers.referer[0] : req.headers.referer as string;

    return post._formurl || headerRefererUrl || "Unspecified URL";
}

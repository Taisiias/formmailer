import * as fs from "fs";
import * as http from "http";
import * as mst from "mustache";
import * as ns from "node-static";
import * as qs from "querystring";
import * as url from "url";
import winston = require("winston");
import { checkCaptcha, RecaptchaFailure } from "./captcha";
import { Config } from "./config";
import { saveEmailToDB } from "./database";
import { getRecipients, getSubject } from "./form-target/helpers";
import { constructFieldsValuesStr } from "./message";
import { sendEmail } from "./send";
import { readReadable } from "./stream";

const EMAIL_TEMPLATE_PATH = "./assets/email-template.mst";
const THANKS_URL_PATH = "/thanks";
const SUBMIT_URL_PATH = "/submit";

class NotFoundError extends Error { }

// TODO: extract form handling operations to form.ts
// TODO: divide function to reduce cyclomatic complexity
// tslint:disable:cyclomatic-complexity
async function formHandler(
    config: Config,
    pathname: string,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    isAjax: boolean,
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

    // getting posted data from the request
    const bodyStr = await readReadable(req, config.maxHttpRequestSize);
    const postedData: { [k: string]: string } = isAjax ? JSON.parse(bodyStr) : qs.parse(bodyStr);
    winston.debug(`Request body: ${JSON.stringify(postedData)}`);

    // gathering information
    const incomingIp = req.connection.remoteAddress || "unknown remote address";
    const refererUrl = getRefererUrl(postedData, req);
    const formName = postedData._formname ? `Submitted form: ${postedData._formname}\n` : "";

    await checkCaptcha(
        postedData["g-recaptcha-response"],
        config.requireReCaptchaResponse,
        incomingIp,
        config.reCaptchaSecret);

    // rendering email contents
    const fieldsValuesStr = await constructFieldsValuesStr(postedData);
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
    let subject = config.subject;
    let recepients = config.recipientEmails;
    if (formTargetKey) {
        const formTargetSubject = getSubject(config, formTargetKey);
        subject = formTargetSubject ? formTargetSubject : subject;
        const formTargetRecepients = getRecipients(config, formTargetKey);
        recepients = formTargetRecepients ? formTargetRecepients : recepients;
    }
    const renderedSubject = mst.render(subject, { refererUrl, formName });

    // sending and saving email
    await sendEmail(config, recepients, renderedSubject, emailMessage);
    saveEmailToDB(config.databaseFileName, incomingIp, bodyStr, refererUrl, formName,
                  recepients, emailMessage);

    // preparing response
    if (isAjax) {
        res.setHeader("content-type", "application/json");
        res.write(JSON.stringify({ result: "OK" }));
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

async function routeRequest(
    config: Config,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    fileServer: ns.Server,
    isAjax: boolean,
): Promise<void> {
    const parsedUrl = url.parse(req.url as string, true);
    if (parsedUrl.pathname &&
            parsedUrl.pathname.toString().startsWith(SUBMIT_URL_PATH) &&
            req.method === "POST") {
        await formHandler(config, parsedUrl.pathname, req, res, isAjax);
    } else if (parsedUrl.pathname === THANKS_URL_PATH) {
        await fileServer.serveFile("thanks.html", 200, {}, req, res);
    } else {
        throw new NotFoundError(`Incorrect request: ${parsedUrl.pathname} (${req.method})`);
    }
}

function isAjaxRequest(req: http.IncomingMessage): boolean {
    return req.headers["content-type"] === "application/json" ||
        req.headers["content-type"] === "application/javascript";
}

async function errorHandler(
    err: Error,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    fileServer: ns.Server,
    isAjax: boolean,
): Promise<void> {
    winston.warn(`Error in Connection Handler: ${err}`);

    if (isAjax) {
        res.statusCode = err instanceof NotFoundError ? 404 : 502;
        res.setHeader("content-type", "application/json");
        res.write(JSON.stringify({ result: "error", description: err.message }));
        res.end();
        return;
    }

    if (err instanceof NotFoundError) {
        await fileServer.serveFile("error404.html", 404, {}, req, res);
        return;
    }
    if (err instanceof RecaptchaFailure) {
        res.end();
        return;
    }
    await fileServer.serveFile("error502.html", 502, {}, req, res);
}

export function constructConnectionHandler(
    config: Config,
    fileServer: ns.Server,
): (req: http.IncomingMessage, res: http.ServerResponse) => void {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
        winston.debug(`Incoming request: ${req.url} (method: ${req.method})`);

        // set CORS headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Request-Method", "*");
        res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        if (req.method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
        }

        const isAjax = isAjaxRequest(req);
        routeRequest(config, req, res, fileServer, isAjax).catch(async (err) => {
            errorHandler(err, req, res, fileServer, isAjax);
        });
    };
}

import * as fs from "fs";
import * as http from "http";
import * as mst from "mustache";
import * as ns from "node-static";
import * as qs from "querystring";
import * as url from "url";
import winston = require("winston");
import { checkCaptcha, RecaptchaFailure } from "./captcha";
import { Config } from "./config";
import { insertEmail } from "./database";
import { getRecipients, getSubject } from "./form-target/helpers";
import { constructUserMessage } from "./message";
import { sendEmail } from "./send";
import { readReadable } from "./stream";
const EMAIL_TEMPLATE_PATH = "./assets/email-template.mst";
const THANKS_URL_PATH = "/thanks";
const SUBMIT_URL_PATH = "/submit";

class NotFoundError extends Error { }

async function formHandler(
    config: Config,
    key: string,
    req: http.IncomingMessage,
    res: http.ServerResponse,
): Promise<void> {
    const bodyStr = await readReadable(req, config.maxHttpRequestSize);
    let post: { [k: string]: string };

    if (req.rawHeaders.indexOf("application/json") > 0) {
        post = JSON.parse(bodyStr);
        winston.debug(`JSON: ${post}`);
    } else {
        post = qs.parse(bodyStr);
    }

    const remoteAddress = req.connection.remoteAddress || "unknown remote address";

    await checkCaptcha(
        post["g-recaptcha-response"],
        config.requireReCaptchaResponse,
        remoteAddress,
        config.reCaptchaSecret);

    let userMessage = await constructUserMessage(post);

    winston.debug(`User Message: ${userMessage}`);

    const refererUrl = getRefererUrl(post, req);

    const formName = post._formname ? `Submitted form: ${post._formname}\n` : "";

    const template = fs.readFileSync(EMAIL_TEMPLATE_PATH).toString();
    const templateData = {
        formName,
        incomingIp: req.connection.remoteAddress,
        refererUrl,
        userMessage,
    };

    userMessage = mst.render(template, templateData);

    let subject = config.subject;
    let recepients = config.recipientEmails;

    if (key) {
        const formTargetSubject = getSubject(config, key);
        subject = formTargetSubject ? formTargetSubject : subject;
        const formTargetRecepients = getRecipients(config, key);
        recepients = formTargetRecepients ? formTargetRecepients : recepients;
    }

    const renderedSubject = mst.render(subject, { refererUrl, formName });

    await sendEmail(
        config,
        recepients,
        renderedSubject,
        userMessage);

    insertEmail(
        config.databaseFileName,
        remoteAddress,
        bodyStr,
        refererUrl,
        formName,
        recepients,
        userMessage);

    const redirectUrl = post._redirect || THANKS_URL_PATH;
    winston.debug(`Redirecting to ${redirectUrl}`);
    res.writeHead(303, { Location: redirectUrl });
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

async function requestHandler(
    config: Config,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    fileServer: ns.Server,
): Promise<void> {
    winston.debug(`Incoming request: ${req.url} (method: ${req.method})`);
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
    }
    const urlPathName = url.parse(req.url as string, true);
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

        await formHandler(config, key, req, res);
    } else if (urlPathName.pathname === THANKS_URL_PATH) {
        fileServer.serveFile("thanks.html", 200, {}, req, res);
    } else {
        throw new NotFoundError(`Incorrect request: ${urlPathName.pathname} (${req.method})`);
    }
}

export function constructConnectionHandler(
    config: Config,
    fileServer: ns.Server,
): (req: http.IncomingMessage, res: http.ServerResponse) => void {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
        requestHandler(config, req, res, fileServer).catch((err) => {
            winston.warn(`Error in Connection Handler: ${err}`);
            if (err instanceof NotFoundError) {
                fileServer.serveFile("error404.html", 404, {}, req, res);
                return;
            }
            if (err instanceof RecaptchaFailure) {
                res.end();
                return;
            }
            fileServer.serveFile("error502.html", 502, {}, req, res);
        });
    };
}

import * as http from "http";
import winston = require("winston");
import { Config } from "./config";
import { saveEmailToDB } from "./database";
import { getRecipients, getSubject } from "./form-target/helpers";
import { THANKS_URL_PATH } from "./handler";
import { setCorsHeaders } from "./header";
import { renderEmailContent, renderSubject } from "./message";
import { processReCaptcha } from "./recaptcha";
import { isAjaxRequest, parseRequestData } from "./request";
import { sendEmail } from "./send";

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

    const reCaptchaPassed = processReCaptcha(config, parsedRequestData, senderIpAddress, res);

    if (!reCaptchaPassed) {
        return;
    }

    const refererUrl = getRefererUrl(parsedRequestData, req);
    const formName = parsedRequestData._formname ?
        `Submitted form: ${parsedRequestData._formname}\n` : "";

    const isAjax = isAjaxRequest(req);

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
    const [plainTextEmailMessage, htmlEmailMessage] =
        renderEmailContent(parsedRequestData, formName, refererUrl, senderIpAddress);

    // getting email subject and recepients
    const subject = getSubject(config, formTargetKey);
    const recepients = getRecipients(config, formTargetKey);

    const renderedSubject = renderSubject(subject, refererUrl, formName);

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
        const redirectUrl = parsedRequestData._redirect || THANKS_URL_PATH;
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

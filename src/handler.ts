import * as fs from "fs";
import * as http from "http";
import * as mst from "mustache";
import * as ns from "node-static";
import * as url from "url";

import winston = require("winston");

import { RecaptchaFailure } from "./captcha";
import { Config } from "./config";
import { formHandler, NotFoundError } from "./form";
import { setCorsHeaders } from "./header";
import { isAjaxRequest, parseRequestData } from "./request";

const SUBMIT_URL_PATH = "/submit";
export const THANKS_URL_PATH = "/thanks";

async function routeRequest(
    config: Config,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    fileServer: ns.Server,
    isAjax: boolean,
): Promise<void> {
    const parsedUrl = url.parse(req.url as string, true);
    winston.debug(`Pathname: ${parsedUrl.pathname}`);
    if (parsedUrl.pathname &&
        parsedUrl.pathname.toString().startsWith(SUBMIT_URL_PATH) &&
        req.method === "POST") {
        winston.debug(`Calling formHandler...`);
        await formHandler(config, parsedUrl.pathname, req, res, isAjax);
    } else if (parsedUrl.pathname === THANKS_URL_PATH) {
        fileServer.serveFile("thanks.html", 200, {}, req, res);
    } else if (parsedUrl.pathname === "/autorecaptcha/") {
        winston.debug("hi from autorecaptcha");

        const [parsedRequestData] = await parseRequestData(req, config.maxHttpRequestSize);
        winston.debug(`Parsed Request Data ${JSON.stringify(parsedRequestData)}`);

        const htmlTemplate = fs.readFileSync("./assets/recaptcha.html").toString();
        const templateData = {
            parsedRequestData: JSON.stringify(parsedRequestData),
        };
        winston.debug(`Template Data: ${templateData}`);
        const renderedHtml = mst.render(htmlTemplate, templateData);
        res.write(renderedHtml);
        res.end();
    } else {
        throw new NotFoundError(`Incorrect request: ${parsedUrl.pathname} (${req.method})`);
    }
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
        setCorsHeaders(res);
        res.setHeader("content-type", "application/json");
        res.write(JSON.stringify({ result: "error", description: err.message }));
        res.end();
        return;
    }

    if (err instanceof NotFoundError) {
        fileServer.serveFile("error404.html", 404, {}, req, res);
        return;
    }
    if (err instanceof RecaptchaFailure) {
        res.end();
        return;
    }
    fileServer.serveFile("error502.html", 502, {}, req, res);
}

export function constructConnectionHandler(
    config: Config,
    fileServer: ns.Server,
): (req: http.IncomingMessage, res: http.ServerResponse) => void {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
        winston.debug(`Incoming request: ${req.url} (method: ${req.method})`);

        // set CORS headers
        if (req.method === "OPTIONS") {
            setCorsHeaders(res);
            res.writeHead(200);
            res.end();
            return;
        }

        const isAjax = isAjaxRequest(req);

        routeRequest(config, req, res, fileServer, isAjax).catch(async (err: Error) => {
            await errorHandler(err, req, res, fileServer, isAjax);
        });
    };
}

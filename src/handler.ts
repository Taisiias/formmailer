import * as http from "http";
import * as ns from "node-static";
import * as url from "url";

import winston = require("winston");

import { Config } from "./config";
import { NotFoundError, submitHandler, viewEmailHistory } from "./form";
import { setCorsHeaders } from "./header";
import { RecaptchaFailure } from "./recaptcha";
import { isAjaxRequest } from "./request";

export const SUBMIT_URL_PATH = "/submit";
export const THANKS_URL_PATH = "/thanks";
const VIEW_URL_PATH = "/view";

async function routeRequest(
    config: Config,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    fileServer: ns.Server,
): Promise<void> {
    const parsedUrl = url.parse(req.url as string, true);
    winston.debug(`Pathname: ${parsedUrl.pathname}`);
    if (parsedUrl.pathname &&
        parsedUrl.pathname.toString().startsWith(SUBMIT_URL_PATH) &&
        req.method === "POST") {
        await submitHandler(config, parsedUrl.pathname, req, res);
    } else if (parsedUrl.pathname === THANKS_URL_PATH) {
        fileServer.serveFile("thanks.html", 200, {}, req, res);
    } else if (parsedUrl.pathname === VIEW_URL_PATH) {
        await viewEmailHistory(res, config);
    } else {
        throw new NotFoundError(`Incorrect request: ${parsedUrl.pathname} (${req.method})`);
    }
}

async function errorHandler(
    err: Error,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    fileServer: ns.Server,
): Promise<void> {
    winston.warn(`Error in Connection Handler: ${err}`);
    const isAjax = isAjaxRequest(req);
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

        routeRequest(config, req, res, fileServer).catch(async (err: Error) => {
            await errorHandler(err, req, res, fileServer);
        });
    };
}

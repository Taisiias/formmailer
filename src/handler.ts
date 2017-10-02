import * as http from "http";
import * as ns from "node-static";
import * as url from "url";
import winston = require("winston");

import { RecaptchaFailure } from "./captcha";
import { Config } from "./config";
import { formHandler, NotFoundError, THANKS_URL_PATH } from "./form";

const SUBMIT_URL_PATH = "/submit";

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

        const isAjax = isAjaxRequest(req);
        if (isAjax) {
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
        }
        routeRequest(config, req, res, fileServer, isAjax).catch(async (err) => {
            errorHandler(err, req, res, fileServer, isAjax);
        });
    };
}

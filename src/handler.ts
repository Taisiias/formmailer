import * as http from "http";
import * as ns from "node-static";
import * as url from "url";
import winston = require("winston");

import { RecaptchaFailure } from "./captcha";
import { Config } from "./config";
import { formHandler, NotFoundError } from "./form";
import { setCorsHeaders } from "./header";
import { readReadable } from "./stream"; // REMOVE THIS!

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
        await fileServer.serveFile("thanks.html", 200, {}, req, res);
    } else if (parsedUrl.pathname === "/autorecaptcha/") {
        winston.debug("hi from recaptcha");
        const bodyStr = await readReadable(req, config.maxHttpRequestSize);
        const postedData: { [k: string]: string } = JSON.parse(bodyStr);
        winston.debug(`Request body: ${JSON.stringify(postedData)}`);
        // res.writeHead(303, { Location: "/recaptcha" });
        // res.write(JSON.stringify({ postedData }));
        res.write(JSON.stringify({ postedData }));
        res.end();
        // await fileServer.serveFile("recaptcha.html", 200, {}, req, res);

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
        setCorsHeaders(res);
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
        if (req.method === "OPTIONS") {
            setCorsHeaders(res);
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

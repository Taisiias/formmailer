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
const url = require("url");
const winston = require("winston");
const form_1 = require("./form");
const header_1 = require("./header");
const recaptcha_1 = require("./recaptcha");
const request_1 = require("./request");
exports.SUBMIT_URL_PATH = "/submit";
exports.THANKS_URL_PATH = "/thanks";
exports.ERROR502_URL_PATH = "/error502";
const VIEW_URL_PATH = "/view";
function routeRequest(config, req, res, staticFileServer) {
    return __awaiter(this, void 0, void 0, function* () {
        const parsedUrl = url.parse(req.url, true);
        winston.debug(`Pathname: ${parsedUrl.pathname}`);
        if (parsedUrl.pathname &&
            parsedUrl.pathname.toString().startsWith(exports.SUBMIT_URL_PATH) &&
            req.method === "POST") {
            yield form_1.submitHandler(config, parsedUrl.pathname, req, res);
        }
        else if (parsedUrl.pathname === exports.THANKS_URL_PATH) {
            staticFileServer.serveFile("thanks.html", 200, req, res);
        }
        else if (parsedUrl.pathname === exports.ERROR502_URL_PATH) {
            staticFileServer.serveFile("error502.html", 502, req, res);
        }
        else {
            throw new form_1.NotFoundError(`Incorrect request: ${parsedUrl.pathname} (${req.method})`);
        }
    });
}
function errorHandler(err, req, res, staticFileServer) {
    return __awaiter(this, void 0, void 0, function* () {
        winston.warn(`Error in Connection Handler: ${err}`);
        const isAjax = request_1.isAjaxRequest(req);
        if (isAjax) {
            res.statusCode = err instanceof form_1.NotFoundError ? 404 : 502;
            header_1.setCorsHeaders(res);
            res.setHeader("content-type", "application/json");
            res.write(JSON.stringify({ result: "error", description: err.message }));
            res.end();
            return;
        }
        if (err instanceof form_1.NotFoundError) {
            staticFileServer.serveFile("error404.html", 404, req, res);
            return;
        }
        if (err instanceof recaptcha_1.RecaptchaFailure) {
            res.end();
            return;
        }
        staticFileServer.serveFile("error502.html", 502, req, res);
    });
}
function constructConnectionHandler(config, staticFileServer) {
    return (req, res) => {
        winston.debug(`Incoming request: ${req.url} (method: ${req.method})`);
        // set CORS headers
        if (req.method === "OPTIONS") {
            header_1.setCorsHeaders(res);
            res.writeHead(200);
            res.end();
            return;
        }
        routeRequest(config, req, res, staticFileServer).catch((err) => __awaiter(this, void 0, void 0, function* () {
            yield errorHandler(err, req, res, staticFileServer);
        }));
    };
}
exports.constructConnectionHandler = constructConnectionHandler;
function viewHistoryHandler(config) {
    return (req, res) => {
        const parsedUrl = url.parse(req.url, true);
        winston.debug(`Pathname: ${parsedUrl.pathname}`);
        if (parsedUrl.pathname === VIEW_URL_PATH) {
            form_1.viewEmailHistory(res, config);
        }
    };
}
exports.viewHistoryHandler = viewHistoryHandler;

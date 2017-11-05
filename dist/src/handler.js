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
const fs = require("fs");
const mst = require("mustache");
const url = require("url");
const winston = require("winston");
const captcha_1 = require("./captcha");
const form_1 = require("./form");
const header_1 = require("./header");
const request_1 = require("./request");
const AUTORECAPTCHA_PATH = "/autorecaptcha/";
const SUBMIT_URL_PATH = "/submit";
exports.THANKS_URL_PATH = "/thanks";
function routeRequest(config, req, res, fileServer) {
    return __awaiter(this, void 0, void 0, function* () {
        const parsedUrl = url.parse(req.url, true);
        winston.debug(`Pathname: ${parsedUrl.pathname}`);
        if (parsedUrl.pathname &&
            parsedUrl.pathname.toString().startsWith(SUBMIT_URL_PATH) &&
            req.method === "POST") {
            winston.debug(`Calling formHandler...`);
            yield form_1.formHandler(config, parsedUrl.pathname, req, res);
        }
        else if (parsedUrl.pathname === exports.THANKS_URL_PATH) {
            fileServer.serveFile("thanks.html", 200, {}, req, res);
        }
        else if (parsedUrl.pathname && parsedUrl.pathname.toString().startsWith(AUTORECAPTCHA_PATH)) {
            const [parsedRequestData] = yield request_1.parseRequestData(req, config.maxHttpRequestSize);
            winston.debug(`Parsed Request Data ${JSON.stringify(parsedRequestData)}`);
            const htmlTemplate = fs.readFileSync("./assets/recaptcha.html").toString();
            const templateData = {
                dataSiteKey: config.reCaptchaSiteKey,
                parsedRequestData: JSON.stringify(parsedRequestData),
                submitUrl: SUBMIT_URL_PATH,
                thanksPageUrl: parsedRequestData._redirect || exports.THANKS_URL_PATH,
            };
            const renderedHtml = mst.render(htmlTemplate, templateData);
            res.write(renderedHtml);
            res.end();
        }
        else {
            throw new form_1.NotFoundError(`Incorrect request: ${parsedUrl.pathname} (${req.method})`);
        }
    });
}
function errorHandler(err, req, res, fileServer) {
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
            fileServer.serveFile("error404.html", 404, {}, req, res);
            return;
        }
        if (err instanceof captcha_1.RecaptchaFailure) {
            res.end();
            return;
        }
        fileServer.serveFile("error502.html", 502, {}, req, res);
    });
}
function constructConnectionHandler(config, fileServer) {
    return (req, res) => {
        winston.debug(`Incoming request: ${req.url} (method: ${req.method})`);
        // set CORS headers
        if (req.method === "OPTIONS") {
            header_1.setCorsHeaders(res);
            res.writeHead(200);
            res.end();
            return;
        }
        routeRequest(config, req, res, fileServer).catch((err) => __awaiter(this, void 0, void 0, function* () {
            yield errorHandler(err, req, res, fileServer);
        }));
    };
}
exports.constructConnectionHandler = constructConnectionHandler;

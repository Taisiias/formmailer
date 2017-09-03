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
const http = require("http");
const mst = require("mustache");
const ns = require("node-static");
const qs = require("querystring");
const url = require("url");
const winston = require("winston");
const yargs = require("yargs");
const captcha_1 = require("./captcha");
const config_1 = require("./config");
const database_1 = require("./database");
const message_1 = require("./message");
const send_1 = require("./send");
const stream_1 = require("./stream");
const DEFAULT_CONFIG_PATH = "./config.json";
const STARTUP_LOG_LEVEL = "debug";
const THANKS_PAGE_PATH = "/thanks";
const TEMPLATE_PATH = "./assets/email-template.mst";
class NotFoundError extends Error {
}
function formHandler(config, req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const bodyStr = yield stream_1.readReadable(req, config.maxHttpRequestSize);
        const post = qs.parse(bodyStr);
        yield captcha_1.checkCaptcha(post["g-recaptcha-response"], config.requireReCaptchaResponse, req.connection.remoteAddress, config.reCaptchaSecret);
        let userMessage = yield message_1.constructUserMessage(post);
        winston.debug(`User Message: ${userMessage}`);
        const referrerURL = req.headers.Referrer || "Unspecified URL";
        const template = fs.readFileSync(TEMPLATE_PATH).toString();
        const templateData = {
            incomingIp: req.connection.remoteAddress,
            referrerURL,
            userMessage,
        };
        userMessage = mst.render(template, templateData);
        yield send_1.sendEmail(config, userMessage, referrerURL);
        database_1.insertEmail(config.databaseFileName, req.connection.remoteAddress, bodyStr, referrerURL, config.recipientEmails, userMessage);
        const redirectUrl = post._redirect || THANKS_PAGE_PATH;
        winston.debug(`Redirecting to ${redirectUrl}`);
        res.writeHead(303, { Location: redirectUrl });
        res.end();
    });
}
function requestHandler(config, req, res, fileServer) {
    return __awaiter(this, void 0, void 0, function* () {
        winston.debug(`Incoming request: ${req.url} (method: ${req.method})`);
        const urlPathName = url.parse(req.url, true);
        if (urlPathName.pathname === config.httpServerPath && req.method === "POST") {
            yield formHandler(config, req, res);
        }
        else if (urlPathName.pathname === THANKS_PAGE_PATH) {
            fileServer.serveFile("thanks.html", 200, {}, req, res);
        }
        else {
            throw new NotFoundError(`Incorrect request: ${urlPathName.pathname} (${req.method})`);
        }
    });
}
function constructConnectionHandler(config, fileServer) {
    return (req, res) => {
        requestHandler(config, req, res, fileServer).catch((err) => {
            winston.warn(`Error in Connection Handler: ${err}`);
            if (err instanceof NotFoundError) {
                fileServer.serveFile("error404.html", 404, {}, req, res);
                return;
            }
            if (err instanceof captcha_1.RecaptchaFailure) {
                res.end();
                return;
            }
            fileServer.serveFile("error502.html", 502, {}, req, res);
        });
    };
}
function run() {
    winston.configure({
        level: STARTUP_LOG_LEVEL,
        transports: [new winston.transports.Console({
                name: "Console",
                timestamp: true,
            })],
    });
    let cmdArgs;
    cmdArgs = yargs.usage("FormMailer server. Usage: $0 [-c <config file>]")
        .options("config", {
        alias: "c",
        default: DEFAULT_CONFIG_PATH,
        describe: "Read setting from specified config file path",
        type: "string",
    })
        .locale("en")
        .version()
        .help("help")
        .epilog("Support: https://github.com/Taisiias/formmailer")
        .strict()
        .argv;
    const config = config_1.readConfig(cmdArgs.config);
    winston.level = config.logLevel;
    const fileServer = new ns.Server(config.assetsFolder);
    database_1.createDatabaseAndTables(config.databaseFileName);
    const server = http.createServer(constructConnectionHandler(config, fileServer));
    server.listen(config.httpListenPort, config.httpListenIP, () => {
        winston.info(`Server started (listening ${config.httpListenIP}:${config.httpListenPort})`);
    });
}
function runAndReport() {
    try {
        run();
    }
    catch (e) {
        winston.error(e.message);
        return process.exit(1);
    }
}
runAndReport();

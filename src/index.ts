import * as fs from "fs";
import * as http from "http";
import * as mst from "mustache";
import * as ns from "node-static";
import * as qs from "querystring";
import * as url from "url";
import winston = require("winston");
import * as yargs from "yargs";
import * as captcha from "./captcha";
import { Config, readConfig } from "./config";
import { createDatabaseAndTables, insertEmail } from "./database";
import { constructUserMessage } from "./message";
import { sendEmail } from "./send";
import { readReadable } from "./stream";

const STARTUP_LOG_LEVEL = "debug";
const THANKS_PAGE_PATH = "/thanks";
const TEMPLATE_PATH = "./assets/email-template.mst";

class NotFoundError extends Error { }
class RecaptchaFailure extends Error { }

interface CommandLineArgs {
    configFilePath: string;
}

async function formHandler(
    config: Config,
    req: http.IncomingMessage,
    res: http.ServerResponse,
): Promise<void> {
    const bodyStr = await readReadable(req, config.maxHttpRequestSize);
    const post: { [k: string]: string } = qs.parse(bodyStr);

    if (config.requireReCaptchaResponse && !post["g-recaptcha-response"]) {
        // TODO: Process response w/o captcha as spam.
        throw new Error(
            `requireReCaptchaResponse is set to true but g-recaptcha-response is missing in POST`);
    }

    if (post["g-recaptcha-response"]) {
        const notSpam = await captcha.checkCaptcha(
            req.connection.remoteAddress,
            post["g-recaptcha-response"],
            config.reCaptchaSecret,
        );
        winston.debug(`reCAPTCHA Result: ${notSpam ? "not spam" : "spam"}`);
        if (!notSpam) {
            throw new RecaptchaFailure(`reCAPTCHA failure.`);
        }
    }

    let userMessage = await constructUserMessage(post);
    winston.debug(`User Message: ${userMessage}`);

    const referrerURL = req.headers.Referrer || "Unspecified URL";

    const template = fs.readFileSync(TEMPLATE_PATH).toString();
    const templateData = {
        incomingIp: req.connection.remoteAddress,
        referrerURL,
        userMessage,
    };
    userMessage = mst.render(template, templateData);

    await sendEmail(config, userMessage, referrerURL);

    insertEmail(
        config.databaseFileName,
        req.connection.remoteAddress,
        bodyStr,
        referrerURL,
        config.recipientEmails,
        userMessage);

    const redirectUrl = post._redirect || THANKS_PAGE_PATH;
    winston.debug(`Redirecting to ${redirectUrl}`);
    res.writeHead(303, { Location: redirectUrl });
    res.end();
}

async function requestHandler(
    config: Config,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    fileServer: ns.Server,
): Promise<void> {
    winston.debug(`Incoming request: ${req.url} (method: ${req.method})`);
    const urlPathName = url.parse(req.url as string, true);
    if (urlPathName.pathname === config.httpServerPath && req.method === "POST") {
        await formHandler(config, req, res);
    } else if (urlPathName.pathname === THANKS_PAGE_PATH) {
        fileServer.serveFile("thanks.html", 200, {}, req, res);
    } else {
        throw new NotFoundError(`Incorrect request: ${urlPathName.pathname} (${req.method})`);
    }
}

function constructConnectionHandler(
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

function run(): void {
    winston.configure({
        level: STARTUP_LOG_LEVEL,
        transports: [new winston.transports.Console({
            name: "Console",
            timestamp: true,
        })],
    });
    let cmdArgs: CommandLineArgs;
    cmdArgs = yargs.options("configFilePath", {
        alias: "c",
        describe: "Read setting from specified config file path",
    }).help("help").argv;
    const config = readConfig(cmdArgs.configFilePath);
    winston.level = config.logLevel;
    const fileServer = new ns.Server(config.assetsFolder);
    createDatabaseAndTables(config.databaseFileName);
    const server = http.createServer(constructConnectionHandler(config, fileServer));
    server.listen(config.httpListenPort, config.httpListenIP, () => {
        winston.info(`Server started (listening ${config.httpListenIP}:${config.httpListenPort})`);
    });
}

function runAndReport(): void {
    try {
        run();
    } catch (e) {
        winston.error(e.message);
        return process.exit(1);
    }
}
runAndReport();

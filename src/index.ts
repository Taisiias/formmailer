// TODO: README
// TODO: config schema

import * as fs from "fs";
import * as http from "http";
import * as mst from "mustache";
import * as ns from "node-static";
import * as qs from "querystring";
import * as url from "url";
import winston = require("winston");
import * as yargs from "yargs";
import { checkCaptcha, RecaptchaFailure } from "./captcha";
import { Config, readConfig } from "./config";
import { createDatabaseAndTables, insertEmail } from "./database";
import { getRecipients, getSubject } from "./form-target/helpers";
import { constructUserMessage } from "./message";
import { sendEmail } from "./send";
import { readReadable } from "./stream";

const DEFAULT_CONFIG_PATH = "./config.json";
const STARTUP_LOG_LEVEL = "debug";
const EMAIL_TEMPLATE_PATH = "./assets/email-template.mst";
const THANKS_URL_PATH = "/thanks";
const SUBMIT_URL_PATH = "/submit";

class NotFoundError extends Error { }

interface CommandLineArgs {
    config: string;
}

async function formHandler(
    config: Config,
    key: string,
    req: http.IncomingMessage,
    res: http.ServerResponse,
): Promise<void> {
    const bodyStr = await readReadable(req, config.maxHttpRequestSize);
    const post: { [k: string]: string } = qs.parse(bodyStr);

    await checkCaptcha(
        post["g-recaptcha-response"],
        config.requireReCaptchaResponse,
        req.connection.remoteAddress,
        config.reCaptchaSecret);

    let userMessage = await constructUserMessage(post);
    winston.debug(`User Message: ${userMessage}`);

    const referrerUrl = post._formurl || req.headers.Referrer || "Unspecified URL";
    const formName = post._formname ? `Submitted form: ${post._formname}\n` : "";

    const template = fs.readFileSync(EMAIL_TEMPLATE_PATH).toString();
    const templateData = {
        incomingIp: req.connection.remoteAddress,
        referrerUrl,
        formName,
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

    const renderedSubject = mst.render(subject, { referrerUrl, formName });

    await sendEmail(
        config,
        recepients,
        renderedSubject,
        userMessage);

    insertEmail(
        config.databaseFileName,
        req.connection.remoteAddress,
        bodyStr,
        referrerUrl,
        formName,
        recepients,
        userMessage);

    const redirectUrl = post._redirect || THANKS_URL_PATH;
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
    if (urlPathName.pathname
        && urlPathName.pathname.toString().startsWith(SUBMIT_URL_PATH)
        && req.method === "POST") {
        let key = "";
        // TODO: use urlPathName instead of req.url
        if (req.url) {
            key = req.url.slice(req.url.lastIndexOf("/submit") + 8);
            if (key.endsWith("/")) {
                key = key.slice(0, key.lastIndexOf("/"));
            }
            winston.debug(`Provided form target key: "${key}"`);
            if (key) {
                if (!config.formTargets.hasOwnProperty(key)) {
                    throw new NotFoundError(`Target form "${key}" doesn't exist in config.`);
                }
            }
        }
        await formHandler(config, key, req, res);
    } else if (urlPathName.pathname === THANKS_URL_PATH) {
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
    const config = readConfig(cmdArgs.config);

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

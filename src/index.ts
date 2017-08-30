import * as fs from "fs";
import * as he from "he";
import * as http from "http";
import * as mst from "mustache";
import * as ns from "node-static";
import * as nodemailer from "nodemailer";
import * as qs from "querystring";
import * as stream from "stream";
import * as url from "url";
import winston = require("winston");
import * as yargs from "yargs";
import * as captcha from "./captcha";
import * as cf from "./config";
import * as db from "./database";

const STARTUP_LOG_LEVEL = "debug";
const THANKS_PAGE_PATH = "/thanks";
const TEMPLATE_PATH = "./assets/email-template.mst";

class NotFoundError extends Error { }
class RecaptchaFailure extends Error { }

interface CommandLineArgs {
    configFilePath: string;
}

async function formHandler(
    config: cf.Config,
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

    db.insertEmail(
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
    config: cf.Config,
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

async function constructUserMessage(post: { [k: string]: string }): Promise<string> {
    let userMessage = "";
    for (const name in post) {
        if (!name.startsWith("_") && name !== "g-recaptcha-response") {
            let buf: string = he.decode(post[name]);
            if (buf.includes("\n")) {
                buf = "\n" + buf.split("\n").map((s) => "     " + s).join("\n");
            }
            userMessage += `${name}: ${buf}\n`;
        }
    }
    return userMessage;
}

function constructConnectionHandler(
    config: cf.Config,
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

function readReadable(s: stream.Readable, maxRequestSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
        let bodyStr = "";
        s.on("data", (chunk) => {
            bodyStr += chunk.toString();
            if (bodyStr.length > maxRequestSize) {
                // FLOOD ATTACK OR FAULTY CLIENT
                reject("Maximum request size exceeded");
            }
        });
        s.on("end", () => {
            resolve(bodyStr);
        });
    });
}

async function sendEmail(
    config: cf.Config,
    emailText: string,
    referrerPage: string,
): Promise<void> {
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        tls: { rejectUnauthorized: false },
    });
    const emailMessage = {
        from: config.fromEmail,
        subject: mst.render(config.subject, { referrerUrl: referrerPage }),
        text: emailText,
        to: config.recipientEmails,
    };
    winston.debug(`Sending email.`);
    await transporter.sendMail(emailMessage);
    winston.info(`Message has been sent to ${config.recipientEmails}`);
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
    const config = cf.readConfig(cmdArgs.configFilePath);
    winston.level = config.logLevel;
    const fileServer = new ns.Server(config.assetsFolder);
    db.createDatabaseAndTables(config.databaseFileName);
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

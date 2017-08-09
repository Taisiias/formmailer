// TODO: Написать README.

import * as http from "http";
import * as ns from "node-static";
import * as nodemailer from "nodemailer";
import * as qs from "querystring";
import * as stream from "stream";
import * as url from "url";
import winston = require("winston");
import * as yargs from "yargs";
import * as cf from "./config";

const defaultLogLevel = "debug";
const thanksPath = "/thanks";

class NotFoundError extends Error { }

interface CommandLineArgs {
    configFilePath: string;
}

async function formMailerPostProcessingHandler(
    config: cf.Config,
    req: http.IncomingMessage,
    res: http.ServerResponse,
): Promise<void> {
    const bodyStr = await readReadable(req, config.maxHttpRequestSize);
    const post = qs.parse(bodyStr);
    let userMessage = "";
    for (const name in post) {
        if (name !== config.redirectFieldName) {
            const str = name + ": " + post[name] + "\n";
            userMessage += str;
        }
    }
    await sendEmail(config, userMessage);

    if (post._redirect) {
        winston.debug(`Redirecting to ${post._redirect}`);
        res.writeHead(303, { Location: post._redirect });
        res.end();
    } else {
        winston.debug(`Redirecting to ${thanksPath}`);
        res.writeHead(303, { Location: thanksPath });
        res.end();
    }
}

async function connectionHandler(
    config: cf.Config,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    fileServer: ns.Server,
): Promise<void> {
    winston.debug(`Request: ${req.url} (method: ${req.method})`);
    const urlPathName = url.parse(req.url as string, true);
    if (urlPathName.pathname === config.httpServerPath && req.method === "POST") {
        formMailerPostProcessingHandler(config, req, res);
    } else if (urlPathName.pathname === thanksPath) {
        fileServer.serveFile("thanks.html", 200, {}, req, res);
    } else {
        throw new NotFoundError(`Incorrect request: ${urlPathName.pathname} (${req.method})`);
    }
}

function constructConnectionHandler(
    config: cf.Config,
): (req: http.IncomingMessage, res: http.ServerResponse) => void {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
        const fileServer = new ns.Server("./assets");
        connectionHandler(config, req, res, fileServer).catch((err) => {
            if (err instanceof NotFoundError) {
                winston.warn(`${err}`);
                fileServer.serveFile("error404.html", 404, {}, req, res);
                return;
            }
            winston.warn(`Error in Connection Handler: ${err}`);
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
                // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                reject("Maximum request size exceeded");
            }
        });
        s.on("end", () => {
            resolve(bodyStr);
        });
    });
}

async function sendEmail(config: cf.Config, emailText: string): Promise<void> {
    winston.silly(`Entering to sendEmail. Creating Nodemailer transporter.`);
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        tls: {
            rejectUnauthorized: false,
        },
    });
    const emailMessage = {
        from: config.fromEmail,
        subject: config.subject,
        text: emailText,
        to: config.recipientEmails,
    };
    winston.debug(`Sending email.`);

    await transporter.sendMail(emailMessage);

    winston.info(`Message has been sent to ${config.recipientEmails}`);
}

function run(): void {
    let config: cf.Config;
    let server: http.Server;

    winston.configure({
        level: defaultLogLevel,
        transports: [new winston.transports.Console({
            name: "Console",
            timestamp: true,
        })],
    });

    try {
        let cmdArgs: CommandLineArgs;
        cmdArgs = yargs.options("configFilePath", {
            alias: "c",
            describe: "Read setting from specified config file path",
        }).help("help").argv;

        config = cf.readConfig(cmdArgs.configFilePath);

        winston.configure({
            level: config.logLevel,
            transports: [new winston.transports.Console({
                name: "Console",
                timestamp: true,
            })],
        });

        server = http.createServer(constructConnectionHandler(config));
        server.listen(config.httpListenPort, config.httpListenIP);
        winston.info(`Server started.
            httpListenPort ${config.httpListenPort}, httpListenIp ${config.httpListenIP}`);

    } catch (e) {
        winston.error(`Incorrect arguments or config file: ${e.message}`);
        process.exit(1);
    }
}

run();

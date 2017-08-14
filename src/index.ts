// TODO: Написать README.
// TODO: Заголовок письма: Form submitted on {{referrerUrl}}
// TODO: Вынести шаблон письма
/* TODO: Шаблон письма по умолчанию:

Submitted user form was received by Formmailer server, see deails below.

Page URL: {{referrerURL}}

user_name: qwer
user_mail: asdf@asdf.ccc
user_message:
    adfa
    sdfg

    rteyerty
user_select: Option 3.2
user_checkbox: checked

Submitter IP address: {{incomingIp}}

*/
// TODO: не надо указывать специальные поля (такие как _redirect в письме)
// TODO: сохранять историю в БД

import * as http from "http";
import * as ns from "node-static";
import * as nodemailer from "nodemailer";
import * as qs from "querystring";
import * as stream from "stream";
import * as url from "url";
import winston = require("winston");
import * as yargs from "yargs";
import * as cf from "./config";

const DEFAULT_LOG_LEVEL = "debug";
const THANKS_PAGE_PATH = "/thanks";

class NotFoundError extends Error { }

interface CommandLineArgs {
    configFilePath: string;
}

async function formHandler(
    config: cf.Config,
    req: http.IncomingMessage,
    res: http.ServerResponse,
): Promise<void> {
    const bodyStr = await readReadable(req, config.maxHttpRequestSize);
    const post = qs.parse(bodyStr);
    let userMessage = "";
    for (const name in post) {
        // TODO: можно просто сделать проверку: если поле начинается с символа _ то игнорируем
        if (name !== config.redirectFieldName) {
            userMessage += `${name}: ${post[name]}\n`;
        }
    }
    await sendEmail(config, userMessage);

    if (post._redirect) {
        winston.debug(`Redirecting to ${post._redirect}`);
        res.writeHead(303, { Location: post._redirect });
        res.end();
    } else {
        winston.debug(`Redirecting to ${THANKS_PAGE_PATH}`);
        res.writeHead(303, { Location: THANKS_PAGE_PATH });
        res.end();
    }
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

function constructConnectionHandler(
    config: cf.Config,
): (req: http.IncomingMessage, res: http.ServerResponse) => void {
    const fileServer = new ns.Server("./assets");
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
        requestHandler(config, req, res, fileServer).catch((err) => {
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
                // FLOOD ATTACK OR FAULTY CLIENT
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
    winston.configure({
        level: DEFAULT_LOG_LEVEL,
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

    const server = http.createServer(constructConnectionHandler(config));
    server.listen(config.httpListenPort, config.httpListenIP);

    winston.info(`Server started (listening ${config.httpListenIP}:${config.httpListenPort})`);
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

// TODO: Написать README.

import * as http from "http";
import * as ns from "node-static";
import * as nodemailer from "nodemailer";
import * as qs from "querystring";
import * as url from "url";
import * as winston from "winston";
import * as yargs from "yargs";
import * as cf from "./config";

const defaultLogLevel = "debug";

interface CommandLineArgs {
    configFilePath: string;
}

function constructConnectionHandler(
    config: cf.Config,
): (req: http.IncomingMessage, res: http.ServerResponse) => void {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
        try {
            if (req.method !== "POST") {
                winston.warn(`Request was not POST.`);
                return;
            }
            const urlPathName = url.parse(req.url as string, true);
            const fileServer = new ns.Server("./assets");
            if (urlPathName.pathname === config.httpServerPath) {
                let bodyStr = "";
                req.on("data", (chunk) => {
                    bodyStr += chunk.toString();
                    if (bodyStr.length > config.maxHttpRequestSize) {
                        // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                        req.connection.destroy();
                    }
                });
                req.on("end", () => {
                    const post = qs.parse(bodyStr);
                    let userMessage = "";
                    for (const name in post) {
                        if (name !== config.redirectFieldName) {
                            const str = name + ": " + post[name] + "\n";
                            userMessage += str;
                        }
                    }
                    sendEmail(
                        config,
                        userMessage,
                        () => {
                            winston.debug(`Redirecting to ${post._redirect}`);
                            if (post._redirect) {
                                res.writeHead(301, { Location: post._redirect });
                                res.end();
                            } else {
                                fileServer.serveFile("thanks.html", 200, {}, req, res);
                            }
                        });
                });
            } else {
                winston.warn(`Incorrect httpServerPath: ${urlPathName.pathname}`);
                res.end("END");
            }
        } catch (e) {
            winston.error(`Error in ConnectionHandler: ${e.message}`);
        }
    };
}

function sendEmail(config: cf.Config, emailText: string, callback: () => void): void {
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
    transporter.sendMail(emailMessage, (err) => {
        if (err) {
            winston.error(`Error while sending email: ${err.message}`);
            return;
        }
        callback();
        winston.info(`Message has been sent to ${config.recipientEmails}`);
    });
}

function run(): void {
    let config: cf.Config;
    let server: http.Server;

    const logger = new winston.Logger({
        level: defaultLogLevel,
        transports: [new winston.transports.Console({
            name: "Console",
            timestamp: true,
         })],
    });
    logger.debug("Logger has been initialized.");
    try {
        let cmdArgs: CommandLineArgs;
        cmdArgs = yargs.options("configFilePath", {
            alias: "c",
            describe: "Read setting from specified config file path",
        }).help("help").argv;

        config = cf.readConfig(cmdArgs.configFilePath);

        logger.configure({
            level: config.logLevel,
            transports: [new winston.transports.Console({
            name: "Console",
            timestamp: true,
         })],
        });

        server = http.createServer(constructConnectionHandler(config));
        server.listen(config.httpListenPort, config.httpListenIP);
        logger.info(`Server started.
            httpListenPort ${config.httpListenPort}, httpListenIp ${config.httpListenIP}`);

    } catch (e) {
        logger.error(`Incorrect arguments or config file: ${e.message}`);
        process.exit(1);
    }
}

run();

// -- TODO: Вынести в отдельный модуль всё что касается конфига.
// TODO: Убрать config.json из репозитория и сделать схему.
// TODO: Написать README.
// -- TODO: Добавить в конфиг уровень детализации вывода (logLevel). По умолчанию = info.
// -- TODO: Добавить в лог в консоль дату/время соообщения.
// TODO: форматирование кода.

import * as http from "http";
import * as nodemailer from "nodemailer";
import * as qs from "querystring";
import * as url from "url";
import * as winston from "winston";
import * as yargs from "yargs";
import * as cf from "./config";
// import * as ns from "node-static";

const defaultLogLevel = "debug";

interface CommandLineArgs {
    configFilePath: string;
}

function constructConnectionHandler(
    config: cf.Config,
): (req: http.IncomingMessage, res: http.ServerResponse) => void {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
        try {
            // TODO: пересмотреть все уровни вывода на адекватность.
            //       info должен сообщать о запуске сервера и получении/отправке сообщений.
            //       warn - предвидимые ошибки. всё остальное - в debug/trace.
            // -- TODO: если пришёл запрос не на тот путь или не POST,
            //       или произошли любые ошибки при парсинге - выводить warn.
            // -- TODO: взять всю функцию в try/catch и выводить ошибку уровня error в консоль.
            if (req.method !== "POST") {
                winston.warn(`Request was not POST.`);
                return;
            }
            const urlPathName = url.parse(req.url as string, true);
            // -- TODO: путь вынести в конфиг (httpServerPath). по умолчанию - /
            if (urlPathName.pathname === config.httpServerPath) {
                let bodyStr = "";
                req.on("data", (chunk) => {
                    bodyStr += chunk.toString();
                    // -- TODO: 1e6 - в конфиг (maxHttpRequestSize)
                    if (bodyStr.length > config.maxHttpRequestSize) {
                        // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                        req.connection.destroy();
                    }
                });
                req.on("end", () => {
                    const post = qs.parse(bodyStr);
                    let userMessage = "";
                    for (const name in post) {
                        // -- TODO: _redirect - в конфиг (redirectFieldName)
                        // TODO: если поле _redirect не пришло - отображать страницу-затычку:
                        // routing
                        //       form was submitted successfully.
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
                            } else {
                                res.writeHead(200, { "Content-type": "text/html" });
                                res.write("Form has been submitted successfully.");
                            }
                            res.end();
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

function sendEmail(config: cf.Config, emailText: string, callbackFromSendMail: () => void): void {
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
        callbackFromSendMail();
        // -- TODO: добавить информацию на какой емейл отправлено сообщение.
        winston.info(`Message has been sent to ${config.recipientEmails}`);
    });
}

function run(): void {
    // -- TODO: счиитывать путь к конфигу из аттрибута командной строки:
    //       -c ./config           /     --config="./config"
    // -- по умолчанию - ./config.json
    // -- TODO: передавать путь к кофигу строкой в readConfig()
    // TODO: если произошла ошибка при чтении атрибутов командной строки или конфига,
    //       выходим с process.exit(1)

    let config: cf.Config;
    let server: http.Server;

    winston.remove(winston.transports.Console);
    winston.add(winston.transports.Console, { timestamp: true, level: defaultLogLevel });

    try {
        let cmdArgs: CommandLineArgs;
        cmdArgs = yargs.options("configFilePath", {
            alias: "c",
            describe: "Read setting from specified config file path",
        }).help("help")
            .argv;

        config = cf.readConfig(cmdArgs.configFilePath);

        winston.remove(winston.transports.Console);
        winston.add(winston.transports.Console, { timestamp: true, level: config.logLevel });

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

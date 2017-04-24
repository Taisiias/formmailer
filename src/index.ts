// TODO: Вынести в отдельный модуль всё что касается конфига.
// TODO: Убрать config.json из репозитория и сделать схему.
// TODO: Написать README.
// TODO: Добавить в конфиг уровень детализации вывода (logLevel). По умолчанию = info.
// TODO: Добавить в лог в консоль дату/время соообщения.
// TODO: форматирование кода.

import * as http from "http";
import * as nodemailer from "nodemailer";
import * as qs from "querystring";
import * as url from "url";
import * as winston from "winston";
import * as cf from "./config";

function constructConnectionHandler(
    config: cf.Config): (req: http.IncomingMessage, res: http.ServerResponse) => void {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
        // TODO: пересмотреть все уровни вывода на адекватность.
        //       info должен сообщать о запуске сервера и получении/отправке сообщений.
        //       warn - предвидимые ошибки. всё остальное - в debug/trace.
        winston.debug("Creating server...");
        // TODO: если пришёл запрос не на тот путь или не POST,
        //       или произошли любые ошибки при парсинге - выводить warn.
        // TODO: взять всю функцию в try/catch и выводить ошибку уровня error в консоль.
        if (req.method !== "POST") { return; }
        const urlPathName = url.parse(req.url as string, true);
        res.writeHead(200, { "Content-Type": "application/json" });
        // TODO: путь вынести в конфиг (httpServerPath). по умолчанию - /
        if (urlPathName.pathname === "/receive") {
            let bodyStr = "";
            req.on("data", (chunk) => {
                bodyStr += chunk.toString();
                // TODO: 1e6 - в конфиг (maxHttpRequestSize)
                if (bodyStr.length > 1e6) {
                    // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                    req.connection.destroy();
                }
            });
            req.on("end", () => {
                const post = qs.parse(bodyStr);
                let userMessage = "";
                for (const name in post) {
                    // TODO: _redirect - в конфиг (redirectFieldName)
                    // TODO: если поле _redirect не пришло - отображать страницу-затычку:
                    //       form was submitted successfully.
                    if (name !== "_redirect") {
                        const str = name + ": " + post[name] + "\n";
                        userMessage += str;
                    }
                }
                winston.info("User message: " + userMessage);
                sendEmail(
                    config,
                    userMessage,
                    () => {
                        winston.debug("Redirecting to " + post._redirect);
                        res.writeHead(301, { Location: post._redirect });
                        res.end();
                    });
            });
        } else {
            res.end("END");
        }
    };
}

function sendEmail(config: cf.Config, emailText: string, callbackFromSendMail: () => void): void {
    winston.debug("Entering to sendEmail. Creating Nodemailer transporter.");
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        tls: {
            rejectUnauthorized: false,
        },
    });
    winston.debug("Creating message.");
    const emailMessage = {
        from: config.fromEmail,
        subject: config.subject,
        text: emailText,
        to: config.recipientEmails,
    };
    winston.info("Sending email.");
    transporter.sendMail(emailMessage, (err) => {
        if (err) { winston.error("Error while sending email: " + err.message); }
        callbackFromSendMail();
        // -- TODO: добавить информацию на какой емейл отправлено сообщение.
        winston.info(`Message has been sent to ${config.recipientEmails}`);
    });
}

function run(): void {
    // TODO: счиитывать путь к конфигу из аттрибута командной строки:
    //       -c ./config           /     --config="./config"
    // по умолчанию - ./config.json
    // TODO: передавать путь к кофигу строкой в readConfig()
    // TODO: если произошла ошибка при чтении атрибутов командной строки или конфига,
    //       выходим с process.exit(1)
    const config: cf.Config = cf.readConfig("");

    const server = http.createServer(constructConnectionHandler(config));
    server.listen(config.httpListenPort, config.httpListenIP);
    winston.info("Server started.");
}

run();

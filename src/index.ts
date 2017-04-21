// TODO: Вынести в отдельный модуль всё что касается конфига.
// TODO: Убрать config.json из репозитория и сделать схему.
// TODO: Написать README.
// TODO: Добавить в конфиг уровень детализации вывода (logLevel). По умолчанию = info.
// TODO: Добавить в лог в консоль дату/время соообщения.
// TODO: форматирование кода.

import * as emailvalidator from "email-validator";
import * as fs from "fs";
import * as http from "http";
import * as nodemailer from "nodemailer";
import * as qs from "querystring";
import * as url from "url";
import * as winston from "winston";

interface Config {
    smtpPort: number;
    smtpHost: string;
    recipientEmails: string | string[];
    fromEmail: string;
    subject: string;
    httpListenIP: string;
    httpListenPort: number;
}

// TODO: убираем все глобальные переменные
let config: Config;

function validateFromEmail(fromEmail?: string): string {
    winston.info("Validating fromEmail");
    if (fromEmail === undefined || fromEmail === "") {
        throw new Error("Please add sender's email");
    }
    return fromEmail;
}

function validateEmailRecipients(recipientEmailsStr?: string): string[] {
    // TODO: принимаем в конфиге string|string[] с емейлами. убираем ручную разбивку строки.
    winston.info("Validating recipientEmails");
    if (recipientEmailsStr === undefined) {
        throw new Error("Undefined recipient emails.");
    }
    const recipientEmailsArray = recipientEmailsStr.split(";");
    // TODO: для итерирования используем for of
    for (let i = recipientEmailsArray.length - 1; i >= 0; i--) {
        if (recipientEmailsArray[i].trim() === "") {
            recipientEmailsArray.splice(i, 1);
            continue;
        }
        if (!emailvalidator.validate(recipientEmailsArray[i].trim())) {
            // TODO: используем динамические строки вместо ручной сборки строк.
            throw new Error(`Incorrect email format: ${recipientEmailsArray[i]}`);
        }
        recipientEmailsArray[i] = recipientEmailsArray[i].trim();
    }
    if (recipientEmailsArray.length === 0) {
        throw new Error("Recipient emails list is empty.");
    }
    return recipientEmailsArray;
}

function validateSmtpHost(smtpHost?: string): string {
    // TODO: поубирать выводы о валидации. добавить вывод о том что сервер запущен.
    winston.info("Validating smtpHost.");
    // TODO: отдельные функции валидации не нужны, можно обойтись тренарным оператором.
    if (smtpHost === undefined || smtpHost === "") { smtpHost = "localhost"; }
    return smtpHost;
}

function validateSmtpPort(smtpPort?: number): number {
    winston.info("Validating smtpPort.");
    //  TODO: вынести все константы наверх модуля.
    if (smtpPort === undefined) { smtpPort = 25; }
    return smtpPort;
}

function validateHttpListenPort(httpListenPort?: number): number {
    if (httpListenPort === undefined) { httpListenPort = 80; }
    winston.info("Validating HTTP Listen Port " + httpListenPort);
    return httpListenPort;
}

function validateHttpListenIP(httpListenIP?: string): string {
    if (httpListenIP === undefined) { httpListenIP = "0.0.0.0"; }
    winston.info("Validating HTTP Listen IP " + httpListenIP);
    return httpListenIP;
}

function validateSubject(subject?: string): string {
    winston.info("Validating subject.");
    if (subject === undefined) { subject = "Default Subject"; }
    return subject;
}

function ParseConfig(cf: Partial<Config>): Config {
    return {
        fromEmail: validateFromEmail(cf.fromEmail),
        httpListenIP: validateHttpListenIP(cf.httpListenIP),
        httpListenPort: validateHttpListenPort(cf.httpListenPort),
        recipientEmails: validateEmailRecipients(cf.recipientEmails as string),
        smtpHost: validateSmtpHost(cf.smtpHost),
        smtpPort: validateSmtpPort(cf.smtpPort),
        subject: validateSubject(cf.subject),
    };
}

// TODO: все функции называем в camelCase: readConfig()
// TODO: эта функция должна возвращать Config (или кидать ошибки)
function ReadConfig(): void {
    // TODO: убираем лишний вывод.
    winston.info("Reading config.");

    if (!fs.existsSync("./config.json")) {
        winston.error("Config file was not found.");
        return;
    }

    let fileContent = "";
    try {
        fileContent = fs.readFileSync("./config.json").toString();
    } catch (e) {
        winston.error("Config cannot be read.");
        return;
    }

    let json;
    try {
        json = JSON.parse(fileContent);
    } catch (e) {
        winston.error("Config file cannot be parsed.");
        return;
    }

    try {
        config = ParseConfig(json);
    } catch (e) {
        winston.error(e.message);
        return;
    }
}

// TODO: убираем все глобальные переменные
// TODO: connectionHandler выносим как функцию. Инициализация сервера должна быть в run()
const server = http.createServer((req, res) => {
    // TODO: пересмотреть все уровни вывода на адекватность.
    //       info должен сообщать о запуске сервера и получении/отправке сообщений.
    //       warn - предвидимые ошибки. всё остальное - в debug/trace.
    winston.info("Creating server...");
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
                userMessage,
                () => {
                    winston.info("Redirecting to " + post._redirect);
                    res.writeHead(301, { Location: post._redirect });
                    res.end();
                });
        });
    } else {
        res.end("END");
    }
});

function sendEmail( emailText: string, callbackFromSendMail: () => void): void {
    winston.info("Entering to sendMail. Creating Nodemailer transporter.");
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        tls: {
            rejectUnauthorized: false,
        },
    });
    winston.info("Creating message.");
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
        // TODO: добавить информацию на какой емейл отправлено сообщение.
        winston.info("Message sent.");
    });
}

function run(): void {
    // TODO: счиитывать путь к конфигу из аттрибута командной строки:
    //       -c ./config           /     --config="./config"
    // по умолчанию - ./config.json
    // TODO: передавать путь к кофигу строкой в readConfig()
    // TODO: если произошла ошибка при чтении атрибутов командной строки или конфига,
    //       выходим с process.exit(1)
    ReadConfig();
    server.listen(config.httpListenPort, config.httpListenIP);
}

run();

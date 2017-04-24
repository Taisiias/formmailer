import * as emailvalidator from "email-validator";
import * as fs from "fs";
import * as winston from "winston";

export interface Config {
    smtpPort: number;
    smtpHost: string;
    recipientEmails: string | string[];
    fromEmail: string;
    subject: string;
    httpListenIP: string;
    httpListenPort: number;
    maxHttpRequestSize: number;
}

const defaultConfigPath = "./config.json";
const defaultHttpListenIp = "0.0.0.0";
const defaultHttpListenPort = 80;
const defaultMaxHttpRequestSize = 1e6;
const defaultSmtpHost = "localhost";
const defaultSmtpPort = 25;
const defaultSubject = "Message from Formmailer";

// -- TODO: все функции называем в camelCase: readConfig()
// -- TODO: эта функция должна возвращать Config (или кидать ошибки)
export function readConfig(cfPath: string): Config {
    // TODO: убираем лишний вывод.
    let cf: Config;
    const configFilePath = cfPath ? cfPath : defaultConfigPath;
    winston.debug("Reading config file.");

    if (!fs.existsSync(configFilePath)) {
        winston.warn("Config file was not found.");
        throw new Error("Config file was not found.");
    }

    let fileContent = "";
    try {
        fileContent = fs.readFileSync(configFilePath).toString();
    } catch (e) {
        winston.warn(`Config file cannot be read. ${e.Message}`);
        throw new Error(`Config file cannot be read. ${e.Message}`);
    }

    let json;
    try {
        json = JSON.parse(fileContent);
    } catch (e) {
        winston.warn(`Config file cannot be parsed. ${e.Message}`);
        throw new Error(`Config file cannot be parsed. ${e.Message}`);
    }

    try {
        cf = ParseConfig(json);
    } catch (e) {
        throw e;
    }
    return cf;
}

function validateFromEmail(fromEmail?: string): string {
    winston.debug("Validating fromEmail");
    if (!fromEmail) {
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

function ParseConfig(cf: Partial<Config>): Config {
    return {
        fromEmail: validateFromEmail(cf.fromEmail),
        httpListenIP: cf.httpListenIP ? cf.httpListenIP : defaultHttpListenIp,
        httpListenPort: cf.httpListenPort ? cf.httpListenPort : defaultHttpListenPort,
        maxHttpRequestSize:
            cf.maxHttpRequestSize ? cf.maxHttpRequestSize : defaultMaxHttpRequestSize,
        recipientEmails: validateEmailRecipients(cf.recipientEmails as string),
        smtpHost: cf.smtpHost ? cf.smtpHost : defaultSmtpHost,
        smtpPort: cf.smtpPort ? cf.smtpPort : defaultSmtpPort,
        subject: cf.subject ? cf.subject : defaultSubject,
    };
}

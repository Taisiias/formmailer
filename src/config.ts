import * as emailvalidator from "email-validator";
import * as fs from "fs";
import * as winston from "winston";

export interface Config {
    smtpPort: number;
    smtpHost: string;
    recipientEmails: string | string[];
    redirectFieldName: string;
    fromEmail: string;
    logLevel: string;
    subject: string;
    httpListenIP: string;
    httpListenPort: number;
    httpServerPath: string;
    maxHttpRequestSize: number;
}

const defaultConfigPath = "./config.json";
const defaultHttpListenIp = "0.0.0.0";
const defaultHttpListenPort = 8080;
const defaulthttpServerPath = "/";
const defaultMaxHttpRequestSize = 1e6;
const defaultRedirectFieldName = "_defaultRedirect";
const defaultSmtpHost = "localhost";
const defaultSmtpPort = 25;
const defaultSubject = "Message from Formmailer";
const defaultLogLevel = "debug";

// -- TODO: все функции называем в camelCase: readConfig()
// -- TODO: эта функция должна возвращать Config (или кидать ошибки)
export function readConfig(cfPath: string): Config {

    // -- TODO: убираем лишний вывод.
    let cf: Config;
    const configFilePath = cfPath ? cfPath : defaultConfigPath;

    if (!fs.existsSync(configFilePath)) {
        winston.warn(`Config file was not found.`);
        throw new Error(`Config file was not found.`);
    }

    let fileContent = "";
    try {
        fileContent = fs.readFileSync(configFilePath).toString();
    } catch (e) {
        winston.warn(`Config file cannot be read. ${e.Message}`);
        throw new Error(`Config file cannot be read. ${e.Message}`);
    }

    let json: Object;
    try {
        json = JSON.parse(fileContent);
    } catch (e) {
        winston.warn(`Config file cannot be parsed. ${e.Message}`);
        throw new Error(`Config file cannot be parsed. ${e.Message}`);
    }

    try {
        cf = parseConfig(json);
    } catch (e) {
        winston.error(`Error while parsing config file ${e.Message}`);
        throw e;
    }
    return cf;
}

function validateFromEmail(fromEmail?: string): string {
    if (!fromEmail) {
        throw new Error("Please add sender's email");
    }
    return fromEmail;
}

function validateEmailRecipients(recipientEmailsStr?: string | string[]): string[] {
    // -- TODO: принимаем в конфиге string|string[] с емейлами. убираем ручную разбивку строки.
    if (!recipientEmailsStr) {
        throw new Error("Undefined recipient emails.");
    }
    let recipientEmailsArray: string[] = [];
    if (typeof recipientEmailsStr === "string") {
        recipientEmailsArray[0] = recipientEmailsStr;
    } else {
        recipientEmailsArray = recipientEmailsStr;
    }
    // -- TODO: для итерирования используем for of
    for (const item of recipientEmailsArray) {
        if (item === "") {
            recipientEmailsArray.splice((recipientEmailsArray.indexOf(item)), 1);
            continue;
        }
        if (!emailvalidator.validate(item.trim())) {
            // -- TODO: используем динамические строки вместо ручной сборки строк.
            throw new Error(`Incorrect email format: ${item}`);
        }
        recipientEmailsArray[recipientEmailsArray.indexOf(item)] = item.trim();
    }
    if (recipientEmailsArray.length === 0) {
        throw new Error("Recipient emails list is empty.");
    }
    return recipientEmailsArray;
}

function parseConfig(cf: Partial<Config>): Config {

    return {
        fromEmail: validateFromEmail(cf.fromEmail),
        httpListenIP: cf.httpListenIP ? cf.httpListenIP : defaultHttpListenIp,
        httpListenPort: cf.httpListenPort ? cf.httpListenPort : defaultHttpListenPort,
        httpServerPath: cf.httpServerPath ? cf.httpServerPath : defaulthttpServerPath,
        logLevel: cf.logLevel ? cf.logLevel : defaultLogLevel,
        maxHttpRequestSize:
        cf.maxHttpRequestSize ? cf.maxHttpRequestSize : defaultMaxHttpRequestSize,
        recipientEmails: validateEmailRecipients(cf.recipientEmails),
        redirectFieldName: cf.redirectFieldName ? cf.redirectFieldName : defaultRedirectFieldName,
        smtpHost: cf.smtpHost ? cf.smtpHost : defaultSmtpHost,
        smtpPort: cf.smtpPort ? cf.smtpPort : defaultSmtpPort,
        subject: cf.subject ? cf.subject : defaultSubject,
    };
}

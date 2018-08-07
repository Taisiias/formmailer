import * as deepMerge from "deepmerge";
import * as fs from "fs";
import * as smtpTransport from "nodemailer-smtp-transport";

export interface Config {
    assetsFolder: string;
    httpsCertificatePath: string;
    databaseFileName: string;
    enableHtmlEmail: boolean;
    enableHttp: boolean;
    enableHttps: boolean;
    enableWebInterface: boolean;
    formTargets: { [k: string]: string | string[] | FormTargetData };
    fromEmail: string;
    httpListenIP: string;
    httpsListenIP: string;
    httpListenPort: number;
    httpsListenPort: number;
    logLevel: string;
    httpsPrivateKeyPath: string;
    maxHttpRequestSize: number;
    reCaptchaSecret: string;
    reCaptchaSiteKey: string;
    recipientEmails: string | string[];
    redirectFieldName: string;
    enableRecaptcha: boolean;
    smtpOptions: smtpTransport.SmtpOptions;
    subject: string;
    webInterfaceIP: string;
    webInterfacePort: number;
}

export interface FormTargetData {
    recipient: string | string[];
    subject?: string;
}

const DefaultConfigObject: Config = {
    assetsFolder: "./assets",
    databaseFileName: "./formmailer.db",
    enableHtmlEmail: true,
    enableHttp: true,
    enableHttps: true,
    enableRecaptcha: false,
    enableWebInterface: true,
    formTargets: {},
    fromEmail: "formmailer@localhost",
    httpListenIP: "0.0.0.0",
    httpListenPort: 80,
    httpsCertificatePath: "",
    httpsListenIP: "0.0.0.0",
    httpsListenPort: 443,
    httpsPrivateKeyPath: "",
    logLevel: "info",
    maxHttpRequestSize: 1e6,
    reCaptchaSecret: "",
    reCaptchaSiteKey: "",
    recipientEmails: [],
    redirectFieldName: "_redirect",
    smtpOptions: {
        host: "localhost",
        port: 25,
        tls: { rejectUnauthorized: false },
    },
    subject: "Form submitted on {{{refererUrl}}}",
    webInterfaceIP: "0.0.0.0",
    webInterfacePort: 3002,
};

export function readConfig(path: string): Config {

    let cf: Config;

    if (!fs.existsSync(path)) {
        throw new Error(`Config file was not found.`);
    }

    let fileContent = "";
    try {
        fileContent = fs.readFileSync(path).toString();
    } catch (e) {
        throw new Error(`Config file cannot be read. ${e}`);
    }

    try {
        if (fileContent === "") {
            throw new Error(`Config file is empty`);
        }
        cf = createConfigObject(fileContent);
    } catch (e) {
        throw new Error(`Config file cannot be parsed. ${e}`);
    }
    return cf;
}

export function createConfigObject(fileContent: string): Config {
    let cf: Config;
    const json = JSON.parse(fileContent) as Config;
    /* tslint:disable:no-any */
    const mergedObject: { [k: string]: any } = deepMerge(DefaultConfigObject, json);

    if (!mergedObject.hasOwnProperty("recipientEmails") && !mergedObject.recipientEmails) {
        throw new Error(`Property recipientEmails is missing.`);
    }

    cf = mergedObject as Config;

    return cf;
}

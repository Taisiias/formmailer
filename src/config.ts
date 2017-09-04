import * as fs from "fs";

export interface Config {
    assetsFolder: string;
    databaseFileName: string;
    fromEmail: string;
    httpListenIP: string;
    httpListenPort: number;
    logLevel: string;
    maxHttpRequestSize: number;
    reCaptchaSecret: string;
    recipientEmails: string | string[];
    redirectFieldName: string;
    requireReCaptchaResponse: boolean;
    smtpHost: string;
    smtpPort: number;
    subject: string;
}

const DefaultConfigObject = {
    assetsFolder: "./assets",
    databaseFileName: "./formmailer.db",
    fromEmail: "formmailer@localhost",
    httpListenIP: "0.0.0.0",
    httpListenPort: 3000,
    logLevel: "info",
    maxHttpRequestSize: 1e6,
    reCaptchaSecret: "",
    redirectFieldName: "_redirect",
    requireReCaptchaResponse: false,
    smtpHost: "localhost",
    smtpPort: 25,
    subject: "Form submitted on {{referrerUrl}}",
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

    let json;
    try {
        if (fileContent === "") {
            throw new Error(`Config file is empty`);
        }
        json = JSON.parse(fileContent);
        /* tslint:disable:no-any */
        const mergedObject: { [k: string]: any } = Object.assign(DefaultConfigObject, json);

        if (!mergedObject.hasOwnProperty("recipientEmails") && !mergedObject.recipientEmails) {
            throw new Error(`Property recipientEmails is missing.`);
        }

        if (mergedObject.requireReCaptchaResponse && !mergedObject.reCaptchaSecret) {
            throw new Error(`requireReCaptchaResponse is set to true but
                                reCaptchaSecret is not provided`);
        }

        cf = mergedObject as Config;
    } catch (e) {
        throw new Error(`Config file cannot be parsed. ${e}`);
    }
    return cf;
}

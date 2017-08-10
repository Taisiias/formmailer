import * as fs from "fs";

export interface Config {
    fromEmail: string;
    httpListenIP: string;
    httpListenPort: number;
    httpServerPath: string;
    logLevel: string;
    maxHttpRequestSize: number;
    recipientEmails: string | string[];
    redirectFieldName: string;
    smtpHost: string;
    smtpPort: number;
    subject: string;
}

const DefaultConfigObject = {
    fromEmail: "formmailer@localhost",
    httpListenIP: "0.0.0.0",
    httpListenPort: 8080,
    httpServerPath: "/",
    logLevel: "debug",
    maxHttpRequestSize: 1e6,
    redirectFieldName: "_defaultRedirect",
    smtpHost: "localhost",
    smtpPort: 25,
    subject: "Message from Formmailer",
};

const defaultConfigPath = "./config.json";

export function readConfig(cfPath?: string): Config {

    let cf: Config;
    const configFilePath = cfPath ? cfPath : defaultConfigPath;

    if (!fs.existsSync(configFilePath)) {
        throw new Error(`Config file was not found.`);
    }

    let fileContent = "";
    try {
        fileContent = fs.readFileSync(configFilePath).toString();
    } catch (e) {
        throw new Error(`Config file cannot be read. ${e}`);
    }

    let json;
    try {
        if (fileContent === "") {
            throw new Error (`Config file is empty`);
        }
        json = JSON.parse(fileContent);
        /* tslint:disable:no-any */
        const mergedObject: {[k: string]: any} = Object.assign(DefaultConfigObject, json);

        if (!mergedObject.hasOwnProperty("recipientEmails") && !mergedObject.recipientEmails) {
            throw new Error(`Property recipientEmails is missing.`);
        }

        cf = mergedObject as Config;
    } catch (e) {
        throw new Error(`Config file cannot be parsed. ${e}`);
    }
    return cf;
}

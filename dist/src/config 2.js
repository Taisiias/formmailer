"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deepMerge = require("deepmerge");
const fs = require("fs");
const DefaultConfigObject = {
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
function readConfig(path) {
    let cf;
    if (!fs.existsSync(path)) {
        throw new Error(`Config file was not found.`);
    }
    let fileContent = "";
    try {
        fileContent = fs.readFileSync(path).toString();
    }
    catch (e) {
        throw new Error(`Config file cannot be read. ${e}`);
    }
    try {
        if (fileContent === "") {
            throw new Error(`Config file is empty`);
        }
        cf = createConfigObject(fileContent);
    }
    catch (e) {
        throw new Error(`Config file cannot be parsed. ${e}`);
    }
    return cf;
}
exports.readConfig = readConfig;
function createConfigObject(fileContent) {
    let cf;
    const json = JSON.parse(fileContent);
    /* tslint:disable:no-any */
    const mergedObject = deepMerge(DefaultConfigObject, json);
    if (!mergedObject.hasOwnProperty("recipientEmails") && !mergedObject.recipientEmails) {
        throw new Error(`Property recipientEmails is missing.`);
    }
    cf = mergedObject;
    return cf;
}
exports.createConfigObject = createConfigObject;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const he = require("he");
const mst = require("mustache");
const PLAIN_TEXT_EMAIL_TEMPLATE_PATH = "./assets/plain-text-email-template.mst";
const HTML_EMAIL_TEMPLATE_PATH = "./assets/html-email-template.html";
function constructFieldsArrayForMustache(post) {
    const resultingArray = [];
    for (const name in post) {
        if (name.startsWith("_") || name === "g-recaptcha-response") {
            continue;
        }
        const buf = { key: "", textValue: "" };
        buf.key = name;
        buf.textValue = he.decode(post[name]);
        if (buf.textValue.includes("\n")) {
            buf.textValue = "\n" + buf.textValue.split("\n").map((s) => "     " + s).join("\n");
        }
        resultingArray.push(buf);
    }
    return resultingArray;
}
exports.constructFieldsArrayForMustache = constructFieldsArrayForMustache;
function renderEmailContent(parsedRequestData, formName, refererUrl, senderIpAddress) {
    // rendering email contents
    const mustacheTemplateData = constructFieldsArrayForMustache(parsedRequestData);
    const plainTextEmailTemplate = fs.readFileSync(PLAIN_TEXT_EMAIL_TEMPLATE_PATH).toString();
    const htmlEmailTemplate = fs.readFileSync(HTML_EMAIL_TEMPLATE_PATH).toString();
    const templateData = {
        formName,
        mustacheTemplateData,
        refererUrl,
        senderIpAddress,
    };
    const plainTextEmailMessage = mst.render(plainTextEmailTemplate, templateData);
    const htmlEmailMessage = mst.render(htmlEmailTemplate, templateData);
    return [plainTextEmailMessage, htmlEmailMessage];
}
exports.renderEmailContent = renderEmailContent;
function renderSubject(subject, refererUrl, formName) {
    return mst.render(subject, { refererUrl, formName });
}
exports.renderSubject = renderSubject;

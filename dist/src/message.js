"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const he = require("he");
const mst = require("mustache");
const asset_1 = require("./asset");
const PLAIN_TEXT_EMAIL_TEMPLATE_FILENAME = "plain-text-email-template.mst";
const HTML_EMAIL_TEMPLATE_FILENAME = "html-email-template.html";
function constructFieldsArrayForMustache(post) {
    const resultingArray = [];
    for (const name in post) {
        if (name.startsWith("_") || name === "g-recaptcha-response") {
            continue;
        }
        const buf = { key: "", textValue: "" };
        buf.key = name;
        buf.textValue = he.decode(post[name]);
        // tslint:disable-next-line:prefer-conditional-expression
        if (buf.textValue.includes("\n")) {
            buf.textValue = "\n" + buf.textValue.split("\n").map((s) => "     " + s).join("\n");
        }
        else {
            buf.textValue = ` ${buf.textValue}`;
        }
        resultingArray.push(buf);
    }
    return resultingArray;
}
exports.constructFieldsArrayForMustache = constructFieldsArrayForMustache;
function renderEmailContent(parsedRequestData, refererUrl, senderIpAddress, assetFolder) {
    // rendering email contents
    const mustacheTemplateData = constructFieldsArrayForMustache(parsedRequestData);
    const plainTextEmailTemplate = fs.readFileSync(asset_1.getAssetFolderPath(assetFolder, PLAIN_TEXT_EMAIL_TEMPLATE_FILENAME)).toString();
    const htmlEmailTemplate = fs.readFileSync(asset_1.getAssetFolderPath(assetFolder, HTML_EMAIL_TEMPLATE_FILENAME)).toString();
    const formName = parsedRequestData._formname ?
        `Submitted form: ${parsedRequestData._formname}\n` : "";
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
function renderSubject(subjectTemplate, refererUrl, formName) {
    return mst.render(subjectTemplate, { refererUrl, formName });
}
exports.renderSubject = renderSubject;

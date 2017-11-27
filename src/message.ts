import * as fs from "fs";
import * as he from "he";
import * as mst from "mustache";

import { getAssetFolderPath } from "./asset";

const PLAIN_TEXT_EMAIL_TEMPLATE_FILENAME = "plain-text-email-template.mst";
const HTML_EMAIL_TEMPLATE_FILENAME = "html-email-template.html";

export interface MustacheTemplateObject {
    key: string;
    textValue: string;
}

export function constructFieldsArrayForMustache(
    post: { [k: string]: string },
): MustacheTemplateObject[] {
    const resultingArray: MustacheTemplateObject[] = [];
    for (const name in post) {
        if (name.startsWith("_") || name === "g-recaptcha-response") { continue; }

        const buf: MustacheTemplateObject = { key: "", textValue: "" };
        buf.key = name;
        buf.textValue = he.decode(post[name]);

        if (buf.textValue.includes("\n")) {
            buf.textValue = "\n" + buf.textValue.split("\n").map((s) => "     " + s).join("\n");
        }
        resultingArray.push(buf);
    }
    return resultingArray;
}

export function renderEmailContent(
    parsedRequestData: { [k: string]: string },
    refererUrl: string,
    senderIpAddress: string,
    assetFolder: string,
): [string, string] {
    // rendering email contents
    const mustacheTemplateData = constructFieldsArrayForMustache(parsedRequestData);

    const plainTextEmailTemplate =
        fs.readFileSync(getAssetFolderPath(
            assetFolder, PLAIN_TEXT_EMAIL_TEMPLATE_FILENAME)).toString();

    const htmlEmailTemplate =
        fs.readFileSync(getAssetFolderPath(assetFolder, HTML_EMAIL_TEMPLATE_FILENAME)).toString();

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

export function renderSubject(
    subjectTemplate: string,
    refererUrl: string,
    formName: string,
): string {
    return mst.render(subjectTemplate, { refererUrl, formName });
}

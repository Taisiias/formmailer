import * as fs from "fs";
import * as he from "he";
import * as mst from "mustache";

const PLAIN_TEXT_EMAIL_TEMPLATE_PATH = "./assets/plain-text-email-template.mst";
const HTML_EMAIL_TEMPLATE_PATH = "./assets/html-email-template.html";

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
    formName: string,
    refererUrl: string,
    senderIpAddress: string,
): [string, string] {
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

export function renderSubject(
    subject: string,
    refererUrl: string,
    formName: string,
): string {
    return mst.render(subject, { refererUrl, formName });
}

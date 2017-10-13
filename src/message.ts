import * as he from "he";
import winston = require("winston");

export interface MustacheTemplateObject {
    key: string;
    htmlValue: string;
    textValue: string;
}

export async function constructFieldsValuesStr(post: { [k: string]: string }): Promise<string> {
    let userMessage = "";
    for (const name in post) {
        if (!name.startsWith("_") && name !== "g-recaptcha-response") {
            let buf: string = he.decode(post[name]);
            if (buf.includes("\n")) {
                buf = "\n" + buf.split("\n").map((s) => "     " + s).join("\n");
            }
            userMessage += `${name}: ${buf}\n`;
        }
    }
    return userMessage;
}

export function constructFieldsArrayForMustache(
    post: { [k: string]: string }): MustacheTemplateObject[] {
    const resultingArray: MustacheTemplateObject[] = [];
    for (const name in post) {
        if (!name.startsWith("_") && name !== "g-recaptcha-response") {
            // TODO: Construct Array of objects
            const buf: MustacheTemplateObject = { key: "", htmlValue: "", textValue: "" };
            buf.key = name;
            buf.textValue = he.decode(post[name]);
            winston.debug(`MustacheTemplateObject: ${buf.key} = ${buf.textValue}`);
            if (buf.textValue.includes("\n")) {
                buf.textValue = "\n" + buf.textValue.split("\n").map((s) => "     " + s).join("\n");
            }
            buf.htmlValue = buf.textValue;
            resultingArray.push(buf);
        }
    }
    return resultingArray;
}

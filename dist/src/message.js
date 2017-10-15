"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const he = require("he");
const winston = require("winston");
function constructFieldsArrayForMustache(post) {
    const resultingArray = [];
    for (const name in post) {
        if (!name.startsWith("_") && name !== "g-recaptcha-response") {
            const buf = { key: "", htmlValue: "", textValue: "" };
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
exports.constructFieldsArrayForMustache = constructFieldsArrayForMustache;

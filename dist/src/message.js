"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const he = require("he");
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

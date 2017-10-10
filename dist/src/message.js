"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const he = require("he");
function constructFieldsValuesStr(post) {
    return __awaiter(this, void 0, void 0, function* () {
        let userMessage = "";
        for (const name in post) {
            if (!name.startsWith("_") && name !== "g-recaptcha-response") {
                let buf = he.decode(post[name]);
                if (buf.includes("\n")) {
                    buf = "\n" + buf.split("\n").map((s) => "     " + s).join("\n");
                }
                userMessage += `${name}: ${buf}\n`;
            }
        }
        return userMessage;
    });
}
exports.constructFieldsValuesStr = constructFieldsValuesStr;

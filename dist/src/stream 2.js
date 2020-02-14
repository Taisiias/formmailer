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
function readReadable(s, maxRequestSize) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let bodyStr = "";
            s.on("data", (chunk) => {
                bodyStr += chunk.toString();
                if (bodyStr.length > maxRequestSize) {
                    // FLOOD ATTACK OR FAULTY CLIENT
                    reject("Maximum request size exceeded");
                }
            });
            s.on("end", () => {
                resolve(bodyStr);
            });
        });
    });
}
exports.readReadable = readReadable;

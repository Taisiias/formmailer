"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function readReadable(s, maxRequestSize) {
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
}
exports.readReadable = readReadable;

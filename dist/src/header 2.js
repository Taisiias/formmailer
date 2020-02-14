"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function setCorsHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
}
exports.setCorsHeaders = setCorsHeaders;

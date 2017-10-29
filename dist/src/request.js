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
const qs = require("querystring");
const stream_1 = require("./stream");
function parseRequestData(req, maxHttpRequestSize) {
    return __awaiter(this, void 0, void 0, function* () {
        const bodyStr = yield stream_1.readReadable(req, maxHttpRequestSize);
        const isAjax = isAjaxRequest(req);
        const postedData = isAjax ? JSON.parse(bodyStr) : qs.parse(bodyStr);
        return [postedData, bodyStr];
    });
}
exports.parseRequestData = parseRequestData;
function isAjaxRequest(req) {
    return req.headers["content-type"] === "application/json" ||
        req.headers["content-type"] === "application/javascript";
}
exports.isAjaxRequest = isAjaxRequest;

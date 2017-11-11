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
const rp = require("request-promise");
class RecaptchaFailure extends Error {
}
exports.RecaptchaFailure = RecaptchaFailure;
function checkIfSpam(remoteip, response, secret) {
    return __awaiter(this, void 0, void 0, function* () {
        const options = {
            form: {
                remoteip,
                response,
                secret,
            },
            json: true,
            method: "POST",
            uri: "https://google.com/recaptcha/api/siteverify",
        };
        // tslint:disable-next-line:await-promise
        const body = (yield rp(options));
        return !body.success;
    });
}
function processReCaptcha(gRecaptchaResponse, disableRecaptcha, remoteAddress, reCaptchaSecret) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!reCaptchaSecret || disableRecaptcha) {
            return;
        }
        const isSpam = yield checkIfSpam(remoteAddress, gRecaptchaResponse, reCaptchaSecret);
        if (isSpam) {
            throw new RecaptchaFailure(`reCAPTCHA failure.`);
        }
    });
}
exports.processReCaptcha = processReCaptcha;

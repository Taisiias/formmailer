"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getSubject(config, key) {
    const value = config.formTargets[key];
    if (!value) {
        return undefined;
    }
    if (!(typeof value === "string") && !(value instanceof Array)) {
        return value.subject;
    }
    return undefined;
}
exports.getSubject = getSubject;
function getRecipients(config, key) {
    const value = config.formTargets[key];
    if (!value) {
        return undefined;
    }
    if (typeof value === "string") {
        return [value];
    }
    if (value instanceof Array) {
        return value;
    }
    const targetRecipient = value.recipient;
    if (typeof targetRecipient === "string") {
        return [targetRecipient];
    }
    return targetRecipient;
}
exports.getRecipients = getRecipients;

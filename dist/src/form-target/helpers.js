"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getSubject(config, formTargetKey) {
    if (!formTargetKey) {
        return config.subject;
    }
    const currentFormSettings = config.formTargets[formTargetKey];
    if (!currentFormSettings ||
        (typeof currentFormSettings === "string") ||
        (currentFormSettings instanceof Array)) {
        return config.subject;
    }
    else {
        return currentFormSettings.subject || config.subject;
    }
}
exports.getSubject = getSubject;
function getRecipients(config, formTargetKey) {
    if (!formTargetKey) {
        return config.recipientEmails;
    }
    const currentFormSettings = config.formTargets[formTargetKey];
    if (!currentFormSettings) {
        return config.recipientEmails;
    }
    if (typeof currentFormSettings === "string" || currentFormSettings instanceof Array) {
        return currentFormSettings;
    }
    return currentFormSettings.recipient;
}
exports.getRecipients = getRecipients;

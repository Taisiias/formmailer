import { Config } from "../config";

export function getSubjectTemplate(
    config: Config,
    formTargetKey: string,
): string {
    if (!formTargetKey) {
        return config.subject;
    }

    const currentFormSettings = config.formTargets[formTargetKey];
    if (!currentFormSettings ||
        (typeof currentFormSettings === "string") ||
        (currentFormSettings instanceof Array)) {
        return config.subject;
    } else {
        return currentFormSettings.subject || config.subject;
    }
}

export function getRecipients(
    config: Config,
    formTargetKey: string,
): string | string[] {
    if (!formTargetKey) {
        return config.recipientEmails;
    }
    const currentFormSettings = config.formTargets[formTargetKey];
    if (!currentFormSettings) { return config.recipientEmails; }

    if (typeof currentFormSettings === "string" || currentFormSettings instanceof Array) {
        return currentFormSettings;
    }

    return currentFormSettings.recipient;
}

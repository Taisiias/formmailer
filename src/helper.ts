import { Config } from "./config";

export function targetFormExists(
    config: Config,
    key: string,
): boolean {
    if (config.formTargets && !config.formTargets.hasOwnProperty(key)) {
        return false;
    } else {
        return true;
    }
}

export function getSubject(
    config: Config,
    key: string,
): string {
    let subject = "";

    const value = config.formTargets[key];
    if (!(typeof value === "string") && !(value instanceof Array)) {
        subject = value.subject;
    }
    return subject;
}

export function getRecipients(
    config: Config,
    key: string,
): string | string[] {
    let to: string | string[] = "";
    const value = config.formTargets[key];
    if (typeof value === "string" || value instanceof Array) {
        to = value;
    } else {
        to = value.recipient;
    }

    return to;
}

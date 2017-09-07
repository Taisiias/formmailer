// TODO: rename file to form-target/helpers.ts

import { Config } from "./config";

export function getSubject(
    config: Config,
    key: string,
): string | undefined {
    const value = config.formTargets[key];
    if (!value) { return undefined; }
    if (!(typeof value === "string") && !(value instanceof Array)) {
        return value.subject;
    }
    return undefined;
}

export function getRecipients(
    config: Config,
    key: string,
): string[] | undefined {
    const value = config.formTargets[key];
    if (!value) { return undefined; }

    if (typeof value === "string") { return [value]; }
    if (value instanceof Array) { return value; }

    const targetRecipient = value.recipient;
    if (typeof targetRecipient === "string") { return [targetRecipient]; }
    return targetRecipient;
}

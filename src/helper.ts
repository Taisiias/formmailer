import { Config } from "./config";

 export function GetSubject(
    config: Config,
    key: string,
): Promise<string> {
    let subject = "";
    let to: string | string[] = config.recipientEmails;

    if (config.formTargets) {
        if (config.formTargets.hasOwnProperty(key)) {
            const value = config.formTargets[key];
            if (typeof value === "string" || value instanceof Array) {
                to = value;
            } else {
                to = value.recipient;
                subject = value.subject;
            }
        }
    }
    return Promise.resolve(subject);
}

 export function GetRecipients(
    config: Config,
    key: string,
): Promise<string | string[]> {
    let to: string | string[] = "";

    if (config.formTargets) {
        if (config.formTargets.hasOwnProperty(key)) {
            const value = config.formTargets[key];
            if (typeof value === "string" || value instanceof Array) {
                to = value;
            } else {
                to = value.recipient;
            }
        }
    }
    return Promise.resolve(to);
}

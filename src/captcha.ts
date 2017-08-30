import * as rp from "request-promise";

interface RecaptchaResponse {
    success: boolean;
    challenge_ts: Date;
    hostname: string;
    errorCodes: string[];
}

export async function checkCaptcha(
    remoteip: string,
    response: string,
    secret: string,
): Promise<boolean> {
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
    const body: RecaptchaResponse = await rp(options);
    return body.success;
}

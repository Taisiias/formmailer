import * as rp from "request-promise";

interface RecaptchaResponse {
    success: boolean;
    challenge_ts: Date;
    hostname: string;
    errorCodes: string[];
}

export async function CheckCaptcha(
    remoteAddress: string,
    reCaptchaResponse: string,
    reCaptchaSecret: string,
): Promise<boolean> {
    const options = {
        form: {
            remoteip: remoteAddress,
            response: reCaptchaResponse,
            secret: reCaptchaSecret,
        },
        json: true,
        method: "POST",
        uri: "https://google.com/recaptcha/api/siteverify",
    };
    const body: RecaptchaResponse = await rp(options);
    return body.success;
}

import * as rp from "request-promise";

interface RecaptchaResponse {
    success: boolean;
    challenge_ts: Date;
    hostname: string;
    errorCodes: string[];
}

export class RecaptchaFailure extends Error { }

async function checkIfSpam(
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
    // tslint:disable-next-line:await-promise
    const body = (await rp(options)) as RecaptchaResponse;
    return !body.success;
}

export async function processReCaptcha(
    gRecaptchaResponse: string,
    disableRecaptcha: boolean,
    remoteAddress: string,
    reCaptchaSecret: string,
): Promise<void> {
    if (!reCaptchaSecret || disableRecaptcha) {
        return;
    }

    const isSpam = await checkIfSpam(
        remoteAddress,
        gRecaptchaResponse,
        reCaptchaSecret,
    );

    if (isSpam) {
        throw new RecaptchaFailure(`reCAPTCHA failure.`);
    }
}

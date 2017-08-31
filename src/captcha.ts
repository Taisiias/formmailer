import * as rp from "request-promise";

interface RecaptchaResponse {
    success: boolean;
    challenge_ts: Date;
    hostname: string;
    errorCodes: string[];
}

export class RecaptchaFailure extends Error { }

export async function verifyGoogleCaptcha(
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

export async function checkCaptcha(
    postReCaptchaResponse: string,
    requireReCaptchaResponse: boolean,
    remoteAddress: string,
    reCaptchaSecret: string,
): Promise<void> {
    if (!reCaptchaSecret) {
        return;
    }

    if (requireReCaptchaResponse && !postReCaptchaResponse) {
        throw new RecaptchaFailure(
            `requireReCaptchaResponse is set to true but g-recaptcha-response is missing in POST`);
    }

    if (postReCaptchaResponse) {
        const notSpam = await verifyGoogleCaptcha(
            remoteAddress,
            postReCaptchaResponse,
            reCaptchaSecret,
        );
        if (!notSpam) {
            throw new RecaptchaFailure(`reCAPTCHA failure.`);
        }
    }
}

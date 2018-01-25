import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as smtp from "smtp-server";

export function closeServers(
    smtpServer: smtp.SMTPServer,
    httpServer: http.Server | undefined,
    httpsServer: https.Server | undefined,
    viewEmailHistoryHttpServer: http.Server | undefined,
): void {
    smtpServer.close(() => {
        return;
    });
    if (httpServer) {
        httpServer.close();
    }
    if (httpsServer) {
        httpsServer.close();
    }
    if (viewEmailHistoryHttpServer) {
        viewEmailHistoryHttpServer.close();
    }
}

export function parseTestFile(filePath: string): string[] {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("-----").map((s) => s.trim());
    return fileParts;
}

export function verifyRegExp(
    regexToCheck: RegExp,
    expectedValue: string,
    expectedValueName: string,
    fileContent: string,
): void {
    expectedValue = !expectedValue ? "" : expectedValue;
    const regexResult = regexToCheck.exec(fileContent);
    const regexResultStr = !regexResult ? "" : regexResult[0];
    if (regexResultStr !== expectedValue) {
        throw new Error(`Incorrect ${expectedValueName}\n` +
            `${regexResultStr} !== ${expectedValue}`);
    }
}

export function verifyEmailText(
    valueToCheck: RegExpExecArray | null,
    expectedValue: string,
): [boolean, string | undefined, string] {
    if (!valueToCheck) { return [false, undefined, expectedValue]; }
    const vc = valueToCheck[1].trim().replace(/\r\n/g, "\n");
    const ev = expectedValue.trim().replace(/\r\n/g, "\n");
    return [vc === ev, vc, ev];
}

export function removeFile(fileName: string): void {
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    }
}

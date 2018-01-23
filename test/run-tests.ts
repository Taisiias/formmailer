import * as execa from "execa";
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as smtp from "smtp-server";
import * as stream from "stream";
import winston = require("winston");
import { createConfigObject } from "../src/config";
import { runHttpServers } from "../src/run";

const TESTS_FOLDER_PATH = "./test/test-cases";

function parseTestFile(filePath: string): string[] {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("-----").map((s) => s.trim());
    return fileParts;
}

function runTests(): void {
    let testPassed: boolean | Error;
    let isError = false;
    let result = Promise.resolve();
    fs.readdirSync(TESTS_FOLDER_PATH).forEach((file) => {
        result = result.then(async () => {
            winston.info(`Starting test: ${file}`);
            testPassed = await runTest(TESTS_FOLDER_PATH + "/" + file);
            if (testPassed === true) {
                winston.info(`Test result: OK`);
            } else {
                isError = true;
                winston.error(
                    `An error occurred: ${(testPassed as Error).stack}`);
            }
        });
    });
    result.then(() => {
        if (isError) {
            winston.error(`One or more tests didn't pass.`);
        } else {
            winston.info(`All tests passed.`);
        }
    }).catch((e: Error) => { winston.error(`An error occurred: ${e.message}`); });
}

function verifyRegExp(
    valueToCheck: RegExpExecArray | null,
    expectedValue: string,
): boolean {
    return valueToCheck !== null && valueToCheck[0] === expectedValue;
}

function verifyEmailText(
    valueToCheck: RegExpExecArray | null,
    expectedValue: string,
): [boolean, string | undefined, string] {
    if (!valueToCheck) { return [false, undefined, expectedValue]; }

    const vc = valueToCheck[1].trim().replace(/\r\n/g, "\n");
    const ev = expectedValue.trim().replace(/\r\n/g, "\n");

    return [vc === ev, vc, ev];
}

async function runTest(fileName: string): Promise<true | Error> {
    return new Promise((resolve) => {
        const [configString, curl, curlResult, from, to, subject, emailText] =
            parseTestFile(fileName);

        const cf = createConfigObject(configString);

        let httpServer: http.Server | undefined;
        let httpsServer: https.Server | undefined;
        let viewEmailHistoryHttpServer: http.Server | undefined;

        [httpServer, httpsServer, viewEmailHistoryHttpServer] = runHttpServers(cf);

        const HOST = "localhost";
        const PORT = 2500;

        const SMTPServer = smtp.SMTPServer;
        const smtpServer = new SMTPServer({
            authOptional: true,
            onConnect,
            onData,
        });

        function onConnect(
            _session: smtp.SMTPServerSession,
            callback: (err?: Error) => void,
        ): void {
            callback();
        }

        function onData(
            dataStream: stream.PassThrough,
            _session: smtp.SMTPServerSession,
            callback: (err?: Error) => void,
        ): void {
            let buf = "";
            dataStream.on("data", (s) => {
                buf += s;
            });
            dataStream.on("end", () => {
                fs.writeFileSync("./test/smtp-output.txt", buf);
                callback();
            });
        }

        smtpServer.listen(PORT, HOST, () => {
            winston.debug(`Run Tests: SMTP server started on ${HOST}:${PORT}`);
        });

        execa.shell(`${curl.split("\n").join(" ")} --show-error --silent`).then((result) => {
            if (result.stderr) {
                throw new Error(`Error in Curl: ${result.stderr}`);
            }
            if (!cf.disableRecaptcha && result.stdout.trim() !== curlResult.trim()) {
                throw new Error("Incorrect curl output.");
            }
            const regexFrom = /From: (.*)/;
            const regexTo = /To: (.*)/;
            const regexSubject = /Subject: (.*)/;

            const regexEmailText = new RegExp(
                "Content-Type: text/plain\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "([^]*)\r\n" +
                "----[-_a-zA-Z0-9]+\r\n" +
                "Content-Type: text/html",
            );

            const fileContent = fs.readFileSync("./test/smtp-output.txt").toString().trim();

            if (!verifyRegExp(regexFrom.exec(fileContent), from)) {
                throw new Error(`FROM - No Match - ${regexFrom.exec(fileContent)} !== ${from}`);
            }

            if (!verifyRegExp(regexTo.exec(fileContent), to)) {
                throw new Error(`TO - No Match - ${regexTo.exec(fileContent)} !== ${to}`);
            }

            if (!verifyRegExp(regexSubject.exec(fileContent), subject)) {
                throw new Error(
                    `SUBJECT - No Match - ${regexSubject.exec(fileContent)} !== ${subject}`);
            }
            const emailTextFromRegEx = regexEmailText.exec(fileContent);

            let emailTextVerified: boolean;
            let emailTextToCheck: string | undefined;
            let expectedEmailText: string;

            [emailTextVerified, emailTextToCheck, expectedEmailText] =
                verifyEmailText(emailTextFromRegEx, emailText);
            if (!emailTextVerified) {
                if (emailTextToCheck) {
                    throw new Error(
                        `\n***** EMAIL TEXT - No Match *****\n` +
                        `\n***** Resulted text: *****\n` +
                        `\n${emailTextToCheck}\n` +
                        `\n***** Expected text: *****\n` +
                        `\n${expectedEmailText}`);
                } else {
                    throw new Error("EMAIL TEXT - No email text");
                }
            }
        }).then(() => {
            closeServers(smtpServer, httpServer, httpsServer, viewEmailHistoryHttpServer);
            resolve(true);
        }).catch((err: Error) => {
            closeServers(smtpServer, httpServer, httpsServer, viewEmailHistoryHttpServer);
            resolve(err);
        });

    }) as Promise<true | Error>;
}

function closeServers(
    smtpServer: smtp.SMTPServer,
    httpServer: http.Server | undefined,
    httpsServer: https.Server | undefined,
    viewEmailHistoryHttpServer: http.Server | undefined,
): void {
    smtpServer.close(() => {
        winston.debug(`Closed SMTP server.`);
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

runTests();

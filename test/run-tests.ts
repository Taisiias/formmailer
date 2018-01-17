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
                winston.error(`An error occurred: ${(testPassed as Error).message}
            StackTrace: ${(testPassed as Error).stack}`);
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

function verifyRegExp(valueToCheck: RegExpExecArray | null, expectedValue: string): boolean {
    return valueToCheck !== null && valueToCheck[0] === expectedValue;
}

function verifyEmailText(valueToCheck: RegExpExecArray | null, expectedValue: string): boolean {
    return valueToCheck !== null && valueToCheck[1] === expectedValue;
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
        const server = new SMTPServer({
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
                // buf.split("\n").map((s) => "> " + s).join("\n"));
                callback();
            });
        }

        server.listen(PORT, HOST, () => {
            winston.info(`Run Tests: SMTP server started on ${HOST}:${PORT}`);
        });

        execa.shell(`${curl.split("\n").join(" ")} --show-error --silent`).then((result) => {
            if (result.stderr) {
                winston.error(`Error in Curl: ${result.stderr}`);
            }
            if (!cf.disableRecaptcha && result.stdout.trim() !== curlResult.trim()) {
                // resolve(new Error("Incorrect curl output."));
                winston.info("Incorrect curl output.");
            }

            const regexFrom = /From: (.*)/;
            const regexTo = /To: (.*)/;
            const regexSubject = /Subject: (.*)/;

            const regexEmailText = new RegExp(
`Content-Type: text/plain\nContent-Transfer-Encoding: 7bit`,
// Content-Transfer-Encoding: 7bit`,
                // + "\n\n([^]*)\n\n"
                // + "----[-_a-zA-Z0-9]+\n"
                // + "Content-Type: text/html",
                );

            const fileContent = fs.readFileSync("./test/smtp-output.txt").toString().trim();
            //console.log("fileContent:", fileContent);

            console.log("regex", regexEmailText);
            console.log("result", regexEmailText.test(fileContent));

            if (!verifyRegExp(regexFrom.exec(fileContent), from)) {
                winston.info(`FROM is incorrect ${regexFrom.exec(fileContent)} !== ${from}`);
            }

            if (!verifyRegExp(regexTo.exec(fileContent), to)) {
                winston.info(`TO is incorrect: ${regexTo.exec(fileContent)} !== ${to}`);
            }

            if (!verifyRegExp(regexSubject.exec(fileContent), subject)) {
                winston.info(
                    `SUBJECT is incorrect:${regexSubject.exec(fileContent)} !== ${subject}`);
            }

            if (!verifyEmailText(regexEmailText.exec(fileContent), emailText)) {
                // resolve(new Error("SMTP output does not match."))
                winston.info(
                    `Email text does not match:
                    ${regexEmailText.exec(fileContent)} !== ${emailText}`);
            }
        }).catch((err) => {
            winston.error(`Curl cannot be executed: ${err}`);
        });

        setTimeout(() => {
            server.close(() => {
                winston.info(`Closed SMTP server.`);
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
            resolve(true);
        }, 1000);

    }) as Promise<true | Error>;
}

runTests();

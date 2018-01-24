import * as execa from "execa";
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as smtp from "smtp-server";
import * as stream from "stream";
import winston = require("winston");
import { createConfigObject } from "../src/config";
import { runHttpServers } from "../src/run";
import { closeServers, parseTestFile, verifyEmailText, verifyRegExp } from "./run-tests-helpers";

const TESTS_FOLDER_PATH = "./test/test-cases";

function runTests(): void {
    const myCustomLevels = {
        levels: {
          testLog: "testLog",
        }};

    winston.configure({
        level: myCustomLevels.levels.testLog,
        transports: [new winston.transports.Console({
            colorize: true,
            name: "Console",
            prettyPrint: true,
            timestamp: true,
        })],
    });
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

async function runTest(fileName: string): Promise<true | Error> {
    return new Promise((resolve) => {
        const [configString, curl, curlResult, from, to, subject, emailText] =
            parseTestFile(fileName);

        const cf = createConfigObject(configString);
        fs.writeFileSync("./test/smtp-output.txt", "");

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
            // winston.info(`Curl Stdout: ${result.stdout.trim()}`);
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

            verifyRegExp(regexFrom, from, "FROM", fileContent);
            verifyRegExp(regexTo, to, "TO", fileContent);
            verifyRegExp(regexSubject, subject, "SUBJECT", fileContent);

            const emailTextFromRegEx = regexEmailText.exec(fileContent);

            let emailTextVerified: boolean;
            let emailTextToCheck: string | undefined;
            let expectedEmailText: string;

            [emailTextVerified, emailTextToCheck, expectedEmailText] =
                verifyEmailText(emailTextFromRegEx, emailText);
            if (!emailTextVerified && cf.disableRecaptcha) {
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

runTests();

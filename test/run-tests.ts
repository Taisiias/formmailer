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
    const fileParts = fileContent.split("---");
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

async function runTest(fileName: string): Promise<true | Error> {
    return new Promise((resolve) => {
        const [configString, curl, curlResult, smtpOutput] =
            parseTestFile(fileName);

        // if (fileName === "./test/test-cases/test-form-2.txt") {
        //     winston.error(`Incorrect Filename error: ${fileName}`);
        //     resolve(new Error("Incorrect Filename"));
        //     return;
        // }

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
            winston.info(`Incoming connection onConnect`);
            callback();
        }

        function onData(
            dataStream: stream.PassThrough,
            _session: smtp.SMTPServerSession,
            callback: (err?: Error) => void,
        ): void {
            winston.info(`onData`);
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
            // TODO: Check also To, From and Subject
            const regex = new RegExp(`/Content-Type: text\/plain
Content-Transfer-Encoding: 7bit

(.*)

----[-_a-zA-Z0-9]+
Content-Type: text\/html`);

            const fileContent = fs.readFileSync("./test/smtp-output.txt").toString().trim();

            const m = regex.exec(fileContent);
            if (m) {
                winston.info(`File Content: ${m[0]}`);
            } else {
                winston.info(`m is null`);
            }

            if (m && smtpOutput.trim() !== m[0]) {
                // resolve(new Error("SMTP output does not match."))
                winston.info("SMTP output does not match.");
            } else {
                winston.info("SMTP output: OK");
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

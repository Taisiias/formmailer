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
        const [configString] =
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

        winston.info("Before Run SMTP.");
        const HOST = "localhost";
        const PORT = 2500;

        const SMTPServer = smtp.SMTPServer;
        const server = new SMTPServer({
            authOptional: true,
            onData,
        });

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
                fs.writeFileSync("./test/email-text.txt",
                                 buf.split("\n").map((s) => "> " + s).join("\n"));
                callback();
            });
        }
        server.listen(PORT, HOST, () => {
            winston.info(`Run Tests: SMTP server started on port ${HOST}:${PORT}`);
        });

        setTimeout(() => {
            winston.info("Timeout set.");
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

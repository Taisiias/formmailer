"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const execa = require("execa");
const fs = require("fs");
const smtp = require("smtp-server");
const winston = require("winston");
const config_1 = require("../src/config");
const run_1 = require("../src/run");
const TESTS_FOLDER_PATH = "./test/test-cases";
function parseTestFile(filePath) {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("---");
    return fileParts;
}
function runTests() {
    let testPassed;
    let isError = false;
    let result = Promise.resolve();
    fs.readdirSync(TESTS_FOLDER_PATH).forEach((file) => {
        result = result.then(() => __awaiter(this, void 0, void 0, function* () {
            winston.info(`Starting test: ${file}`);
            testPassed = yield runTest(TESTS_FOLDER_PATH + "/" + file);
            if (testPassed === true) {
                winston.info(`Test result: OK`);
            }
            else {
                isError = true;
                winston.error(`An error occurred: ${testPassed.message}
            StackTrace: ${testPassed.stack}`);
            }
        }));
    });
    result.then(() => {
        if (isError) {
            winston.error(`One or more tests didn't pass.`);
        }
        else {
            winston.info(`All tests passed.`);
        }
    }).catch((e) => { winston.error(`An error occurred: ${e.message}`); });
}
function runTest(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const [configString, curl, curlResult, smtpOutput] = parseTestFile(fileName);
            // if (fileName === "./test/test-cases/test-form-2.txt") {
            //     winston.error(`Incorrect Filename error: ${fileName}`);
            //     resolve(new Error("Incorrect Filename"));
            //     return;
            // }
            const cf = config_1.createConfigObject(configString);
            let httpServer;
            let httpsServer;
            let viewEmailHistoryHttpServer;
            [httpServer, httpsServer, viewEmailHistoryHttpServer] = run_1.runHttpServers(cf);
            const HOST = "localhost";
            const PORT = 2500;
            const SMTPServer = smtp.SMTPServer;
            const server = new SMTPServer({
                authOptional: true,
                onConnect,
                onData,
            });
            function onConnect(_session, callback) {
                winston.info(`Incoming connection onConnect`);
                callback();
            }
            function onData(dataStream, _session, callback) {
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
                    resolve(new Error("Incorrect curl output."));
                }
                const fileContent = fs.readFileSync("./test/smtp-output.txt").toString();
                // winston.info(`File Content: ${fileContent}`);
                if (smtpOutput.trim() !== fileContent.trim()) {
                    // resolve(new Error("SMTP output does not match."))
                    winston.info("SMTP output does not match.");
                }
                else {
                    winston.info("SMTP output: OK");
                }
            }).catch((err) => {
                winston.error(`Curl cannot be executed: ${err}`);
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
        });
    });
}
runTests();

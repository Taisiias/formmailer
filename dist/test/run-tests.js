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
const fs = require("fs");
const log4js_1 = require("log4js");
const smtp = require("smtp-server");
const config_1 = require("../src/config");
const run_1 = require("../src/run");
const run_tests_helpers_1 = require("./run-tests-helpers");
const TESTS_FOLDER_PATH = "./test/test-cases";
const DEFAULT_LOGGING_LEVEL = "info";
function runTests() {
    log4js_1.configure({
        appenders: {
            test: { type: "stdout" },
        },
        categories: {
            default: { appenders: ["test"], level: DEFAULT_LOGGING_LEVEL },
            formMailer: { appenders: ["test"], level: "off" },
        },
    });
    const logger = log4js_1.getLogger("test");
    let testPassed;
    let isError = false;
    let result = Promise.resolve();
    fs.readdirSync(TESTS_FOLDER_PATH).forEach((file) => {
        result = result.then(() => __awaiter(this, void 0, void 0, function* () {
            logger.info(`Starting test: ${file}`);
            testPassed = yield runTest(TESTS_FOLDER_PATH + "/" + file);
            if (testPassed === true) {
                logger.info(`TEST RESULT: OK`);
            }
            else {
                isError = true;
                logger.error(`TEST FAIL: ${testPassed.stack}`);
            }
        }));
    });
    result.then(() => {
        if (isError) {
            logger.error(`One or more tests didn't pass.`);
        }
        else {
            logger.info(`All tests passed.`);
        }
    }).catch((e) => { logger.error(`TEST FAIL: ${e.message}`); });
}
function runTest(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const [configString, curl, curlResult, from, to, subject, emailText] = run_tests_helpers_1.parseTestFile(fileName);
            const cf = config_1.createConfigObject(configString);
            fs.writeFileSync("./test/smtp-output.txt", "");
            let httpServer;
            let httpsServer;
            let viewEmailHistoryHttpServer;
            [httpServer, httpsServer, viewEmailHistoryHttpServer] = run_1.runHttpServers(cf);
            const HOST = "localhost";
            const PORT = 2500;
            const SMTPServer = smtp.SMTPServer;
            const smtpServer = new SMTPServer({
                authOptional: true,
                onConnect,
                onData,
            });
            function onConnect(_session, callback) {
                callback();
            }
            function onData(dataStream, _session, callback) {
                let buf = "";
                dataStream.on("data", (s) => {
                    buf += s;
                });
                dataStream.on("end", () => {
                    fs.writeFileSync("./test/smtp-output.txt", buf);
                    callback();
                });
            }
            smtpServer.listen(PORT, HOST, () => undefined);
            run_tests_helpers_1.shell(`${curl}`).then((result) => {
                if (result.stderr) {
                    throw new Error(`Error while executing curl: ${result.stderr}`);
                }
                if (result.stdout.trim() !== curlResult.trim()) {
                    throw new Error(`Incorrect curl output:\n${result.stdout.trim()}`);
                }
                const regexFrom = /From: (.*)/;
                const regexTo = /To: (.*)/;
                const regexSubject = /Subject: (.*)/;
                const regexEmailText = new RegExp("Content-Type: text/plain.*\r\n" +
                    "Content-Transfer-Encoding:.*\r\n" +
                    "([^]*)\r\n" +
                    "----[-_a-zA-Z0-9]+\r\n" +
                    "Content-Type: text/html");
                const fileContent = fs.readFileSync("./test/smtp-output.txt").toString().trim();
                run_tests_helpers_1.verifyRegExp(regexFrom, from, "FROM", fileContent);
                run_tests_helpers_1.verifyRegExp(regexTo, to, "TO", fileContent);
                run_tests_helpers_1.verifyRegExp(regexSubject, subject, "SUBJECT", fileContent);
                const emailTextFromRegEx = regexEmailText.exec(fileContent);
                let emailTextVerified;
                let emailTextToCheck;
                let expectedEmailText;
                [emailTextVerified, emailTextToCheck, expectedEmailText] =
                    run_tests_helpers_1.verifyEmailText(emailTextFromRegEx, emailText);
                if (!emailTextVerified && !cf.enableRecaptcha) {
                    if (emailTextToCheck) {
                        throw new Error(`\n***** EMAIL TEXT - No Match *****\n` +
                            `\n***** Resulted text: *****\n` +
                            `\n${emailTextToCheck}\n` +
                            `\n***** Expected text: *****\n` +
                            `\n${expectedEmailText}`);
                    }
                    else {
                        throw new Error("EMAIL TEXT - No email text");
                    }
                }
            }).then(() => {
                run_tests_helpers_1.closeServers(smtpServer, httpServer, httpsServer, viewEmailHistoryHttpServer);
                run_tests_helpers_1.removeFile("./test/smtp-output.txt");
                resolve(true);
            }).catch((err) => {
                run_tests_helpers_1.closeServers(smtpServer, httpServer, httpsServer, viewEmailHistoryHttpServer);
                resolve(err);
            });
        });
    });
}
runTests();

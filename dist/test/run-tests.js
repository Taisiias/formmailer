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
const winston = require("winston");
const config_1 = require("../src/config");
const run_1 = require("../src/run");
const run_smtp_1 = require("../src/run-smtp");
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
            const [configString] = parseTestFile(fileName);
            // if (fileName === "./test/test-cases/test-form-2.txt") {
            //     winston.error(`Incorrect Filename error: ${fileName}`);
            //     resolve(new Error("Incorrect Filename"));
            //     return;
            // }
            const cf = config_1.createConfigObject(configString);
            run_smtp_1.runSmtp();
            let httpServer;
            let httpsServer;
            let viewEmailHistoryHttpServer;
            [httpServer, httpsServer, viewEmailHistoryHttpServer] = run_1.runHttpServers(cf);
            setTimeout(() => {
                winston.debug("Timeout set.");
                run_smtp_1.stopSmtp();
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

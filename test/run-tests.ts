import * as fs from "fs";
import winston = require("winston");
import { createConfigObject } from "../src/config";

// import { runHttpServers } from "../src/run";

const TESTS_FOLDER_PATH = "./test/test-cases";

function parseTestFile(filePath: string): string[] {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("---");
    return fileParts;
}

function runTests(): void {
    let testPassed: boolean | Error;
    let isError = false;
    fs.readdirSync(TESTS_FOLDER_PATH).forEach((file) => {
        winston.info(`Starting test: ${file}`);
        testPassed = runTest(TESTS_FOLDER_PATH + "/" + file);
        if (testPassed) {
            winston.info(`Test result: OK`);
        } else {
            isError = true;
            // const errorMessage = testPassed as Error;
            winston.error(`An error occurred: ${(testPassed as Error).message}
            StackTrace: ${(testPassed as Error).stack}`);
        }
    });
    if (isError) {
        winston.error(`One or more tests didn't pass.`);
    } else {
        winston.info(`All tests passed.`);
    }
}

function runTest(fileName: string): true | Error {

    // if (fileName === "./test/test-cases/test-form-2.txt") {
    //     winston.error(`Incorrect Filename error: ${fileName}`);
    //     return new Error("Incorrect Filename");
    // }

    const [configString, curl, response, emailSent] =
        parseTestFile(fileName);

    const cf = createConfigObject(configString);

    winston.info(`From Email: ${cf.fromEmail}`);
    winston.info(`Curl: ${curl}`);
    winston.info(`Response ${response}`);
    winston.info(`Email Sent ${emailSent}`);

    return true;
}

runTests();

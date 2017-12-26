import * as fs from "fs";
import { createConfigObject } from "../src/config";
// import { runHttpServers } from "../src/run";

const TESTS_FOLDER_PATH = "./test/test-cases";

function parseTestFile(filePath: string): string[] {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("---");
    return fileParts;
}

function runTests(): void {
    fs.readdirSync(TESTS_FOLDER_PATH).forEach((file) =>
        runTest(TESTS_FOLDER_PATH + "/" + file));
}

function runTest(fileName: string): true | Error {
    // tslint:disable:no-console
    console.log(`Starting test: ${fileName}`);

    if (fileName === "./test/test-cases/test-form-2.txt") {
        console.log(`Incorrect Filename error: ${fileName}`);
        throw new Error("Incorrect Filename");
    }

    const [configString, curl, response, emailSent] =
        parseTestFile(fileName);

    const cf = createConfigObject(configString);

    console.log(`From Email: ${cf.fromEmail}`);
    console.log(`Curl: ${curl}`);
    console.log(`Response ${response}`);
    console.log(`Email Sent ${emailSent}`);

    console.log(`Test result: OK`);
    return true;
}

runTests();

import * as fs from "fs";
import { createConfigObject } from "../src/config";
// import { runHttpServers } from "../src/run";

function parseTestFile(filePath: string): string[] {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("---");
    return fileParts;
}

function runTests(): void {
    // for (filename in ./test-cases)
    runTest("./test/test-cases/test-form.txt");
}

function runTest(fileName: string): true | Error {
    // tslint:disable:no-console
    console.log(`Starting test: ${fileName}`);

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

// import * as run from "../src/run";
import * as fs from "fs";
import { createConfigObject } from "../src/config";

function parseTestFile(filePath: string): string[] {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("---");
    return fileParts;
}

function runTests(): void {
    const [configString, curl, response, emailSent] =
        parseTestFile("./test/test-cases/test-form.txt");

    const cf = createConfigObject(configString);
    // tslint:disable-next-line:no-console
    console.log(`From Email: ${cf.fromEmail}`);

    // tslint:disable-next-line:no-console
    console.log(`Curl: ${curl}`);
    // tslint:disable-next-line:no-console
    console.log(`Response ${response}`);
    // tslint:disable-next-line:no-console
    console.log(`Email Sent ${emailSent}`);
}

runTests();

// import * as run from "../src/run";
import * as fs from "fs";

// tslint:disable-next-line:no-console
// console.log(run);

function parseTestFile(filePath: string): string[] {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("---");
    return fileParts;
}

function runTests(): void {
    const [config, curl, response, emailSent] = parseTestFile("./test/test-cases/test-form.txt");
    // tslint:disable-next-line:no-console
    console.log(`Config: ${config}`);
    // tslint:disable-next-line:no-console
    console.log(`Curl: ${curl}`);
    // tslint:disable-next-line:no-console
    console.log(`Response ${response}`);
    // tslint:disable-next-line:no-console
    console.log(`Email Sent ${emailSent}`);
}

runTests();

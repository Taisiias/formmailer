"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import * as run from "../src/run";
const fs = require("fs");
const config_1 = require("../src/config");
function parseTestFile(filePath) {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("---");
    return fileParts;
}
function runTests() {
    const [configString, curl, response, emailSent] = parseTestFile("./test/test-cases/test-form.txt");
    const cf = config_1.createConfigObject(configString);
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

// import * as run from "../src/run";
import * as fs from "fs";

// tslint:disable-next-line:no-console
// console.log(run);

function parseTestFile(filePath: string): string {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("---");
    return fileParts[0].trim();
}

function runTests(): void {
    const firstElement = parseTestFile("./test/test-cases/test-form.txt");
    // tslint:disable-next-line:no-console
    console.log(firstElement);
}

runTests();

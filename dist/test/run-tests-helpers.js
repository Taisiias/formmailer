"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const execa = require("execa");
const fs = require("fs");
function closeServers(smtpServer, httpServer, httpsServer, viewEmailHistoryHttpServer) {
    smtpServer.close(() => {
        return;
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
}
exports.closeServers = closeServers;
function parseTestFile(filePath) {
    const fileContent = fs.readFileSync(filePath).toString();
    const fileParts = fileContent.split("-----").map((s) => s.trim());
    return fileParts;
}
exports.parseTestFile = parseTestFile;
function verifyRegExp(regexToCheck, expectedValue, expectedValueName, fileContent) {
    expectedValue = !expectedValue ? "" : expectedValue;
    const regexResult = regexToCheck.exec(fileContent);
    const regexResultStr = !regexResult ? "" : regexResult[0];
    if (regexResultStr !== expectedValue) {
        throw new Error(`Incorrect ${expectedValueName}\n` +
            `${regexResultStr} !== ${expectedValue}`);
    }
}
exports.verifyRegExp = verifyRegExp;
function verifyEmailText(valueToCheck, expectedValue) {
    if (!valueToCheck) {
        return [false, undefined, expectedValue];
    }
    const vc = valueToCheck[1].trim().replace(/\r\n/g, "\n");
    const ev = expectedValue.trim().replace(/\r\n/g, "\n");
    return [vc === ev, vc, ev];
}
exports.verifyEmailText = verifyEmailText;
function removeFile(fileName) {
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    }
}
exports.removeFile = removeFile;
function shell(command) {
    return execa.shell(command).then((result) => {
        result.stdout = result.stdout.trim().replace(/\r/g, "");
        return result;
    });
}
exports.shell = shell;

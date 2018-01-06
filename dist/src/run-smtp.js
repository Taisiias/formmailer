"use strict";
/* tslint:disable:no-console */
Object.defineProperty(exports, "__esModule", { value: true });
const smtp = require("smtp-server");
const HOST = "localhost";
const PORT = 2500;
const SMTPServer = smtp.SMTPServer;
const server = new SMTPServer({
    authOptional: true,
    onClose,
    onConnect,
    onData,
});
function onConnect(session, callback) {
    console.log(`Incoming connection from ${session.remoteAddress}`);
    callback();
}
function onClose(session) {
    console.log(`Closing connection to ${session.remoteAddress}`);
}
function onData(dataStream, session, callback) {
    console.log(`Incoming message from ${session.remoteAddress}:`);
    let buf = "";
    dataStream.on("data", (s) => {
        buf += s;
    });
    dataStream.on("end", () => {
        console.log(buf.split("\n").map((s) => "> " + s).join("\n"));
        callback();
    });
}
server.on("error", (err) => {
    console.log("Error %s", err.message);
});
server.listen(PORT, HOST, () => {
    console.log(`SMTP server started on port ${HOST}:${PORT}`);
});

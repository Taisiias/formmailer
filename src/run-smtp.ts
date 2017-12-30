/* tslint:disable:no-console */

import * as smtp from "smtp-server";
import * as stream from "stream";

const HOST = "localhost";
const PORT = 2500;

const SMTPServer = smtp.SMTPServer;
const server = new SMTPServer({
    authOptional: true,
    onClose,
    onConnect,
    onData,
});

function onConnect(session: smtp.SMTPServerSession, callback: (err?: Error) => void): void {
    console.log(`Incoming connection from ${session.remoteAddress}`);
    callback();
}

function onClose(session: smtp.SMTPServerSession): void {
    console.log(`Closing connection to ${session.remoteAddress}`);
}

function onData(
    dataStream: stream.PassThrough,
    session: smtp.SMTPServerSession,
    callback: (err?: Error) => void,
): void {
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

server.on("error", (err: Error) => {
    console.log("Error %s", err.message);
});

export function runSmtp(): void {
    server.listen(PORT, HOST, () => {
        console.log(`SMTP server started on port ${HOST}:${PORT}`);
    });
}

export function stopSmtp(): void {
    server.close(() => {
        console.log(`SMTP server stopped.`);
    });
}

runSmtp();

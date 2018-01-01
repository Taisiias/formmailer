/* tslint:disable:no-console */

import * as smtp from "smtp-server";
import * as stream from "stream";

export const HOST = "localhost";
export const PORT = 2500;

const SMTPServer = smtp.SMTPServer;
export const server = new SMTPServer({
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

server.listen(PORT, HOST, () => {
    console.log(`SMTP server started on port ${HOST}:${PORT}`);
});

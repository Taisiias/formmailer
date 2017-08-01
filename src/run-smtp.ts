/* tslint:disable:no-console */

import * as smtp from "smtp-server";
import * as stream from "stream";

const HOST = "localhost";
const PORT = 2500;

const SMTPServer = smtp.SMTPServer;
const server = new SMTPServer({
    authOptional: true,
    onConnect,
    onClose,
    onData,
});

function onConnect(session: smtp.Session, callback: (err?: Error) => undefined): void {
    console.log(`Incoming connection from ${session.remoteAddress}`);
    callback();
}

function onClose(session: smtp.Session): void {
    console.log(`Closing connection to ${session.remoteAddress}`);
}

function onData(
    stream: stream.PassThrough,
    session: smtp.Session,
    callback: (err?: Error) => {},
): void {
    console.log(`Incoming message from ${session.remoteAddress}:`);
    let buf = "";
    stream.on("data", (s) => {
        buf += s;
    });
    stream.on("end", () => {
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

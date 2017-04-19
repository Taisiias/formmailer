import * as emailvalidator from "email-validator";
import * as fs from "fs";
import * as http from "http";
import * as nodemailer from "nodemailer";
import * as qs from "querystring";
import * as url from "url";
import * as winston from "winston";

interface Config {
    smtpPort: number;
    smtpHost: string;
    recipientEmails: string | string[];
    fromEmail: string;
    subject: string;
    httpListenIP: string;
    httpListenPort: number;
}

let config: Config;

function validateFromEmail(fromEmail?: string): string {
    winston.info("Validating fromEmail");
    if (fromEmail === undefined || fromEmail === "") {
        throw new Error("Please add sender's email");
    }
    return fromEmail;
}

function validateEmailRecipients(recipientEmailsStr?: string): string[] {
    winston.info("Validating recipientEmails");
    if (recipientEmailsStr === undefined) {
        throw new Error("Undefined recipient emails.");
    }
    const recipientEmailsArray = recipientEmailsStr.split(";");
    for (let i = recipientEmailsArray.length - 1; i >= 0; i--) {
        if (recipientEmailsArray[i].trim() === "") {
            recipientEmailsArray.splice(i, 1);
            continue;
        }
        if (!emailvalidator.validate(recipientEmailsArray[i].trim())) {
            throw new Error("Incorrect email format : " +
                recipientEmailsArray[i]);
        }
        recipientEmailsArray[i] = recipientEmailsArray[i].trim();
    }
    if (recipientEmailsArray.length === 0) {
        throw new Error("Recipient emails list is empty.");
    }
    return recipientEmailsArray;
}

function validateSmtpHost(smtpHost?: string): string {
    winston.info("Validating smtpHost.");
    if (smtpHost === undefined || smtpHost === "") {
        smtpHost = "localhost";
    }
    return smtpHost;
}

function validateSmtpPort(smtpPort?: number): number {
    winston.info("Validating smtpPort.");
    if (smtpPort === undefined) {
        smtpPort = 25;
    }
    return smtpPort;
}

function validateHttpListenPort(httpListenPort?: number): number {
    winston.info("Validating HTTP Listen Port.");
    if (httpListenPort === undefined) {
        httpListenPort = 80;
    }
    return httpListenPort;
}

function validateHttpListenIP(httpListenIP?: string): string {
    winston.info("Validating HTTP Listen IP.");
    if (httpListenIP === undefined) {
        httpListenIP = "0.0.0.0";
    }
    return httpListenIP;
}

function validateSubject(subject?: string): string {
    winston.info("Validating subject.");
    if (subject === undefined) {
        subject = "Default Subject";
    }
    return subject;
}

function ParseConfig(cf: Partial<Config>): Config {
    return {
        fromEmail: validateFromEmail(cf.fromEmail),
        httpListenIP: validateHttpListenIP(cf.httpListenIP),
        httpListenPort: validateHttpListenPort(cf.httpListenPort),
        recipientEmails: validateEmailRecipients(cf.recipientEmails as string),
        smtpHost: validateSmtpHost(cf.smtpHost),
        smtpPort: validateSmtpPort(cf.smtpPort),
        subject: validateSubject(cf.subject),
    };
}

function ReadConfig(): void {
    winston.info("Reading config.");
    if (!fs.existsSync("./config.json")) {
        winston.error("Config file was not found.");
        return;
    }
    let fileContent = "";
    try {
        fileContent = fs.readFileSync("./config.json").toString();
    } catch (e) {
        winston.error("Config cannot be read.");
        return;
    }
    let json;
    try {
        json = JSON.parse(fileContent);
    } catch (e) {
        winston.error("Config file cannot be parsed.");
        return;
    }
    winston.log("info", json);
    try {
        config = ParseConfig(json);
    } catch (e) {
        winston.error(e.message);
        return;
    }
}

const server = http.createServer((req, res) => {
    winston.info("Creating server...");
    if (req.method !== "POST") { return; }
    const urlPathName = url.parse(req.url as string, true);
    res.writeHead(200, { "Content-Type": "application/json" });
    if (urlPathName.pathname === "/receive") {
        let bodyStr = "";
        req.on("data", (chunk) => {
            bodyStr += chunk.toString();
            if (bodyStr.length > 1e6) {
                // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                req.connection.destroy();
            }
        });
        req.on("end", () => {
            const post = qs.parse(bodyStr);
            let userMessage = "";
            for (const name in post) {
                if (name !== "_redirect") {
                    const str = name + ": " + post[name] + "\n";
                    userMessage += str;
                 }
            }
            winston.info("User message: " + userMessage);
            sendEmail(post.user_name, post.user_mail, userMessage,
                      () => {
                            winston.info("Redirecting to " + post._redirect);
                            res.writeHead(301, { Location: post._redirect });
                            res.end();
                        });
        });
    } else {
        res.end("asdf");
    }
});

function sendEmail(
    userName: string, userMail: string, emailText: string,
    callbackFromSendMail: () => void,
    ): void {
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
    });
    const emailMessage = {
        from: userName + " " + userMail,
        subject: config.subject,
        text: emailText,
        to: config.recipientEmails,
    };
    transporter.sendMail(emailMessage,
                         (err) => {
            if (err) { winston.error(err.message); }
            callbackFromSendMail();
            winston.info("Message sent.");
        });
}

function run(): void {
    ReadConfig();
    server.listen(config.httpListenIP);
}

run();

// import * as commandpost from "commandpost";

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
}

let config: Config;

function validateFromEmail(fromEmail?: string): string {
    // Validating fromEmail
    if (fromEmail === undefined || fromEmail === "") {
        throw new Error("Please add sender's email");
    }
    return fromEmail;
}

function validateEmailRecipients(recipientEmailsStr?: string): string[] {
    // Validating recipientEmails
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
        throw new Error("Recipient emails list is empty");
    }
    return recipientEmailsArray;
}

function validateSmtpHost(smtpHost?: string): string {
    // Validating smtpHost
    if (smtpHost === undefined || smtpHost === "") {
        smtpHost = "localhost";
    }
    return smtpHost;
}

function validateSmtpPort(smtpPort?: number): number {
    // Validating smtpPort
    if (smtpPort === undefined) {
        smtpPort = 25;
    }
    return smtpPort;
}

function ParseConfig(cf: Partial<Config>): Config {
    return {
        fromEmail: validateFromEmail(cf.fromEmail),
        recipientEmails: validateEmailRecipients(cf.recipientEmails as string),
        smtpHost: validateSmtpHost(cf.smtpHost),
        smtpPort: validateSmtpPort(cf.smtpPort),
    };
}

function ReadConfig(): void {
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

    winston.info("SMTP host is " + config.smtpHost);
    winston.info("SMTP port is " + config.smtpPort);
}

const server = http.createServer((req, res) => {
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
            sendEmail(post.user_name,
                      post.user_mail,
                      post.user_message,
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

function sendEmail(userName: string,
                   userMail: string,
                   emailText: string,
                   callbackFromSendMail: () => void): void {
    ReadConfig();
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
    });

    const emailMessage = {
        from: userName + " " + userMail,
        subject: "Test formmailer",
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

server.listen(3000);

// const root = commandpost
//     .create<{ spice: string[]; cheese: string[]; config: string[]; }, { food: string[]; }>("dinner <food...>")
//     .version("1.0.0", "-v, --version")
//     .description("today's dinner!")
//     .option("-s, --config [config.json]", "What spice do you want? Read from config. Default: pepper")
//     .option("-c, --cheese <name>", "What cheese do you want? default: mozarella")
//     .action((opts, args) => {
//         winston.log("info",
//             `Your dinner is ${args.food[0]} with ${opts.config[0] || "pepper"} and ${opts.cheese[0] || "mozarella"}!
//             Lunch is ${args.food[1]}.`);
//     });
// commandpost
//     .exec(root, process.argv)
//     .catch((err) => {
//         if (err instanceof Error) {
//             console.error(err.stack);
//         } else {
//             console.error(err);
//         }
//         process.exit(1);
//     });

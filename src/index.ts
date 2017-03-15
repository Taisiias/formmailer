// import * as http from "http";

// import * as fs from "fs";

// import * as url from "url";

// import * as qs from "querystring";

// import * as emailjs from "emailjs";

// const server = http.createServer((req, resp) => {

// });

import * as commandpost from "commandpost";
import * as emailvalidator from "email-validator";
import * as fs from "fs";
import * as winston from "winston";

interface Config {
    smtpPort: number;
    smtpHost: string;
    recipientEmails: string | string[];
    fromEmail: string;
}

function parseConfig(cf: Config): Config {
    // Validating fromEmail
    if (cf.fromEmail === undefined || cf.fromEmail === "") {
        throw new Error ("Please add sender email"); }
    // Validating recipientEmails
    if (cf.recipientEmails === undefined) {
        throw new Error("Recipient emails is undefined."); }
    const buf = cf.recipientEmails as string;
    cf.recipientEmails = buf.split(";");
    for (let i =  cf.recipientEmails.length - 1; i >= 0; i--) {
        if (cf.recipientEmails[i].trim() === "") {
            cf.recipientEmails.splice(i, 1);
            continue;
        }
        if (!emailvalidator.validate(cf.recipientEmails[i].trim())) {
            throw new Error("Incorrect email format : " +
                cf.recipientEmails[i]);
        }
        cf.recipientEmails[i] = cf.recipientEmails[i].trim();
    }
    if (cf.recipientEmails.length === 0) {
        throw new Error ("Recipient emails list is empty"); }
    // Validating smtpHost
    if (cf.smtpHost === undefined || cf.smtpHost === "") {
        cf.smtpHost = "localhost"; }
    // Validating smtpPort
    if (cf.smtpPort === undefined) {
        cf.smtpPort = 25; }
    return cf;
}

const json = fs.readFileSync("./config.json");
winston.log("info", JSON.parse(json.toString()));
const config: Config = parseConfig(JSON.parse(json.toString()) as Config);

winston.log("info", "SMTP host is " + config.smtpHost);
winston.log("info", "number of recipientEmails is " +
    config.recipientEmails.length);

const root = commandpost
    .create<{ spice: string[]; cheese: string[]; config: string[]; }, { food: string[]; }>("dinner <food...>")
    .version("1.0.0", "-v, --version")
    .description("today's dinner!")
    .option("-s, --config [config.json]", "What spice do you want? Read from config. Default: pepper")
    .option("-c, --cheese <name>", "What cheese do you want? default: mozarella")
    .action((opts, args) => {
        winston.log( "info",
                     `Your dinner is ${args.food[0]} with ${opts.config[0] || "pepper"} and ${opts.cheese[0] || "mozarella"}!
            Lunch is ${args.food[1]}.`);
    });

commandpost
    .exec(root, process.argv)
    .catch((err) => {
        if (err instanceof Error) {
            console.error(err.stack);
        } else {
            console.error(err);
        }
        process.exit(1);
    });

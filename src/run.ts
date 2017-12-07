import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import winston = require("winston");
import * as yargs from "yargs";
import { readConfig } from "./config";
import { createDatabaseAndTables } from "./database";
import { constructConnectionHandler, viewHistoryHandler } from "./handler";
import { StaticFileServer } from "./static-file-server";

const DEFAULT_CONFIG_PATH = "./config.json";
const STARTUP_LOG_LEVEL = "debug";

function run(): void {
    winston.configure({
        level: STARTUP_LOG_LEVEL,
        transports: [new winston.transports.Console({
            colorize: true,
            name: "Console",
            prettyPrint: true,
            timestamp: true,
        })],
    });

    const args = yargs.usage("FormMailer server. Usage: $0 [-c <config file>]")
        .options("config", {
            alias: "c",
            default: DEFAULT_CONFIG_PATH,
            describe: "Read setting from specified config file path",
            type: "string",
        })
        .locale("en")
        .version()
        .help("help")
        .epilog("Support: https://github.com/Taisiias/formmailer")
        .strict()
        .argv;
    const config = readConfig(args.config as string);

    winston.level = config.logLevel;

    const staticFileServer = new StaticFileServer(config.assetsFolder);
    createDatabaseAndTables(config.databaseFileName);

    if (config.enableHttp) {
        const httpServer = http.createServer(constructConnectionHandler(config, staticFileServer));
        httpServer.listen(config.httpListenPort, config.httpListenIP, () => {
            winston.info(
                `HTTP server started (listening ${config.httpListenIP}:${config.httpListenPort})`);
        });
    }

    if (config.enableHttps && config.httpsPrivateKeyPath && config.httpsCertificatePath) {
        const options = {
            cert: fs.readFileSync(config.httpsCertificatePath, "utf8"),
            key: fs.readFileSync(config.httpsPrivateKeyPath, "utf8"),
        };
        const httpsServer = https.createServer(
            options, constructConnectionHandler(config, staticFileServer));
        httpsServer.listen(config.httpsListenPort, config.httpsListenIP, () => {
            winston.info(
                `HTTPS server started ` +
                `(listening ${config.httpsListenIP}:${config.httpsListenPort})`);
        });
    }
    if (config.enableWebInterface) {
        const viewHistoryHttpServer = http.createServer(viewHistoryHandler(config));
        viewHistoryHttpServer.listen(config.webInterfacePort, config.webInterfaceIP, () => {
            winston.info(
                `Web Interface server started ` +
                `(listening ${config.httpListenIP}:${config.webInterfacePort})`);
        });
    }
}

export function runAndReport(): void {
    try {
        run();
    } catch (e) {
        winston.error((e as Error).message as string);
        return process.exit(1);
    }
}

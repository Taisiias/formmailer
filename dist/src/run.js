"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const http = require("http");
const https = require("https");
const winston = require("winston");
const yargs = require("yargs");
const config_1 = require("./config");
const database_1 = require("./database");
const handler_1 = require("./handler");
const static_file_server_1 = require("./static-file-server");
const DEFAULT_CONFIG_PATH = "./config.json";
const STARTUP_LOG_LEVEL = "debug";
function run() {
    winston.configure({
        level: STARTUP_LOG_LEVEL,
        transports: [new winston.transports.Console({
                name: "Console",
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
    const config = config_1.readConfig(args.config);
    winston.level = config.logLevel;
    const staticFileServer = new static_file_server_1.StaticFileServer(config.assetsFolder);
    database_1.createDatabaseAndTables(config.databaseFileName);
    if (config.enableHttp) {
        const httpServer = http.createServer(handler_1.constructConnectionHandler(config, staticFileServer));
        httpServer.listen(config.httpListenPort, config.httpListenIP, () => {
            winston.info(`HTTP server started (listening ${config.httpListenIP}:${config.httpListenPort})`);
        });
    }
    if (config.enableHttps && config.httpsPrivateKeyPath && config.httpsCertificatePath) {
        const options = {
            cert: fs.readFileSync(config.httpsCertificatePath, "utf8"),
            key: fs.readFileSync(config.httpsPrivateKeyPath, "utf8"),
        };
        const httpsServer = https.createServer(options, handler_1.constructConnectionHandler(config, staticFileServer));
        httpsServer.listen(config.httpsListenPort, config.httpsListenIP, () => {
            winston.info(`HTTPS server started ` +
                `(listening ${config.httpsListenIP}:${config.httpsListenPort})`);
        });
    }
    const viewHistoryHttpServer = http.createServer(handler_1.viewHistoryHandler(config));
    viewHistoryHttpServer.listen(config.webInterfacePort, config.webInterfaceIP, () => {
        winston.info(`HTTP server started (listening ${config.httpListenIP}:${config.webInterfacePort})`);
    });
}
function runAndReport() {
    try {
        run();
    }
    catch (e) {
        winston.error(e.message);
        return process.exit(1);
    }
}
exports.runAndReport = runAndReport;

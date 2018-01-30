"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const http = require("http");
const https = require("https");
const log4js_1 = require("log4js");
const yargs = require("yargs");
const config_1 = require("./config");
const database_1 = require("./database");
const handler_1 = require("./handler");
const static_file_server_1 = require("./static-file-server");
const DEFAULT_CONFIG_PATH = "./config.json";
const STARTUP_LOG_LEVEL = "debug";
function run() {
    const logger = log4js_1.getLogger("formMailer");
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
    logger.level = config.logLevel;
    runHttpServers(config);
}
function runHttpServers(config) {
    const logger = log4js_1.getLogger("formMailer");
    const staticFileServer = new static_file_server_1.StaticFileServer(config.assetsFolder);
    database_1.createDatabaseAndTables(config.databaseFileName).catch((err) => {
        logger.warn(`Error while creating database tables: ${err}`);
    });
    let httpServer;
    let httpsServer;
    let viewHistoryHttpServer;
    if (config.enableHttp) {
        httpServer =
            http.createServer(handler_1.constructConnectionHandler(config, staticFileServer));
        httpServer.listen(config.httpListenPort, config.httpListenIP, () => {
            logger.info(`HTTP server started (listening ${config.httpListenIP}: ${config.httpListenPort})`);
        });
    }
    if (config.enableHttps && config.httpsPrivateKeyPath && config.httpsCertificatePath) {
        const options = {
            cert: fs.readFileSync(config.httpsCertificatePath, "utf8"),
            key: fs.readFileSync(config.httpsPrivateKeyPath, "utf8"),
        };
        httpsServer = https.createServer(options, handler_1.constructConnectionHandler(config, staticFileServer));
        httpsServer.listen(config.httpsListenPort, config.httpsListenIP, () => {
            logger.info(`HTTPS server started ` +
                `(listening ${config.httpsListenIP}:${config.httpsListenPort})`);
        });
    }
    if (config.enableWebInterface) {
        viewHistoryHttpServer = http.createServer(handler_1.viewHistoryHandler(config));
        viewHistoryHttpServer.listen(config.webInterfacePort, config.webInterfaceIP, () => {
            logger.info(`Web Interface server started ` +
                `(listening ${config.httpListenIP}:${config.webInterfacePort})`);
        });
    }
    return [httpServer, httpsServer, viewHistoryHttpServer];
}
exports.runHttpServers = runHttpServers;
function runAndReport() {
    log4js_1.configure({
        appenders: { formMailer: { type: "stdout" } },
        categories: { default: { appenders: ["formMailer"], level: STARTUP_LOG_LEVEL } },
    });
    const logger = log4js_1.getLogger("formMailer");
    try {
        run();
    }
    catch (e) {
        logger.error(e.message);
        return process.exit(1);
    }
}
exports.runAndReport = runAndReport;

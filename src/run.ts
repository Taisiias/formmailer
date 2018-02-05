import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import { configure, getLogger } from "log4js";
import * as yargs from "yargs";
import { Config, readConfig } from "./config";
import { createDatabaseAndTables } from "./database";
import { constructConnectionHandler, viewHistoryHandler } from "./handler";
import { StaticFileServer } from "./static-file-server";

const DEFAULT_CONFIG_PATH = "./config.json";
const STARTUP_LOG_LEVEL = "debug";

function run(): void {

    const logger = getLogger("formMailer");

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

    logger.level = config.logLevel;

    runHttpServers(config);
}

export function runHttpServers(
    config: Config,
): [http.Server | undefined, https.Server | undefined, http.Server | undefined] {
    const logger = getLogger("formMailer");
    const staticFileServer = new StaticFileServer(config.assetsFolder);
    createDatabaseAndTables(config.databaseFileName).catch((err) => {
        logger.warn(`Error while creating database tables: ${err}`);
    });

    let httpServer: http.Server | undefined;
    let httpsServer: https.Server | undefined;
    let viewHistoryHttpServer: http.Server | undefined;

    if (config.enableHttp) {
        httpServer =
            http.createServer(constructConnectionHandler(config, staticFileServer));
        httpServer.listen(config.httpListenPort, config.httpListenIP, () => {
            logger.info(
                `HTTP server started (listening ${config.httpListenIP}:${config.httpListenPort})`);
        });
    }

    if (config.enableHttps && config.httpsPrivateKeyPath && config.httpsCertificatePath) {
        const options = {
            cert: fs.readFileSync(config.httpsCertificatePath, "utf8"),
            key: fs.readFileSync(config.httpsPrivateKeyPath, "utf8"),
        };
        httpsServer = https.createServer(
            options, constructConnectionHandler(config, staticFileServer));
        httpsServer.listen(config.httpsListenPort, config.httpsListenIP, () => {
            logger.info(
                `HTTPS server started ` +
                `(listening ${config.httpsListenIP}:${config.httpsListenPort})`);
        });
    }
    if (config.enableWebInterface) {
        viewHistoryHttpServer = http.createServer(viewHistoryHandler(config));
        viewHistoryHttpServer.listen(config.webInterfacePort, config.webInterfaceIP, () => {
            logger.info(
                `Web Interface server started ` +
                `(listening ${config.httpListenIP}:${config.webInterfacePort})`);
        });
    }
    return [httpServer, httpsServer, viewHistoryHttpServer];
}

export function runAndReport(): void {
    configure({
        appenders: { formMailer: { type: "stdout" } },
        categories: { default: { appenders: ["formMailer"], level: STARTUP_LOG_LEVEL } },
    });
    const logger = getLogger("formMailer");
    try {
        run();
    } catch (e) {
        logger.error((e as Error).message as string);
        return process.exit(1);
    }
}

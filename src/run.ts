// import * as fs from "fs";
import * as http from "http";
// import * as https from "https";
import * as ns from "node-static";
import winston = require("winston");
import * as yargs from "yargs";
import { readConfig } from "./config";
import { createDatabaseAndTables } from "./database";
import { constructConnectionHandler } from "./handler";

const DEFAULT_CONFIG_PATH = "./config.json";
const STARTUP_LOG_LEVEL = "debug";

interface CommandLineArgs {
    config: string;
}

function run(): void {
    winston.configure({
        level: STARTUP_LOG_LEVEL,
        transports: [new winston.transports.Console({
            name: "Console",
            timestamp: true,
        })],
    });

    let cmdArgs: CommandLineArgs;
    cmdArgs = yargs.usage("FormMailer server. Usage: $0 [-c <config file>]")
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
    const config = readConfig(cmdArgs.config);

    winston.level = config.logLevel;

    const fileServer = new ns.Server(config.assetsFolder);
    createDatabaseAndTables(config.databaseFileName);

    // TODO: if(config.enableHttp)
    const httpServer = http.createServer(constructConnectionHandler(config, fileServer));
    httpServer.listen(config.httpListenPort, config.httpListenIP, () => {
        winston.info(`Server started (listening ${config.httpListenIP}:${config.httpListenPort})`);
    });

    // const options = {
    //     cert: fs.readFileSync("./cert/server.crt", "utf8"),
    //     key: fs.readFileSync("./cert/key.pem", "utf8"),
    // };
    // TODO: if (enableHttps && config.keyPath && config.certPath)
    // TODO: Change to config.httpsListenPort etc.
    // const httpsServer = https.createServer(
    //    options, constructConnectionHandler(config, fileServer));
    // httpsServer.listen(config.httpListenPort, config.httpListenIP, () => {
    // winston.info(`Server started (listening ${config.httpListenIP}:${config.httpListenPort})`);
    // });
}

export function runAndReport(): void {
    try {
        run();
    } catch (e) {
        winston.error(e.message);
        return process.exit(1);
    }
}

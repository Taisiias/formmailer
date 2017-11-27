import * as fs from "fs";
import * as http from "http";
import * as ns from "node-static";

import winston = require("winston");

export class StaticFileServer {
    private packageAssetsFileServer: ns.Server;
    private configAssetsFileServer: ns.Server;

    private packageAssetsFolderPath: string;
    private configAssetsFolderPath: string;

    constructor(configAssetsFolder: string) {
        this.configAssetsFolderPath = configAssetsFolder;
        this.packageAssetsFolderPath = `../../${__dirname}`;
        winston.debug(`packageAssetsFolderPath: ${this.packageAssetsFolderPath}`);

        this.configAssetsFileServer = new ns.Server(this.configAssetsFolderPath);
        this.packageAssetsFileServer = new ns.Server(this.packageAssetsFolderPath);
    }

    public serveFile(
        fileName: string,
        statusCode: number,
        req: http.IncomingMessage,
        res: http.ServerResponse,
    ): void {
        if (fs.existsSync(`${this.configAssetsFolderPath}/${fileName}`)) {
            this.configAssetsFileServer.serveFile(fileName, statusCode, {}, req, res);
        } else if (fs.existsSync(`${this.packageAssetsFolderPath}/${fileName}`)) {
            this.packageAssetsFileServer.serveFile(fileName, statusCode, {}, req, res);
        }
    }
}

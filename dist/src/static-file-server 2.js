"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const ns = require("node-static");
const path = require("path");
class StaticFileServer {
    constructor(configAssetsFolderPath) {
        this.configAssetsFolderPath = configAssetsFolderPath;
        this.packageAssetsFolderPath = path.join(__dirname, "../../assets");
        this.configAssetsFileServer = new ns.Server(this.configAssetsFolderPath);
        this.packageAssetsFileServer = new ns.Server(this.packageAssetsFolderPath);
    }
    serveFile(fileName, statusCode, req, res) {
        if (fs.existsSync(`${this.configAssetsFolderPath}/${fileName}`)) {
            this.configAssetsFileServer.serveFile(fileName, statusCode, {}, req, res);
        }
        else {
            this.packageAssetsFileServer.serveFile(fileName, statusCode, {}, req, res);
        }
    }
}
exports.StaticFileServer = StaticFileServer;

import * as fs from "fs";
import * as http from "http";
import * as ns from "node-static";
import * as path from "path";

export class StaticFileServer {
    private packageAssetsFileServer: ns.Server;
    private configAssetsFileServer: ns.Server;

    private packageAssetsFolderPath: string;

    constructor(private configAssetsFolderPath: string) {
        this.packageAssetsFolderPath = path.join(__dirname, "../../assets");

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
        } else {
            this.packageAssetsFileServer.serveFile(fileName, statusCode, {}, req, res);
        }
    }
}

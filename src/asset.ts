import * as fs from "fs";
import * as path from "path";

export function getAssetFolderPath(
    configAssetsFolderPath: string,
    fileName: string,
): string {
    const packageAssetsFolderPath = path.join(__dirname, "../../assets");
    if (fs.existsSync(`${configAssetsFolderPath}/${fileName}`)) {
        return `${configAssetsFolderPath}/${fileName}`;
    } else {
        return `${packageAssetsFolderPath}/${fileName}`;
    }
}

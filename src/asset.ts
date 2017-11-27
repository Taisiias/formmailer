import * as fs from "fs";

export function getAssetFolderPath(
    configAssetsFolderPath: string,
    fileName: string,
): string {
    const packageAssetsFolderPath = `../../${__dirname}`;
    if (fs.existsSync(`${configAssetsFolderPath}/${fileName}`)) {
        return `${configAssetsFolderPath}/${fileName}`;
    } else if (fs.existsSync(`${packageAssetsFolderPath}/${fileName}`)) {
        return `${packageAssetsFolderPath}/${fileName}`;
    } else {
        throw new Error ("Asset file not found.");
    }
}

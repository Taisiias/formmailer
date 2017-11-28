"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
function getAssetFolderPath(configAssetsFolderPath, fileName) {
    const packageAssetsFolderPath = `../../${__dirname}`;
    if (fs.existsSync(`${configAssetsFolderPath}/${fileName}`)) {
        return `${configAssetsFolderPath}/${fileName}`;
    }
    else {
        return `${packageAssetsFolderPath}/${fileName}`;
    }
}
exports.getAssetFolderPath = getAssetFolderPath;

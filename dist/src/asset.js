"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function getAssetFolderPath(configAssetsFolderPath, fileName) {
    const packageAssetsFolderPath = path.join(__dirname, "../../assets");
    if (fs.existsSync(`${configAssetsFolderPath}/${fileName}`)) {
        return `${configAssetsFolderPath}/${fileName}`;
    }
    else {
        return `${packageAssetsFolderPath}/${fileName}`;
    }
}
exports.getAssetFolderPath = getAssetFolderPath;

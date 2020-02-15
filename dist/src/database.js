"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3 = require("sqlite3");
function createDatabaseAndTables(databaseFileName) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(databaseFileName);
            db.run(`CREATE TABLE IF NOT EXISTS formmailer_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATETIME,
                referrer TEXT,
                form_name TEXT,
                post TEXT,
                user_message TEXT,
                to_email TEXT,
                ip TEXT
            )`, (err) => {
                db.close();
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    });
}
exports.createDatabaseAndTables = createDatabaseAndTables;
function saveEmailToDB(databaseFileName, ip, post, referrer, formName, toEmail, sentMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(databaseFileName);
            db.run(`INSERT INTO formmailer_data
            (date, referrer, form_name, post, user_message, to_email, ip)
            VALUES
            (datetime(), $referrer, $form_name, $post, $user_message, $to, $ip)`, {
                $form_name: formName,
                $ip: ip,
                $post: post,
                $referrer: referrer,
                $to: toEmail,
                $user_message: sentMessage,
            }, (err) => {
                db.close();
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    });
}
exports.saveEmailToDB = saveEmailToDB;
function loadSentEmailsInfo(databaseFileName) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(databaseFileName);
            db.all(`SELECT date, referrer, form_name, post, user_message, to_email, ip
            FROM formmailer_data`, (err, rows) => {
                db.close();
                if (err) {
                    reject(err);
                }
                // tslint:disable-next-line:no-any
                rows.forEach((r) => {
                    r.user_message = r.user_message.split("\n");
                });
                resolve(rows);
            });
        });
    });
}
exports.loadSentEmailsInfo = loadSentEmailsInfo;

import * as sqlite3 from "sqlite3";

export interface SentEmailInfo {
    date: Date;
    ip: string;
    post: string;
    referrer: string;
    formName: string;
    toEmail: string | string[];
    sentMessage: string[];
}

export async function createDatabaseAndTables(databaseFileName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const db = new sqlite3.Database(databaseFileName);
        db.run(
            `CREATE TABLE IF NOT EXISTS formmailer_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATETIME,
                referrer TEXT,
                form_name TEXT,
                post TEXT,
                user_message TEXT,
                to_email TEXT,
                ip TEXT
            )`,
            (err) => {
                db.close();
                if (err) {
                    reject(err);
                }
                resolve();
            });
    });
}

export async function saveEmailToDB(
    databaseFileName: string,
    ip: string,
    post: string,
    referrer: string,
    formName: string,
    toEmail: string | string[],
    sentMessage: string,
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const db = new sqlite3.Database(databaseFileName);
        db.run(
            `INSERT INTO formmailer_data
            (date, referrer, form_name, post, user_message, to_email, ip)
            VALUES
            (datetime(), $referrer, $form_name, $post, $user_message, $to, $ip)`,
            {
                $form_name: formName,
                $ip: ip,
                $post: post,
                $referrer: referrer,
                $to: toEmail,
                $user_message: sentMessage,
            },
            (err) => {
                db.close();
                if (err) {
                    reject(err);
                }
                resolve();
            });
    });
}

export async function loadSentEmailsInfo(
    databaseFileName: string,
): Promise<SentEmailInfo[]> {
    return new Promise<SentEmailInfo[]>((resolve, reject) => {
        const db = new sqlite3.Database(databaseFileName);
        db.all(
            `SELECT date, referrer, form_name, post, user_message, to_email, ip
            FROM formmailer_data`,
            (err, rows) => {
                db.close();
                if (err) {
                    reject(err);
                }
                // tslint:disable-next-line:no-any
                rows.forEach((r: { user_message: any }) => {
                    r.user_message = (r.user_message as string).split("\n");
                });
                resolve(rows as SentEmailInfo[]);
            });

    });
}

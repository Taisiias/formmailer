import * as sqlite3 from "sqlite3";

export interface SentEmailInfo {
    date: Date;
    ip: string;
    post: string;
    referrer: string;
    formName: string;
    toEmail: string | string[];
    sentMessage: string;
}

export function createDatabaseAndTables(databaseFileName: string): void {
    // TODO: make async
    const db = new sqlite3.Database(databaseFileName);
    db.run(`
        CREATE TABLE IF NOT EXISTS formmailer_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATETIME,
            referrer TEXT,
            form_name TEXT,
            post TEXT,
            user_message TEXT,
            to_email TEXT,
            ip TEXT
        )`);
    db.close();
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
    // TODO: make async
    const db = new sqlite3.Database(databaseFileName);
    db.run(
        `INSERT INTO formmailer_data (date, referrer, form_name, post, user_message, to_email, ip)
         VALUES (datetime(), $referrer, $form_name, $post, $user_message, $to, $ip)`,
        {
            $form_name: formName,
            $ip: ip,
            $post: post,
            $referrer: referrer,
            $to: toEmail,
            $user_message: sentMessage,
        });
    db.close();
}

export async function loadSentEmailsInfo(
    databaseFileName: string,
): Promise<SentEmailInfo[]> {
    return new Promise<SentEmailInfo[]>((resolve, reject) => {
        const db = new sqlite3.Database(databaseFileName);
        db.all(
            `SELECT date, referrer, form_name, post, user_message, to_email, ip
            FROM formmailer_data
            ORDER by date DESC`,
            (err, rows) => {
                if (err) {
                    reject(err);
                }
                resolve(rows as SentEmailInfo[]);
            });
        db.close();
    });
}

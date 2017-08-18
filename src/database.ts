import * as sqlite3 from "sqlite3";

export function createDatabaseAndTables(): void {
    const db = new sqlite3.Database("formmailer_database");

    db.run(`
        CREATE TABLE IF NOT EXISTS formmailer_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            date DATETIME, 
            referrer TEXT, 
            post TEXT, 
            user_message TEXT, 
            to_email TEXT, 
            ip TEXT 
        )`);
    db.close();
}

export async function insertEmail(
    ip: string,
    post: string,
    referrer: string,
    toEmail: string | string[],
    sentMessage: string,
): Promise<void> {
    const db = new sqlite3.Database("formmailer_database");
    db.run(
        "INSERT INTO formmailer_data (date, referrer, post, user_message, to_email, ip) " +
        "VALUES (datetime(), $referrer, $post, $user_message, $to, $ip)",
        {
            $ip: ip,
            $post: post,
            $referrer: referrer,
            $to: toEmail,
            $user_message: sentMessage,
        });
    db.close();
}

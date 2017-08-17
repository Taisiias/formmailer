import * as sqlite3 from "sqlite3";

export interface Email {
    id: number | undefined;
    date: Date;
    referrer: string;
    postRequest: string;
    userMessage: string;
    toEmail: string | string[];
    ip: string | undefined;
}

export function createDatabaseAndTables(): void {
    const db = new sqlite3.Database("formmailer_database");

    db.run("CREATE TABLE IF NOT EXISTS formmailer_data " +
        "(id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "date DATETIME, " +
        "referrer TEXT, " +
        "post TEXT, " +
        "user_message TEXT, " +
        "to_email TEXT, " +
        "ip TEXT " +
        ")");

    db.close();
}

export async function insertEmail(email: Email): Promise<void> {
    const db = new sqlite3.Database("formmailer_database");
    db.run(
        "INSERT INTO formmailer_data (date, referrer, post, user_message, to_email, ip) " +
        "VALUES (datetime(), $referrer, $post, $user_message, $to, $ip)",
        {
            // $date: new Date(),
            $ip: email.ip,
            $post: email.postRequest,
            $referrer: email.referrer,
            $to: email.toEmail,
            $user_message: email.userMessage,
        });
    db.close();
}

// export function selectEmail(): Email
// {
// db.each("SELECT rowid AS id, info FROM lorem", (err, row) => {
//         console.log(row.id + ": " + row.info);
//     });
// }

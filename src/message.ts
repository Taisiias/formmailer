import * as he from "he";

export async function constructFieldsValuesStr(post: { [k: string]: string }): Promise<string> {
    let userMessage = "";
    for (const name in post) {
        if (!name.startsWith("_") && name !== "g-recaptcha-response") {
            let buf: string = he.decode(post[name]);
            if (buf.includes("\n")) {
                buf = "\n" + buf.split("\n").map((s) => "     " + s).join("\n");
            }
            userMessage += `${name}: ${buf}\n`;
        }
    }
    return userMessage;
}

import * as he from "he";

export interface MustacheTemplateObject {
    key: string;
    textValue: string;
}

export function constructFieldsArrayForMustache(
    post: { [k: string]: string },
): MustacheTemplateObject[] {
    const resultingArray: MustacheTemplateObject[] = [];
    for (const name in post) {
        if (name.startsWith("_") || name === "g-recaptcha-response") { continue; }

        const buf: MustacheTemplateObject = { key: "", textValue: "" };
        buf.key = name;
        buf.textValue = he.decode(post[name]);

        if (buf.textValue.includes("\n")) {
            buf.textValue = "\n" + buf.textValue.split("\n").map((s) => "     " + s).join("\n");
        }
        resultingArray.push(buf);
    }
    return resultingArray;
}

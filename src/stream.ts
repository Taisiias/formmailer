import * as stream from "stream";

export async function readReadable(s: stream.Readable, maxRequestSize: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let bodyStr = "";
        s.on("data", (chunk: string) => {
            bodyStr += chunk.toString();
            if (bodyStr.length > maxRequestSize) {
                // FLOOD ATTACK OR FAULTY CLIENT
                reject("Maximum request size exceeded");
            }
        });
        s.on("end", () => {
            resolve(bodyStr);
        });
    });
}

import * as http from "http";
import * as qs from "querystring";
import { readReadable } from "./stream";

export async function parseRequestData(
    req: http.IncomingMessage,
    maxHttpRequestSize: number,
): Promise<[{ [k: string]: string }, string]> {
    const bodyStr = await readReadable(req, maxHttpRequestSize);
    const isAjax = isAjaxRequest(req);
    const postedData: { [k: string]: string } = isAjax ? JSON.parse(bodyStr) : qs.parse(bodyStr);
    return [postedData, bodyStr];
}

export function isAjaxRequest(req: http.IncomingMessage): boolean {
    return req.headers["content-type"] === "application/json" ||
        req.headers["content-type"] === "application/javascript";
}

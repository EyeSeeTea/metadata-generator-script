import _ from "lodash";
import { option, string, Type } from "cmd-ts";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import log from "../utils/log";
import path from "path";
import fs from "fs";

export function getD2Api(baseUrl: string): D2Api {
    const url = new URL(baseUrl);
    const decode = decodeURIComponent;
    const auth = { username: decode(url.username), password: decode(url.password) };
    return new D2Api({ baseUrl: url.origin + url.pathname, auth });
}

export function getApiUrlOption(options?: { long: string }) {
    return option({
        type: string,
        long: options?.long ?? "url",
        description: "http://USERNAME:PASSWORD@HOST:PORT",
    });
}

function fixedLengthString(str: string, len: number, errorMesage?: string) {
    if (str.length !== len) throw new Error(`Option must be ${len} char long`);
    return str;
}

export const GoogleApiKey: Type<string, string> = {
    async from(str) {
        return fixedLengthString(str, 39);
    },
};

export const SpreadsheetId: Type<string, string> = {
    async from(str) {
        return fixedLengthString(str, 44);
    },
};

export const filePath: Type<string, string> = {
    async from(str) {
        const resolved = path.resolve(str);

        if (!fs.existsSync(resolved)) {
            if (fs.existsSync(resolved.substring(0, resolved.lastIndexOf("/")))) {
                return resolved;
            }
            throw new Error("Path doesn't exist");
        }

        return resolved;
    },
};

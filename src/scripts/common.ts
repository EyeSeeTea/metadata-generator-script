import _ from "lodash";
import { option, string, Type } from "cmd-ts";
import { D2Api } from "@eyeseetea/d2-api/2.36";
import { google, sheets_v4 } from "googleapis";
import log from "../utils/log";
import path from "path";
import fs from "fs";
import { Path } from "domain/entities/Base";

export function getD2Api(baseUrl: string): D2Api {
    const url = new URL(baseUrl);
    const decode = decodeURIComponent;
    const auth = { username: decode(url.username), password: decode(url.password) };
    return new D2Api({ baseUrl: url.origin + url.pathname, auth });
}

export function getGoogleSheetsApi(googleApiKey: string): sheets_v4.Resource$Spreadsheets {
    const { spreadsheets } = google.sheets({ version: "v4", auth: googleApiKey });

    return spreadsheets;
}

export async function getGoogleSheetsApiByCredentials(credentialsPath: Path): Promise<sheets_v4.Resource$Spreadsheets> {
    const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    log.info(`Authenticating to googleapis.com...`);
    const authClient = await auth.getClient();
    const { spreadsheets } = google.sheets({ version: "v4", auth: authClient });
    return spreadsheets;
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
        return str;
    },
};

export const IDString: Type<string, string> = {
    async from(str) {
        if (_(str).isEmpty()) throw new Error("Value cannot be empty");
        if (str.length !== 11) throw new Error("ID must be 11 char long");
        return str;
    },
};

function isDir(str: string): boolean {
    const stat = fs.statSync(str);

    return stat.isDirectory();
}

export const DirPath: Type<string, string> = {
    async from(str) {
        const resolved = path.resolve(str);

        if (!fs.existsSync(resolved)) {
            throw new Error("Path doesn't exist.");
        }

        const stat = fs.statSync(resolved);

        if (!isDir(resolved)) {
            throw new Error("Path isn't a directory.");
        }

        return resolved;
    },
};

export const FilePath: Type<string, string> = {
    async from(str) {
        const resolved = path.resolve(str);

        if (!fs.existsSync(resolved)) {
            const subPath = resolved.substring(0, resolved.lastIndexOf("/"));
            if (fs.existsSync(resolved) && isDir(subPath)) {
                return resolved;
            }
            throw new Error("Path doesn't exist");
        }

        return resolved;
    },
};

export const MergeMode: Type<string, string> = {
    async from(str) {
        if (str === "MERGE" || str === "REPLACE") {
            return str;
        }
        throw new Error("Invalid MergeMode: MERGE or REPLACE");
    },
};

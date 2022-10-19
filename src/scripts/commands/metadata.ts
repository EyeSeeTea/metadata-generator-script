import _ from "lodash";
import { command, string, option, restPositionals, optional, subcommands, boolean, flag } from "cmd-ts";
import { getApiUrlOption, getD2Api, GoogleApiKey, SpreadsheetId, filePath } from "../common";
import log from "../../utils/log";

const defaultArgs = {
    url: getApiUrlOption({ long: "dhis-url" }),
    gKey: option({
        type: GoogleApiKey,
        long: "google-key",
        short: "g",
        description: "Google Api key",
    }),
    sheetId: option({
        type: SpreadsheetId,
        long: "sheet-id",
        short: "s",
        description: "Google Spreadsheet ID",
    }),
};

export function getCommand() {
    const buildMetadata = command({
        name: "build-metadata",
        description: "Build metadata JSON from a spreadsheet and upload it to DHIS2 instance",
        args: {
            ...defaultArgs,
            path: option({
                type: optional(filePath),
                long: "path",
                short: "p",
                description: "JSON output path (file or directory)",
            }),
            UpdateServer: flag({
                type: boolean,
                long: "update-server",
                short: "l",
                description: "Upload metadata to DHIS2 instance",
                defaultValue: () => true,
            }),
        },
        handler: async args => {
            // Upload Server script.

            import fs from "fs";
            import { D2Api } from "@eyeseetea/d2-api/2.34";
            import { config } from "dotenv-flow";
            import { google } from "googleapis";
            import _ from "lodash";
            import { loadSheet, uploadMetadata } from "../../utils/mainUtils";
            import { buildMetadata } from "../../utils/buildMetadata";

            async function uploadServer() {
                config(); // fill variable process.env from ".env.*" files
                const log = console.log,
                    env = process.env; // shortcuts

                log(`Reading https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID} ...`);
                const { spreadsheets } = google.sheets({ version: "v4", auth: env.GOOGLE_API_KEY });

                const { data } = await spreadsheets.get({ spreadsheetId: env.GOOGLE_SHEET_ID, includeGridData: true });
                const sheets = data.sheets?.filter(sheet => sheet.properties?.title != "DHIS2").map(loadSheet) ?? [];

                log("Converting to metadata...");
                const metadata = buildMetadata(sheets, env.DEFAULT_CATEGORY_COMBO_ID ?? "");

                log("Writing it to out.json ...");
                fs.writeFileSync("out.json", JSON.stringify(metadata, null, 4));

                if (env.UPDATE_SERVER === "true") {
                    log(`Updating it on server at ${env.DHIS2_BASE_URL} ...`);
                    const api = new D2Api({
                        baseUrl: env.DHIS2_BASE_URL,
                        auth: { username: env.DHIS2_USERNAME ?? "", password: env.DHIS2_PASSWORD ?? "" },
                    });
                    await uploadMetadata(api, metadata);

                    if (env.UPDATE_CATEGORY_OPTION_COMBOS === "true") {
                        log("Updating category option combos...");
                        await api.maintenance.categoryOptionComboUpdate().getData();
                    }
                }
            }

            uploadServer();
        },
    });

    const downloadIds = command({
        name: "download-ids",
        description: "Gets the IDs of the sheet metadata from DHIS2 instance and exports to CSV file.",
        args: {
            ...defaultArgs,
            path: option({
                type: optional(filePath),
                long: "path",
                short: "p",
                description: "JSON output path (file or directory)",
            }),
        },
        handler: async () => {
            // Pull IDs from DHIS2 Instance script.

            import { D2Api } from "@eyeseetea/d2-api/2.34";
            import { config } from "dotenv-flow";
            import { google } from "googleapis";
            import _ from "lodash";
            import { loadSheet } from "../../utils/mainUtils";
            import { pullMetadata } from "../../utils/pullMetadata";

            async function download_ids() {
                config(); // fill variable process.env from ".env.*" files
                const log = console.log,
                    env = process.env; // shortcuts

                log(`Reading https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID} ...`);
                const { spreadsheets } = google.sheets({ version: "v4", auth: env.GOOGLE_API_KEY });

                const { data } = await spreadsheets.get({ spreadsheetId: env.GOOGLE_SHEET_ID, includeGridData: true });
                const sheets = data.sheets?.filter(sheet => sheet.properties?.title != "DHIS2").map(loadSheet) ?? [];

                const api = new D2Api({
                    baseUrl: env.DHIS2_BASE_URL,
                    auth: { username: env.DHIS2_USERNAME ?? "", password: env.DHIS2_PASSWORD ?? "" },
                });

                pullMetadata(api, sheets);
            }

            download_ids();

            process.exit(0);
        },
    });

    return subcommands({
        name: "metadata",
        cmds: { "build-metadata": buildMetadata, "download-ids": downloadIds },
    });
}

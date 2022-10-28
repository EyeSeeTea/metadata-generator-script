// Upload Server script.

import fs from "fs";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { config } from "dotenv-flow";
import { google } from "googleapis";
import _ from "lodash";
import { loadSheet, uploadMetadata } from "../utils/utils";
import { buildMetadata } from "../utils/buildMetadata";

async function main() {
    config(); // fill variable process.env from ".env.*" files
    const log = console.log,
        env = process.env; // shortcuts

    log(`Reading https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID} ...`);
    const { spreadsheets } = google.sheets({ version: "v4", auth: env.GOOGLE_API_KEY });

    const { data } = await spreadsheets.get({ spreadsheetId: env.GOOGLE_SHEET_ID, includeGridData: true });
    const sheets = data.sheets?.filter(sheet => sheet.properties?.title != "DHIS2").map(loadSheet) ?? [];

    log("Converting to metadata...");
    const metadata = buildMetadata(sheets);

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

main();

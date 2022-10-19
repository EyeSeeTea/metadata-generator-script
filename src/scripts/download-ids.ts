// Pull IDs from DHIS2 Instance script.

import { D2Api } from "@eyeseetea/d2-api/2.34";
import { config } from "dotenv-flow";
import { google } from "googleapis";
import _ from "lodash";
import { loadSheet } from "../utils/mainUtils";
import { pullMetadata } from "../utils/pullMetadata";

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

// Main script.

import fs from "fs";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { D2ApiOptions } from "@eyeseetea/d2-api/api/types";
import { config as dotenvConfig } from "dotenv-flow";
import { google, sheets_v4 } from "googleapis";
import _ from "lodash";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";
import { getUid } from "../utils/uid";
import { buildMetadata } from "../utils/buildMetadata";

async function main() {
    dotenvConfig(); // fill variable process.env from .env.* files
    const log = console.log,
        env = process.env; // shortcuts

    log(`Reading https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID} ...`);
    const { spreadsheets } = google.sheets({ version: "v4", auth: env.GOOGLE_API_KEY });

    const { data } = await spreadsheets.get({ spreadsheetId: env.GOOGLE_SHEET_ID, includeGridData: true });
    const sheets = data.sheets?.map(getSheet) ?? [];

    log("Converting to metadata...");
    const metadata = await buildMetadata(sheets, env.DEFAULT_CATEGORY_COMBO_ID ?? "");

    log("Writing it to out.json ...");
    fs.writeFileSync("out.json", JSON.stringify(metadata, null, 4));

    log(`Updating it on server at ${env.DHIS2_BASE_URL} ...`);
    const d2ApiOptions = {
        baseUrl: env.DHIS2_BASE_URL,
        auth: { username: env.DHIS2_USERNAME ?? "", password: env.DHIS2_PASSWORD ?? "" },
    };
    await updateServer(d2ApiOptions, metadata, env.UPDATE_CATEGORY_OPTION_COMBOS === "true");
}

// Return an object with the name of the sheet and a list of items that
// correspond to each row. The items are objects like { col1: v1, col2: v2, ... }
// and a generated id if they don't contain one already.
function getSheet(sheet: any): Sheet {
    const sheetName = sheet.properties.title;

    const data = _.flatMap(sheet.data, data =>
        _.map(data.rowData, row => _.flatMap(row.values, cell => cell.formattedValue ?? undefined))
    );

    const header = data[0];
    const rows = data.slice(1);

    return {
        name: sheetName,
        items: rows
            .map(row => _.fromPairs(row.map((value, index) => [header[index], value])))
            .map(item => ({ ...item, id: item.id ?? getUid(makeSeed(item, sheetName)) } as MetadataItem))
            .filter(({ name }) => name !== undefined),
    };
}

// Return a string that can be used as a seed to generate a uid, corresponding
// to the given item at the given page in the spreadsheet.
function makeSeed(item: MetadataItem, sheetName: string) {
    const seed0 = `${sheetName}-${item.name}`; // the seed will be at least the page and the item's name
    if (sheetName === "options") return `${seed0}-${item.optionSet}`;
    if (sheetName === "programStageSections") return `${seed0}-${item.programStage}-${item.sortOrder}`;
    if (sheetName === "programStageDataElements") return `${seed0}-${item.program}-${item.programStage}`;
    return seed0;
}

// Connect to a server using D2Api with the given options, upload the given
// metadata, and force an update of the category option combos if requested.
async function updateServer(d2ApiOptions: D2ApiOptions, metadata: any, updateCombos: boolean) {
    const api = new D2Api(d2ApiOptions);

    const { response } = await api.metadata
        .postAsync(metadata, { importStrategy: "CREATE_AND_UPDATE", mergeMode: "MERGE" })
        .getData();

    const result = await api.system.waitFor(response.jobType, response.id).getData();

    const messages =
        result?.typeReports?.flatMap(({ klass, objectReports }) =>
            objectReports.flatMap(({ errorReports }) =>
                errorReports.flatMap(({ message, errorProperty }) => `${klass} ${errorProperty} ${message}`)
            )
        ) ?? [];

    console.log([result?.status, ...messages].join("\n"));

    if (updateCombos) {
        console.log("Updating category option combos ...");
        await api.maintenance.categoryOptionComboUpdate().getData();
    }
}

main();

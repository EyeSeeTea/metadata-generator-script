// Main utils.

import { D2Api } from "@eyeseetea/d2-api/2.34";
import _ from "lodash";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";
import { getUid } from "./uid";

// Return an object with the name of the sheet and a list of items that
// correspond to each row. The items are objects like { col1: v1, col2: v2, ... }
// and a generated id if they don't contain one already.
export function loadSheet(sheet: any): Sheet {
    const sheetName = sheet.properties.title;

    const data = _.flatMap(sheet.data, data =>
        _.map(data.rowData, row => _.flatMap(row.values, cell => cell.formattedValue ?? undefined))
    );

    const header = data[0];
    const rows = data.slice(1);

    const items = rows
        .map(row => _.fromPairs(row.map((value, index) => [header[index], value]).filter(([, value]) => value)))
        .filter(item => !_.isEmpty(item))
        .map(item => ({ ...item, id: item.id ?? getUid(makeSeed(item, sheetName)) } as MetadataItem));

    if (!items.every(item => item.name)) throw Error(`Rows with no name in sheet ${sheetName}`);

    return { name: sheetName, items };
}

// Return a string that can be used as a seed to generate a uid, corresponding
// to the given item at the given page in the spreadsheet.
function makeSeed(item: MetadataItem, sheetName: string) {
    const seed0 = `${sheetName}-${item.name}`; // the seed will be at least the page and the item's name
    if (sheetName === "options") return `${seed0}-${item.optionSet}`;
    if (sheetName === "legends") return `${seed0}-${item.legendSet}`;
    if (sheetName === "sections") return `${seed0}-${item.dataSet}`;
    if (sheetName === "programStages") return `${seed0}-${item.program}`;
    if (sheetName === "programSections") return `${seed0}-${item.program}`;
    if (sheetName === "programTrackedEntityAttributes") return `${seed0}-${item.program}`;
    if (sheetName === "programStageSections") return `${seed0}-${item.program}-${item.programStage}`;
    if (sheetName === "programStageDataElements") return `${seed0}-${item.program}-${item.programStage}`;
    return seed0;
}

// Connect to a server using the given D2Api and upload the given metadata.
export async function uploadMetadata(api: D2Api, metadata: any) {
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
}

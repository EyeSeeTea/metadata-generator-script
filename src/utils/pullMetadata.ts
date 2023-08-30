import { D2Api } from "@eyeseetea/d2-api/2.34";
import _ from "lodash";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";
import { createObjectCsvWriter } from "csv-writer";
import { getItems } from "./utils";

const log = console.log,
    env = process.env;

type MetadataQuery = { [key: string]: any };
type Query = { type: string; value: MetadataQuery };
type FilterNames = { [key: string]: string[] };

const allowedTypesArray = [
    "programSections",
    "programs",
    "programStages",
    "programStageSections",
    "trackedEntityTypes",
    "trackedEntityAttributes",
    "programRules",
    "programRuleVariables",
    "dataElements",
    "dataElementGroups",
    "dataElementGroupSets",
    "dataSets",
    "sections",
    "categories",
    "categoryCombos",
    "categoryOptions",
    "options",
    "optionSets",
    "legendSets",
    "attributes",
];

// Get names from spreadsheet data
function getNamesFromSpreadsheet(sheets: Sheet[]) {
    let filterNames: FilterNames = {};

    sheets.forEach(sheet => {
        if (!_.isEmpty(sheet.items)) {
            filterNames[sheet.name] = [];
            sheet.items.forEach(item => {
                filterNames[sheet.name].push(item["name"]);
            });
        }
    });

    return filterNames;
}

// Make the appropriate query from the template for one metadata type
function makeMetadataItemQuery(itemType: string, namesToFilter?: string[]) {
    let query: MetadataQuery = {};
    query[itemType] = {
        fields: {
            id: true,
        },
    };

    if (!_.isEmpty(namesToFilter)) {
        query[itemType]["filter"] = { name: { in: namesToFilter } };
    }
    return query;
}

// Make filtered query for each type present in names
function makeQueries(allowedTypesArray: string[], names: FilterNames) {
    let queries: Query[] = [];

    Object.entries(names).forEach(([metadataItemType, nameArray]) => {
        if (allowedTypesArray.includes(metadataItemType)) {
            queries.push({
                type: metadataItemType,
                value: makeMetadataItemQuery(metadataItemType, nameArray),
            });
        }
    });

    return queries;
}

function makeCsvHeader(element: object) {
    const keys = Object.keys(element).filter(key => key !== "id");
    let csvHeaders: { id: string; title: string }[] = [
        {
            id: "id",
            title: "id",
        },
    ];

    keys.forEach(headerItem => {
        csvHeaders.push({
            id: headerItem,
            title: headerItem,
        });
    });

    return csvHeaders;
}

function writeCsv(metadataType: string, metadata: MetadataItem[]) {
    const filePath = `${env.PULL_METADATA_CSV_PATH}${metadataType}.csv`;

    const header = makeCsvHeader(metadata[0]);

    const Writer = createObjectCsvWriter({ path: filePath, header });

    Writer.writeRecords(metadata);
    console.debug(`Written: ${filePath}`);
}

async function pullGenericMetadata(api: D2Api, query: Query) {
    const metadata: MetadataItem[] = await api.metadata
        .get(query.value)
        .getData()
        .then(results => {
            let resultsAsMetadataItem = _.omit(results, "system") as MetadataItem;
            return resultsAsMetadataItem[query.type];
        });

    return metadata;
}

async function pullProgramRulesMetadata(api: D2Api, query: Query, praSheet: MetadataItem[]) {
    const prQuery = { ...query };
    prQuery.value.programRules.fields.name = true;
    prQuery.value.programRules.fields.programRuleActions = true;

    const metadata = await pullGenericMetadata(api, prQuery);

    const prMetadata = metadata.map(item => ({ id: item.id }));
    if (!_.isEmpty(prMetadata)) {
        writeCsv(query.type, prMetadata);
    }

    const praQuerys: Query = {
        type: "programRuleActions",
        value: {
            programRuleActions: {
                fields: { id: true, programRuleActionType: true, programRule: true },
                filter: {
                    id: {
                        in: metadata.flatMap(prItem => prItem.programRuleActions.map((item: { id: any }) => item.id)),
                    },
                },
            },
        },
    };

    const praMetadata = await pullGenericMetadata(api, praQuerys);

    if (!_.isEmpty(praMetadata)) {
        const praMetadataIds = praSheet.flatMap(praSheetItem => {
            const praMetadataItem = praMetadata.find(praMetaToFilter => {
                const prName = metadata.find(item => item.id === praMetaToFilter.programRule.id)?.name;
                return (
                    prName === praSheetItem.programRule && praMetaToFilter.programRuleActionType === praSheetItem.name
                );
            });
            return { id: praMetadataItem?.id };
        });

        writeCsv("programRuleActions", praMetadataIds);
    }
}

export async function pullMetadata(api: D2Api, sheets: Sheet[]) {
    const filterNames = getNamesFromSpreadsheet(sheets);

    const queries = makeQueries(allowedTypesArray, filterNames);

    queries.forEach(async query => {
        if (query.type === "programRules") {
            await pullProgramRulesMetadata(api, query, getItems(sheets, "programRuleActions"));
        } else {
            const metadata = await pullGenericMetadata(api, query);
            if (!_.isEmpty(metadata)) {
                writeCsv(query.type, metadata);
            }
        }
    });
}

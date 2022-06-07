import fs from "fs";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import _ from "lodash";
import { MetadataItem } from '../domain/entities/MetadataItem';
import { Sheet } from "../domain/entities/Sheet";

const log = console.log, env = process.env;

type MetadataQuery = { [key: string]: any };
type QueryTemplateArray = { type: string, template: MetadataQuery }[];
type FilterNames = { [key: string]: string[] };
// type FilterNames = { type: string, names: string[] }[];

const queryTemplates: QueryTemplateArray = [
    {
        type: "programs",
        template: {
            programs: {
                fields: {
                    id: true,
                    name: true,
                    shortName: true,
                    code: true,
                    description: true,
                    trackedEntityType: true,
                    categoryCombo: true,
                    version: true,
                    expiryPeriodType: true,
                    expiryDays: true,
                    completeEventsExpiryDays: true,
                    style: true,
                    displayFrontPageList: true,
                    useFirstStageDuringRegistration: true,
                    accessLevel: true,
                    minAttributesRequiredToSearch: true,
                    maxTeiCountToReturn: true,
                    selectIncidentDatesInFuture: true,
                    selectEnrollmentDatesInFuture: true,
                    onlyEnrollOnce: true,
                    displayIncidentDate: true,
                    incidentDateLabel: true,
                    enrollmentDateLabel: true,
                    ignoreOverdueEvents: true,
                    featureType: true,
                    relatedProgram: true,
                    programStages: {
                        id: true,
                    },
                },
            },
        }
    },
    {
        type: "programStages",
        template: {
            programStages: {
                fields: {
                    id: true,
                    name: true,
                    program: true,
                    enableUserAssignment: true,
                    blockEntryForm: true,
                    featureType: true,
                    preGenerateUID: true,
                    executionDateLabel: true,
                    validationStrategy: true,
                    style: true,
                    description: true,
                    minDaysFromStart: true,
                    repeatable: true,
                    periodType: true,
                    displayGenerateEventBox: true,
                    standardInterval: true,
                    autoGenerateEvent: true,
                    openAfterEnrollment: true,
                    reportDateToUse: true,
                    remindCompleted: true,
                    allowGenerateNextVisit: true,
                    generatedByEnrollmentDate: true,
                    hideDueDate: true,
                    dueDateLabel: true,
                    programStageDataElements: {
                        id: true,
                        programStage: true,
                        sortOrder: true,
                        compulsory: true,
                        allowProvidedElsewhere: true,
                        displayInReports: true,
                        allowFutureDate: true,
                        skipSynchronization: true,
                        renderType: true,
                        dataElement: {
                            id: true,
                        },
                    },
                },
            },
        },
    },
    {
        type: "dataElements",
        template: {
            dataElements: {
                fields: {
                    id: true,
                    name: true,
                    shortName: true,
                    formName: true,
                    dataSetSection: true,
                    code: true,
                    categoryCombo: true,
                    valueType: true,
                    aggregationType: true,
                    domainType: true,
                    description: true,
                    optionSet: {
                        id: true,
                    },
                },
            },
        }
    },
    {
        type: "datasets",
        template: {
            datasets: {
                fields: {
                    id: true,
                    name: true,
                    code: true,
                    periodType: true,
                    categoryCombo: true,
                    description: true,
                },
            },
        },
    },
    {
        type: "sections",
        template: {
            sections: {
                fields: {
                    id: true,
                    name: true,
                    code: true,
                    dataSet: {
                        id: true,
                    },
                    showRowTotals: true,
                    showColumnTotals: true,
                    description: true,
                },
            },

        }
    },
    {
        type: "Categories",
        template: {
            Categories: {
                fields: {
                    id: true,
                    name: true,
                    shortName: true,
                    code: true,
                    categoryCombo: {
                        id: true,
                    },
                    dataDimensionType: true,
                    description: true
                },
            },
        }
    },
    {
        type: "categoryCombos",
        template: {
            categoryCombos: {
                fields: {
                    id: true,
                    name: true,
                    code: true,
                    dataDimensionType: true,
                    description: true,
                },
            },
        }
    },
    {
        type: "categoryOptions",
        template: {
            categoryOptions: {
                fields: {
                    id: true,
                    name: true,
                    code: true,
                    category: {
                        id: true,
                    },
                    shortName: true,
                    description: true,
                },
            },
        }
    },
    {
        type: "optionSets",
        template: {
            optionSets: {
                fields: {
                    id: true,
                    name: true,
                    code: true,
                    valueType: true,
                    description: true,
                },
            },
        }
    },
    {
        type: "options",
        template: {
            options: {
                fields: {
                    id: true,
                    name: true,
                    code: true,
                    optionSet: {
                        id: true,
                    },
                    shortName: true,
                    description: true,
                },
            },
        }
    },
]

// Get names from spreadsheet data
export function getNamesFromSpreadsheet(sheets: Sheet[]) {
    let filterNames: FilterNames = {};

    sheets.forEach((sheet) => {
        filterNames[sheet.name] = [];
        sheet.items.forEach((item) => {
            filterNames[sheet.name].push(item["name"]);
        })
    });

    return filterNames;
}

// Get names from the output of buildMetadata
export function getNamesFromMetadata(metadataItemArray: { [key: string]: MetadataItem[] }) {
    let filterNames: FilterNames = {};

    Object.entries(metadataItemArray).forEach(([metadataItemType, metadataItem]) => {
        filterNames[metadataItemType] = [];
        metadataItem.forEach((item) => {
            filterNames[metadataItemType].push(item["name"]);
        })
    });

    return filterNames;
}

// Make the appropriate query from the template for one metadata type
function makeMetadataItemQuery(queryTemplate: MetadataQuery, namesToFilter?: string[], all?: boolean) {
    const key = Object.keys(queryTemplate)[0];
    let metadataQuery: MetadataQuery = {};

    if (all) {
        metadataQuery[key] = { fields: queryTemplate[key]["fields"] };
    } else {
        metadataQuery[key] = { fields: { id: queryTemplate[key]["fields"]["id"] } };
    }
    if (typeof namesToFilter !== undefined || namesToFilter?.length !== 0) {
        metadataQuery[key]["filter"] = { name: { in: namesToFilter } };
    }
    return metadataQuery;
}

// Make filtered query for each type present in names
function makeFilteredQueries(queryTemplates: QueryTemplateArray, names: FilterNames, all?: boolean) {
    let queries: { type: string, value: MetadataQuery }[] = []

    Object.entries(names).forEach(([metadataItemType, nameArray]) => {
        const metadataItem = queryTemplates.find(queryTemplate => {
            return queryTemplate.type === metadataItemType;
        })?.template ?? {};

        queries.push({
            type: metadataItemType,
            value: makeMetadataItemQuery(metadataItem, nameArray, all)
        });
    });

    return queries;
}

export async function getMetadata(api: D2Api, filterNames: FilterNames) {
    const queries = makeFilteredQueries(queryTemplates, filterNames, false);

    queries.forEach(async (query) => {
        // Query answer without the system property
        const metadata = _.omit(await api.metadata.get(query.value).getData(), "system");
        // TEST FILE OUTPUT
        fs.appendFileSync("getMetadata.json", JSON.stringify(metadata, null, 4));
        // NOTE TO MARIE: your CSV function could go here,
        // query.type can be the base for each file name and metadata is the data to be writed
    })
}

import fs from "fs";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import _ from "lodash";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";

const log = console.log, env = process.env;

type MetadataQuery = { [key: string]: any };
type FilterNames = { [key: string]: string[] };

const programsQueryTemplate: MetadataQuery = {
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

const programstagesQueryTemplate: MetadataQuery = {
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
}

const dataElementsQuery: MetadataQuery = {
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


const datasetsQuerry: MetadataQuery = {
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
}


const sectionsQuerry: MetadataQuery = {
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


const CategoryQuery: MetadataQuery = {
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

const categoryCombosQuerry: MetadataQuery = {
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

const categoryOptionsQuerry: MetadataQuery = {
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

const optionSetsQuerry: MetadataQuery = {
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

const optionsQuerry: MetadataQuery = {
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

function getNamesFromSpreadsheet(sheets: Sheet[]) {
    let names: FilterNames = {};

    sheets.forEach((sheet) => {
        names[sheet.name] = [];
        sheet.items.forEach((item) => {
            names[sheet.name].push(item["name"]);
        })
    });

    return names;
}

export function getNamesFromMetadata(metadataItemArray: { [key: string]: MetadataItem[] }) {
    let names: FilterNames = {};

    Object.entries(metadataItemArray).forEach(([metadataItemType, metadataItem]) => {
        names[metadataItemType] = [];
        metadataItem.forEach((item) => {
            names[metadataItemType].push(item["name"]);
        })
    });

    return names;
}

// Make the appropriate query from the template
function makeMetadataItemQuery(queryTemplate: MetadataQuery, all?: boolean, nameToFilter?: string) {
    const key = Object.keys(queryTemplate)[0];
    let metadataQuery: MetadataQuery = {};

    if (all) {
        metadataQuery[key] = { fields: programsQueryTemplate[key]["fields"] };
    } else {
        metadataQuery[key] = { fields: { id: programsQueryTemplate[key]["fields"]["id"] } };
    }
    if (typeof nameToFilter !== undefined) {
        metadataQuery[key]["filter"] = { name: { eq: nameToFilter } };
    }
    log(metadataQuery);
    return metadataQuery;
}

function getMetadataUIDs(queryTemplates: MetadataQuery[], names: FilterNames, all?: boolean) {
    Object.entries(names).forEach(([metadataItemType, nameArray]) => {
        const metadataItem = queryTemplates.find(template => template.type === metadataItemType)
        nameArray.forEach((name) => {
            makeMetadataItemQuery(metadataItem, false, name)
        })
    });
}

// Sample function retrieving filtered metadata 
export async function getMetadata(api: D2Api) {
    let nameToFilter = "Antenatal care visit";

    const metadata = await api.metadata.get(
        makeMetadataItemQuery(programsQueryTemplate, true, nameToFilter)
    ).getData();

    log(JSON.stringify(metadata, null, 4));

    fs.writeFileSync("getMetadata.json", JSON.stringify(metadata, null, 4));
}

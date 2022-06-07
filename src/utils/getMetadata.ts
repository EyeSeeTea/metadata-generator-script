import fs from "fs";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import _ from "lodash";

const log = console.log, env = process.env;

type MetadataQuery = { [key: string]: any };

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
        filter: {
            name: {
                eq: "name",
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
        filter: {
            name: {
                eq: "name",
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


const datasetsQuerry: MetadataQuerry = {
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


const sectionsQuerry: MetadataQuerry = {
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


const CategoryOptionsQuery: MetadataQuery = {
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

// Sample function retrieving filtered metadata 
export async function getMetadata(api: D2Api) {
    let nameToFilter = "Antenatal care visit";

    const metadata = await api.metadata.get(
        makeMetadataItemQuery(programsQueryTemplate, true, nameToFilter)
    ).getData();

    log(JSON.stringify(metadata, null, 4));

    fs.writeFileSync("getMetadata.json", JSON.stringify(metadata, null, 4));
}

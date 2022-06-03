import fs from "fs";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import _ from "lodash";

const log = console.log, env = process.env;

type MetadataQuerry = { [key: string]: any };

const programsQuerryTemplate: MetadataQuerry = {
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

const programstagesQuerryTemplate: MetadataQuerry = {
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

// Make the appropriate query from the template
// function makeMetadataItemQuery(queryTemplate: MetadataQuerry, all?: boolean, nameToFilter?: string) {
//     let query: MetadataQuerry;
//     if (all) {
//         query = _(queryTemplate).clone();
//     } else {
//         query = queryTemplate;
//     }
//     if (typeof nameToFilter !== undefined) {
//         query.filter.name.eq = nameToFilter;
//     }
//     return query;
// }

// Sample function retrieving filtered metadata 
export async function getMetadata(api: D2Api) {
    let metadataQuery = _(programsQuerryTemplate).clone();
    log(metadataQuery);
    metadataQuery.programs.filter.name.eq = "Antenatal care visit";
    log(metadataQuery);

    const metadata = await api.metadata.get(metadataQuery).getData();
    log(JSON.stringify(metadata, null, 4));
    fs.writeFileSync("getMetadata.json", JSON.stringify(metadata, null, 4));
}
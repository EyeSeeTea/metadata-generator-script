import { D2Api } from "@eyeseetea/d2-api/2.34";
import { command, run } from "cmd-ts";
import { config } from "dotenv-flow";
import { google, sheets_v4 } from "googleapis";
import _ from "lodash";
import path from "path";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";
import { writeFile } from "../utils/fs";
import { generateUid, getUid } from "../utils/uid";

config();

const { spreadsheets } = google.sheets({ version: "v4", auth: process.env.GOOGLE_API_KEY });

function getSheets(data: sheets_v4.Schema$Spreadsheet): Sheet[] {
    return (
        data.sheets?.map(sheet => {
            return {
                name: sheet.properties?.title ?? "Unknown",
                data: _.flatMap(sheet.data, data =>
                    _.map(data.rowData, row =>
                        _.flatMap(row.values, cell => {
                            return {
                                value: cell.formattedValue ?? undefined,
                                hyperlink: cell.hyperlink ?? undefined,
                                note: cell.note ?? undefined,
                                userEnteredValue: cell.userEnteredValue ?? undefined,
                                effectiveValue: cell.effectiveValue ?? undefined,
                            };
                        })
                    )
                ),
            };
        }) ?? []
    );
}

function extractObjects(sheets: Sheet[], key: string): MetadataItem[] {
    const { data = [] } = sheets.find(s => s.name === key) ?? {};
    const [header, ...rows] = data;

    return rows.map(row => _.fromPairs(row.map((cell, index) => [header[index].value, cell.value])))
        .map(object => {
            let seed: string;
            switch (key) {
                case "options":
                    seed = `${key}-${object.name}-${object.optionSet}`;
                    break;
                case "programSections":
                    seed = `${key}-${object.name}-${object.program}-${object.sortOrder}`;
                    break;
                case "programStages":
                    seed = `${key}-${object.name}-${object.program}`;
                    break;
                case "programStageDataElements":
                    seed = `${key}-${object.name}-${object.program}-${object.programStage}`;
                    break;
                case "programStageSections":
                    seed = `${key}-${object.name}-${object.programStage}-${object.sortOrder}`;
                    break;
                default:
                    seed = `${key}-${object.name}`;
                    break;
            }
            return { ...object, id: object.id ?? getUid(seed) } as MetadataItem;
        })
        .filter(({ name }) => name !== undefined);
}

async function buildDataSets(sheets: Sheet[]) {
    const sheetDataSets = extractObjects(sheets, "dataSets");
    const sheetDataElements = extractObjects(sheets, "dataElements");
    const sheetDataSetSections = extractObjects(sheets, "sections");
    const sheetCategoryCombos = extractObjects(sheets, "categoryCombos");
    const sheetCategoryOptions = extractObjects(sheets, "categoryOptions");
    const sheetCategories = extractObjects(sheets, "categories");
    const sheetOptionSets = extractObjects(sheets, "optionSets");
    const sheetOptions = extractObjects(sheets, "options");
    const sheetTrackedEntityAttributes = extractObjects(sheets, "trackedEntityAttributes");
    const sheetTrackedEntityTypes = extractObjects(sheets, "trackedEntityTypes");
    const sheetProgramDataElements = extractObjects(sheets, "programDataElements");
    const sheetPrograms = extractObjects(sheets, "programs");
    const sheetProgramSections = extractObjects(sheets, "programSections");
    const sheetProgramSectionsTrackedEntityAttributes = extractObjects(sheets, "programSectionsTrackedEntityAttributes");
    const sheetProgramStages = extractObjects(sheets, "programStages");
    const sheetProgramStageDataElements = extractObjects(sheets, "programStageDataElements");
    const sheetProgramStageSections = extractObjects(sheets, "programStageSections");
    const sheetProgramStageSectionsDataElements = extractObjects(sheets, "programStageSectionsDataElements");

    const options = _(sheetOptions)
        .map(option => {
            const optionSet = sheetOptionSets.find(({ name }) => name === option.optionSet)?.id;

            return { ...option, optionSet: { id: optionSet } };
        })
        .groupBy(({ optionSet }) => optionSet.id)
        .mapValues(options => options.map((option, index) => ({ ...option, sortOrder: index + 1 })))
        .values()
        .flatten()
        .value();

    const sections = _(sheetDataSetSections)
        .map(section => {
            const dataSet = sheetDataSets.find(({ name }) => name === section.dataSet)?.id;
            const dataElements = sheetDataElements
                .filter(({ dataSetSection }) => dataSetSection === section.name)
                .map(({ id }) => ({ id }));

            return { ...section, dataSet: { id: dataSet }, dataElements };
        })
        .groupBy(({ dataSet }) => dataSet.id)
        .mapValues(items => items.map((section, index) => ({ ...section, sortOrder: index + 1 })))
        .values()
        .flatten()
        .value();

    const dataElements = sheetDataElements.map(dataElement => {
        const categoryCombo =
            sheetCategoryCombos.find(({ name }) => name === dataElement.categoryCombo)?.id ??
            process.env.DEFAULT_CATEGORY_COMBO_ID;

        const optionSet = sheetOptionSets.find(({ name }) => name === dataElement.optionSet)?.id;

        return {
            ...dataElement,
            categoryCombo: { id: categoryCombo },
            aggregationType: mapAggregationType(dataElement.aggregationType),
            valueType: mapValueType(dataElement.valueType),
            optionSet: optionSet ? { id: optionSet } : undefined,
            domainType: dataElement.domainType,
        };
    });

    const dataSets = sheetDataSets.map(dataSet => {
        const dataSetElements = sheetDataElements
            .filter(({ dataSetSection }) => {
                const section = sheetDataSetSections.find(({ name }) => name === dataSetSection);
                return section?.dataSet === dataSet.name;
            })
            .map(({ id, categoryCombo }) => {
                const categoryComboId =
                    sheetCategoryCombos.find(({ name }) => name === categoryCombo)?.id ??
                    process.env.DEFAULT_CATEGORY_COMBO_ID;

                return {
                    dataSet: { id: dataSet.id },
                    dataElement: { id },
                    categoryCombo: { id: categoryComboId },
                };
            });

        const categoryCombo =
            sheetCategoryCombos.find(({ name }) => name === dataSet.categoryCombo)?.id ??
            process.env.DEFAULT_CATEGORY_COMBO_ID;

        return { ...dataSet, dataSetElements, categoryCombo: { id: categoryCombo } };
    });

    const programStageSectionsDataElements = sheetProgramStageSectionsDataElements
        .map(programStageSectionsDataElements => {
            const programStageSection = sheetProgramStageSections.find(
                programStageSection => {
                    return programStageSection.name === programStageSectionsDataElements.programStageSection &&
                        programStageSection.programStage === programStageSectionsDataElements.programStage &&
                        programStageSection.program === programStageSectionsDataElements.program
                }
            )?.id;

            const dataElement = sheetDataElements.find(
                dataElement => dataElement.name === programStageSectionsDataElements.name
            )?.id;

            return { programStageSection, dataElement }
        });

    const programStageSections = sheetProgramStageSections.map(programStageSection => {
        const programStage = {
            id: sheetProgramStages
                .find(programStage => programStage.name === programStageSection.programStage)?.id
        };

        const sortOrder: number = +programStageSection.sortOrder;

        const renderType = {
            DESKTOP: { type: programStageSection.renderTypeDesktop ?? "LISTING" },
            MOBILE: { type: programStageSection.renderTypeMobile ?? "LISTING" }
        };
        delete programStageSection.renderTypeDesktop;
        delete programStageSection.renderTypeMobile;

        const dataElements = programStageSectionsDataElements.filter((dataElements) => {
            return dataElements?.programStageSection === programStageSection?.id;
        }).map(({ dataElement }) => ({ id: dataElement }));

        return { ...programStageSection, programStage, sortOrder, renderType, dataElements }
    });

    const programStages = sheetProgramStages.map(programStage => {
        const programObj = sheetPrograms.find(program => program.name === programStage.program);

        const program = {
            id: programObj?.id
        };

        const enableUserAssignment: boolean = programStage.enableUserAssignment.toLowerCase() === 'true';

        const programStageSections = sheetProgramStageSections.filter((programStageSections) => {
            return programStageSections?.programStage === programStage.name;
        }).map(({ id }) => ({ id }));

        const repeatable: boolean = programStage.repeatable.toLowerCase() === 'true';

        const programStageDataElements = sheetProgramStageDataElements.filter((programStageDataElements) => {
            return programStageDataElements?.program === programObj?.name &&
                programStageDataElements?.programStage === programStage.name;
        }).map(({ id, name, sortOrder, compulsory, allowProvidedElsewhere, displayInReports, allowFutureDate,
            skipSynchronization, renderTypeDesktop, renderTypeMobile }) => ({
                id,
                programStage: {
                    id: programStage.id
                },
                sortOrder,
                compulsory,
                allowProvidedElsewhere,
                displayInReports,
                allowFutureDate,
                skipSynchronization,
                renderType: {
                    DESKTOP: { type: renderTypeDesktop },
                    MOBILE: { type: renderTypeMobile }
                },
                dataElement: {
                    id: sheetDataElements.find(dataElement => dataElement.name === name)?.id
                },
            }));

        return {
            ...programStage, enableUserAssignment, repeatable, program,
            programStageDataElements, programStageSections
        }
    });

    const programSectionsTrackedEntityAttributes = sheetProgramSectionsTrackedEntityAttributes
        .map(programSectionsTrackedEntityAttributes => {
            const programSection = sheetProgramSections.find(
                programSection => {
                    return programSection.name === programSectionsTrackedEntityAttributes.programSection &&
                        programSection.program === programSectionsTrackedEntityAttributes.program
                }
            )?.id;

            const trackedEntityAttribute = sheetTrackedEntityAttributes.find(
                trackedEntityAttribute => trackedEntityAttribute.name === programSectionsTrackedEntityAttributes.name
            )?.id;

            return { programSection, trackedEntityAttribute }
        });

    const programSections = sheetProgramSections.map(programSection => {
        const program = {
            id: sheetPrograms
                .find(program => program.name === programSection.program)?.id
        };

        const sortOrder: number = +programSection.sortOrder;

        const renderType = {
            DESKTOP: { type: programSection.renderTypeDesktop ?? "LISTING" },
            MOBILE: { type: programSection.renderTypeMobile ?? "LISTING" }
        };
        delete programSection.renderTypeDesktop;
        delete programSection.renderTypeMobile;

        const trackedEntityAttributes = programSectionsTrackedEntityAttributes.filter((trackedEntityAttributes) => {
            return trackedEntityAttributes?.programSection === programSection?.id;
        }).map(({ trackedEntityAttribute }) => ({ id: trackedEntityAttribute }));

        return { ...programSection, program, sortOrder, renderType, trackedEntityAttributes }
    });

    const programs = sheetPrograms.map(program => {
        const trackedEntityType = {
            id: sheetTrackedEntityTypes
                .find(trackedEntityType => trackedEntityType.name === program.trackedEntityType)?.id
        };

        const programStages = sheetProgramStages
            .filter((programStages) => {
                return programStages?.program === program.name;
            }).map(({ id }) => ({ id }));

        const categoryCombo = {
            id: sheetCategoryCombos
                .find(categoryCombo => categoryCombo.name === program.categoryCombo)?.id ?? process.env.DEFAULT_CATEGORY_COMBO_ID
        };

        const programSections = sheetProgramSections.filter((programSections) => {
            return programSections?.program === program.name;
        }).map(({ id }) => ({ id }));

        if (trackedEntityType.id) {
            const programType = "WITH_REGISTRATION";
            return { ...program, programType, trackedEntityType, categoryCombo, programStages, programSections };
        } else {
            const programType = "WITHOUT_REGISTRATION";
            return { ...program, programType, categoryCombo, programStages };
        }
    });

    const categories = sheetCategories.map(category => {
        const categoryOptions = sheetCategoryOptions
            .filter(option => option.category === category.name)
            .map(({ id }) => ({ id }));

        return { ...category, categoryOptions };
    });

    const categoryCombos = sheetCategoryCombos.map(categoryCombo => {
        const categories = sheetCategories
            .filter(category => category.categoryCombo === categoryCombo?.name)
            .map(({ id }) => ({ id }));

        return { ...categoryCombo, categories };
    });

    const optionSets = sheetOptionSets.map(optionSet => {
        const options = sheetOptions.filter(({ optionSet }) => optionSet === optionSet.name).map(({ id }) => ({ id }));

        return { ...optionSet, options, valueType: mapValueType(optionSet.valueType) };
    });

    const categoryOptions = _.uniqBy(sheetCategoryOptions, item => item.id);

    const trackedEntityAttributes: any[] = sheetTrackedEntityAttributes.map(attribute => {
        const optionSet = sheetOptionSets.find(({ name }) => name === attribute.optionSet)?.id;

        return {
            ...attribute,
            aggregationType: mapAggregationType(attribute.aggregationType),
            valueType: mapValueType(attribute.valueType),
            optionSet: optionSet ? { id: optionSet } : undefined,
        };
    });

    const trackedEntityTypes = sheetTrackedEntityTypes.map(type => {
        const trackedEntityTypeAttributes = trackedEntityAttributes
            .filter(({ trackedEntityType }) => trackedEntityType === type.name)
            .map(({ id, name, searchable, mandatory, unique, valueType, displayInList, optionSet }) => ({
                value: id,
                text: name,
                searchable,
                mandatory,
                unique,
                valueType,
                displayInList,
                trackedEntityAttribute: { id },
                optionSet,
            }));

        return { ...type, trackedEntityTypeAttributes };
    });

    const programDataElements = sheetProgramDataElements.map(dataElement => {
        const optionSet = sheetOptionSets.find(({ name }) => name === dataElement.optionSet)?.id;

        return {
            ...dataElement,
            domainType: "TRACKER",
            aggregationType: mapAggregationType(dataElement.aggregationType),
            valueType: mapValueType(dataElement.valueType),
            optionSet: optionSet ? { id: optionSet } : undefined,
        };
    });

    return {
        dataSets,
        dataElements: [...dataElements, ...programDataElements],
        options,
        sections,
        categories,
        categoryCombos,
        categoryOptions,
        optionSets,
        trackedEntityAttributes,
        trackedEntityTypes,
        programSections,
        programs,
        programStages,
        programStageSections
    };
}

async function getSheet() {
    const api = new D2Api({
        baseUrl: process.env.DHIS2_BASE_URL,
        auth: { username: process.env.DHIS2_USERNAME ?? "", password: process.env.DHIS2_PASSWORD ?? "" },
    });

    const { data } = await spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, includeGridData: true });
    const sheets = getSheets(data);
    const results = await buildDataSets(sheets);
    await writeFile("out.json", results).toPromise();

    if (process.env.TEST_RUN !== "true") {
        const { response } = await api.metadata
            .postAsync(results as any, { importStrategy: "CREATE_AND_UPDATE", mergeMode: "MERGE" })
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

    if (process.env.UPDATE_CATEGORY_OPTION_COMBOS === "true") {
        await api.maintenance.categoryOptionComboUpdate().getData();
        console.log("Updating category option combos");
    }
}

function mapValueType(type: string): string {
    const dictionary: Record<string, string> = {
        Text: "TEXT",
        "Long text": "LONG_TEXT",
        Letter: "LETTER",
        "Phone number": "PHONE_NUMBER",
        Email: "EMAIL",
        "Yes/No": "BOOLEAN",
        "Yes Only": "TRUE_ONLY",
        Date: "DATE",
        "Date & Time": "DATETIME",
        Time: "TIME",
        Number: "NUMBER",
        "Unit interval": "UNIT_INTERVAL",
        Percentage: "PERCENTAGE",
        Integer: "INTEGER",
        "Positive Integer": "INTEGER_POSITIVE",
        "Negative Integer": "INTEGER_NEGATIVE",
        "Positive or Zero Integer": "INTEGER_ZERO_OR_POSITIVE",
        "Tracker Associate": "TRACKER_ASSOCIATE",
        Username: "USERNAME",
        Coordinate: "COORDINATE",
        "Organisation unit": "ORGANISATION_UNIT",
        Age: "AGE",
        URL: "URL",
        File: "FILE_RESOURCE",
        Image: "IMAGE",
    };

    return dictionary[type] ?? "TEXT";
}

function mapAggregationType(type: string): string {
    const dictionary: Record<string, string> = {
        Sum: "SUM",
        Average: "AVERAGE",
        "Average (sum in org unit hierarchy)": "AVERAGE_SUM_ORG_UNIT",
        "Last value (sum in org unit hierarchy)": "LAST",
        "Last value (average in org unit hierarchy)": "LAST_AVERAGE_ORG_UNIT",
        "Last value in period (sum in org unit hierarchy)": "LAST_IN_PERIOD",
        "Last value in period (average in org unit hierarchy)": "LAST_IN_PERIOD_AVERAGE_ORG_UNIT",
        "First value (sum in org unit hierarchy)": "FIRST",
        "First value (averge in org unit hierarchy)": "FIRST_AVERAGE_ORG_UNIT",
        Count: "COUNT",
        "Standard deviation": "STDDEV",
        Variance: "VARIANCE",
        Min: "MIN",
        Max: "MAX",
        None: "NONE",
        Custom: "CUSTOM",
        Default: "DEFAULT",
    };

    return dictionary[type] ?? "NONE";
}

async function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Scheduler to execute predictors on multiple DHIS2 instances",
        args: {},
        handler: async () => {
            try {
                await getSheet();
            } catch (err) {
                console.error(err);
                process.exit(1);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

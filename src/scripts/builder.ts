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

    // Original code
    // return rows
    //     .map(row => _.fromPairs(row.map((cell, index) => [header[index].value, cell.value])))
    //     .map(object => {
    //         return { ...object, id: object.id ?? getUid(`${key}-${object.name}`) } as MetadataItem;
    //     })
    //     .filter(({ name }) => name !== undefined);

    // TODO: remove this trace code
    let rows2 = rows.map(row => _.fromPairs(row.map((cell, index) => [header[index].value, cell.value])))
        .map(object => {
            return { ...object, id: object.id ?? getUid(`${key}-${object.name}`) } as MetadataItem;
        })
    if (key === "programs") {
        console.log("\u001b[1;31m function extractObjects \u001b[0m\n", rows2);
    }
    return rows2.filter(({ name }) => name !== undefined);
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
    const sheetProgramStages = extractObjects(sheets, "programStages");
    const sheetProgramStageSections = extractObjects(sheets, "programStageSections");

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
            domainType: "AGGREGATE",
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

    // Check that programs populates with 'trackedEntityType' id
    const programs = sheetPrograms.map(program => {
        const trackedEntityType = sheetTrackedEntityTypes
            .find(trackedEntityType => trackedEntityType.name === program.trackedEntityType)?.id;
        // TODO: remove this trace
        console.log("programs.trackedEntityTypes\n", trackedEntityType);
        return { ...program, trackedEntityType };
    });
    // TODO: remove this trace
    console.log("\u001b[1;31m const programs \u001b[0m\n", programs);

    // Original code
    /* const programs = sheetDataSets.map(program => {
        const programStages = sheetProgramStages
            .filter(({ programStages }) => {
                const programStage = sheetProgramStages.find(({ name }) => name === programStages);
                return programStage?.program === program.name;
            })

        return { ...program, programStages };
    }); */

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
        // programs,
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

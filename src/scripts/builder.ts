import fs from "fs";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { D2ApiOptions } from "@eyeseetea/d2-api/api/types";
import { config as dotenvConfig } from "dotenv-flow";
import { google, sheets_v4 } from "googleapis";
import _ from "lodash";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";
import { getUid } from "../utils/uid";

async function main() {
    console.log("Initializing...");
    dotenvConfig(); // fill variable process.env from .env.* files
    const env = process.env; // shortcut

    console.log(`Reading https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID} ...`);
    const { spreadsheets } = google.sheets({ version: "v4", auth: env.GOOGLE_API_KEY });

    const { data } = await spreadsheets.get({ spreadsheetId: env.GOOGLE_SHEET_ID, includeGridData: true });
    const sheets = data.sheets?.map(getSheet) ?? [];

    console.log("Converting to metadata...");
    const metadata = await buildMetadata(sheets);

    console.log("Writing it to out.json ...");
    fs.writeFileSync("out.json", JSON.stringify(metadata, null, 4));

    console.log(`Updating it on server at ${env.DHIS2_BASE_URL} ...`);
    const d2ApiOptions = {
        baseUrl: env.DHIS2_BASE_URL,
        auth: { username: env.DHIS2_USERNAME ?? "", password: env.DHIS2_PASSWORD ?? "" },
    };
    await updateServer(d2ApiOptions, metadata, env.UPDATE_CATEGORY_OPTION_COMBOS === "true");
}

// Return an object with the title of the sheet and a list of items that
// correspond to each row of the data in the given sheet.
//
// The items are objects with a key per column in the sheet, and a generated id
// if they don't contain one already.
//
// Output example: { page: ..., items: [ { id: ..., name: ..., ... }, { ... }, ... ] }
function getSheet(sheet: any): { page: string; items: MetadataItem[] } {
    const page = sheet.properties.title;
    const data = _.flatMap(sheet.data, data =>
        _.map(data.rowData, row => _.flatMap(row.values, cell => cell.formattedValue ?? undefined))
    );

    const header = data[0];
    const rows = data.slice(1);

    return {
        page,
        items: rows
            .map(row => _.fromPairs(row.map((value, index) => [header[index], value])))
            .map(item => ({ ...item, id: item.id ?? getUid(makeSeed(item, page)) } as MetadataItem))
            .filter(({ name }) => name !== undefined),
    };
}

// Return a string that can be used as a seed to generate a uid, corresponding
// to the given item at the given page in the spreadsheet.
function makeSeed(item: MetadataItem, page: string) {
    const seed0 = `${page}-${item.name}`; // the seed will be at least the page and the item's name
    if (page === "options") return `${seed0}-${item.optionSet}`;
    if (page === "programStageSections") return `${seed0}-${item.programStage}-${item.sortOrder}`;
    if (page === "programStageDataElements") return `${seed0}-${item.program}-${item.programStage}`;
    return seed0;
}

// Return an object containing the metadata representation of all the sheets
// that are included in the spreadsheet.
async function buildMetadata(sheets: { page: string; items: MetadataItem[] }[]) {
    const get = (page: string) => sheets.find(s => s.page === page)?.items ?? []; // shortcut

    const sheetDataSets = get("dataSets"),
        sheetDataElements = get("dataElements"),
        sheetDataSetSections = get("sections"),
        sheetCategoryCombos = get("categoryCombos"),
        sheetCategoryOptions = get("categoryOptions"),
        sheetCategories = get("categories"),
        sheetOptionSets = get("optionSets"),
        sheetOptions = get("options"),
        sheetTrackedEntityAttributes = get("trackedEntityAttributes"),
        sheetTrackedEntityTypes = get("trackedEntityTypes"),
        sheetProgramDataElements = get("programDataElements"),
        sheetPrograms = get("programs"),
        sheetProgramStages = get("programStages"),
        sheetProgramStageSections = get("programStageSections");

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

    /** const programs = sheetDataSets.map(program => {
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
        const options = sheetOptions.filter(option => option.optionSet === optionSet.name).map(({ id }) => ({ id }));

        return { ...optionSet, options };
    });

    const categoryOptions = _.uniqBy(sheetCategoryOptions, item => item.id);

    const trackedEntityAttributes: any[] = sheetTrackedEntityAttributes.map(attribute => {
        const optionSet = sheetOptionSets.find(({ name }) => name === attribute.optionSet)?.id;

        return {
            ...attribute,
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
        //programs,
    };
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

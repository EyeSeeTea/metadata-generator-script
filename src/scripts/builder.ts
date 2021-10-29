import { command, run } from "cmd-ts";
import { config } from "dotenv-flow";
import { google, sheets_v4 } from "googleapis";
import _ from "lodash";
import path from "path";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";
import { getUid } from "../utils/uid";

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

    return rows
        .map(row => _.fromPairs(row.map((cell, index) => [header[index].value, cell.value])))
        .map(object => {
            return { ...object, id: object.id ?? getUid(`${key}-${object.name}`) } as MetadataItem;
        })
        .filter(({ name }) => name !== undefined);
}

async function buildDataSets(sheets: Sheet[]) {
    const sheetDataSets = extractObjects(sheets, "dataSets");
    const sheetDataElements = extractObjects(sheets, "dataElements");
    const sheetDataSetSections = extractObjects(sheets, "dataSetSections");
    const sheetCategoryCombos = extractObjects(sheets, "categoryCombos");
    const sheetCategoryOptions = extractObjects(sheets, "categoryOptions");
    const sheetCategories = extractObjects(sheets, "categories");
    const sheetOptionSets = extractObjects(sheets, "optionSets");
    const sheetOptions = extractObjects(sheets, "options");

    const options = _(sheetOptions)
        .map(option => {
            const optionSet = sheetOptionSets.find(({ name }) => name === option.optionSet);

            return { ...option, optionSet: { id: optionSet } };
        })
        .groupBy(({ optionSet }) => optionSet.id)
        .mapValues((option, index) => ({ ...option, sortOrder: index + 1 }))
        .values()
        .value();

    const dataSetSections = _(sheetDataSetSections)
        .map(section => {
            const dataSet = sheetDataSets.find(({ name }) => name === section.dataSet);
            const dataElements = sheetDataElements
                .filter(({ dataSetSection }) => dataSetSection === section.name)
                .map(({ id }) => ({ id }));

            return { ...section, dataSet: { id: dataSet }, dataElements };
        })
        .groupBy(({ dataSet }) => dataSet.id)
        .mapValues(items => items.map((section, index) => ({ ...section, sortOrder: index + 1 })))
        .values()
        .value();

    const dataElements = sheetDataElements.map(dataElement => {
        const categoryCombo =
            sheetCategoryCombos.find(({ id }) => id === dataElement.categoryCombo)?.id ??
            process.env.DEFAULT_CATEGORY_COMBO_ID;

        return { ...dataElement, categoryCombo: { id: categoryCombo } };
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
                    dataSet: dataSet.id,
                    dataElement: id,
                    categoryCombo: categoryComboId,
                };
            });
        return { ...dataSet, dataSetElements };
    });

    const categories = sheetCategories.map(category => {
        const categoryOptions = sheetCategoryOptions
            .filter(({ category }) => category === category.name)
            .map(({ id }) => ({ id }));

        return { ...category, categoryOptions };
    });

    /**const categoryCombos = sheetCategoryCombos.map(categoryCombo => {
        const categories = sheetCategories
            .filter(({ categoryCombo }) => categoryCombo === categoryCombo.name)
            .map(({ id }) => ({ id }));

        return { ...categoryCombo, categories };
    });

    const optionSets = sheetOptionSets.map(optionSet => {
        const options = sheetOptions.filter(({ optionSet }) => optionSet === optionSet.name).map(({ id }) => ({ id }));

        return { ...optionSet, ...options };
    });**/

    return {
        dataSets,
        dataElements,
        options,
        dataSetSections,
        categories,
        categoryCombos: sheetCategoryCombos,
        categoryOptions: sheetCategoryOptions,
        optionSets: sheetOptionSets,
    };
}

async function getSheet() {
    const { data } = await spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, includeGridData: true });
    const sheets = getSheets(data);
    const results = await buildDataSets(sheets);
    const json = JSON.stringify(results, null, 4);

    console.log(json);
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

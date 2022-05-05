import _ from "lodash";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";

// Return an object containing the metadata representation of all the sheets
// that are included in the spreadsheet.
export function buildMetadata(sheets: Sheet[], defaultCC: string) {
    const get = (name: string) => getItems(sheets, name); // shortcut

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
            sheetCategoryCombos.find(({ name }) => name === dataElement.categoryCombo)?.id ?? defaultCC;

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
                const categoryComboId = sheetCategoryCombos.find(({ name }) => name === categoryCombo)?.id ?? defaultCC;

                return {
                    dataSet: { id: dataSet.id },
                    dataElement: { id },
                    categoryCombo: { id: categoryComboId },
                };
            });

        const categoryCombo = sheetCategoryCombos.find(({ name }) => name === dataSet.categoryCombo)?.id ?? defaultCC;

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
        programRules: buildProgramRules(sheets),
        programRuleActions: buildProgramRuleActions(sheets),
        programRuleVariables: buildProgramRuleVariables(sheets),
    };
}

function buildProgramRules(sheets: Sheet[]) {
    const rules = getItems(sheets, "programRules");
    const programs = getItems(sheets, "programs");
    const actions = getItems(sheets, "programRuleActions");

    return rules.map(rule => {
        const program = getByName(programs, rule.program);

        const programRuleActions = actions
            .filter(action => action.programRule === rule.name)
            .map(action => ({ id: action.id }));

        return { ...rule, program: { id: program.id }, programRuleActions };
    });
}

function buildProgramRuleActions(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name); // shortcut

    const actions = get("programRuleActions"),
        rules = get("programRules"),
        elements = get("programDataElements"),
        attrs = get("trackedEntityAttributes"),
        stages = get("programStages"),
        sections = get("programStageSections");

    return actions.map(action => {
        const rule = getByName(rules, action.rule);

        let metadata = { ...action, programRule: { id: rule.id } } as MetadataItem;

        // TODO: check if this part can be done more elegantly.
        if (metadata.dataElement) {
            const element = getByName(elements, action.dataElement);
            metadata = { ...metadata, dataElement: { id: element.id } };
        }
        if (metadata.trackedEntityAttribute) {
            const attr = getByName(attrs, action.trackedEntityAttribute);
            metadata = { ...metadata, trackedEntityAttribute: { id: attr.id } };
        }
        if (metadata.programStage) {
            const stage = getByName(stages, action.programStage);
            metadata = { ...metadata, programStage: { id: stage.id } };
        }
        if (metadata.programStageSection) {
            const section = getByName(sections, action.programStageSection);
            metadata = { ...metadata, programStageSection: { id: section.id } };
        }

        return metadata;
    });
}

function buildProgramRuleVariables(sheets: Sheet[]) {
    const vars = getItems(sheets, "programRuleVariables");
    const programs = getItems(sheets, "programs");
    const elements = getItems(sheets, "programDataElements");

    return vars.map(variable => {
        const program = getByName(programs, variable.program);

        let metadata = { ...variable, program: { id: program.id } } as MetadataItem;

        if (metadata.dataElement) {
            const element = getByName(elements, variable.dataElement);
            metadata = { ...metadata, dataElement: { id: element.id } };
        }

        return metadata;
    });
}

// Return all the items (rows) from the sheet with the given name.
function getItems(sheets: Sheet[], name: string) {
    return sheets.find(s => s.name === name)?.items ?? [];
}

// Return the item from the list that has the given name.
function getByName(items: MetadataItem[], name: string): MetadataItem {
    return items.find(item => item.name === name) ?? {};
}

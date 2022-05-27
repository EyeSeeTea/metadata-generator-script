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

function buildPrograms(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name); // shortcut

    const programs = get("programs");
    const programSectionsData = get("programSections");
    const programStagesData = get("programStages");
    const trackedEntityTypes = get("trackedEntityTypes");
    const categoryCombos = get("categoryCombos");

    return programs.map(program => {
        const trackedEntityType = {
            id: getByName(trackedEntityTypes, program.trackedEntityType)?.id
        };

        const programStages = programStagesData
            .filter((programStages) => {
                return programStages?.program === program.name;
            }).map(({ id }) => ({ id }));

        const categoryCombo = {
            id: getByName(categoryCombos, program.categoryCombo)?.id ?? process.env.DEFAULT_CATEGORY_COMBO_ID
        };

        const programSections = programSectionsData.filter((programSections) => {
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
}

function buildprogramSections(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name); // shortcut

    const programSections = get("programSections");
    const programs = get("programs");
    const trackedEntityAttributesData = get("trackedEntityAttributes");
    const programSectionsTrackedEntityAttributes = get("programSectionsTrackedEntityAttributes")
        .map(programSectionsTrackedEntityAttributes => {
            const programSection = programSections.find(
                programSection => {
                    return programSection.name === programSectionsTrackedEntityAttributes.programSection &&
                        programSection.program === programSectionsTrackedEntityAttributes.program
                }
            )?.id;

            const trackedEntityAttribute = getByName(
                trackedEntityAttributesData,
                programSectionsTrackedEntityAttributes.name
            )?.id;

            return { programSection, trackedEntityAttribute }
        });

    return programSections.map(programSection => {
        const program = {
            id: getByName(programs, programSection.program)?.id
        };

        const sortOrder: number = +programSection.sortOrder;

        const renderType = {
            DESKTOP: { type: programSection.renderTypeDesktop ?? "LISTING" },
            MOBILE: { type: programSection.renderTypeMobile ?? "LISTING" }
        };
        delete programSection.renderTypeDesktop;
        delete programSection.renderTypeMobile;

        const trackedEntityAttributes = programSectionsTrackedEntityAttributes
            .filter((trackedEntityAttributes) => {
                return trackedEntityAttributes?.programSection === programSection?.id;
            }).map(({ trackedEntityAttribute }) => ({ id: trackedEntityAttribute }));

        return { ...programSection, program, sortOrder, renderType, trackedEntityAttributes }
    });
}

function buildProgramStages(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name); // shortcut

    const programStages = get("programStages");
    const programs = get("programs");
    const programStageSectionsData = get("programStageSections");
    const programStageDataElementsData = get("programStageDataElements");
    const dataElements = get("dataElements");

    return programStages.map(programStage => {
        const program = getByName(programs, programStage.program)

        const trackedEntityType = {
            id: program?.id
        };

        const enableUserAssignment: boolean = programStage.enableUserAssignment.toLowerCase() === 'true';

        const programStageSections = programStageSectionsData.filter((programStageSections) => {
            return programStageSections?.programStage === programStage.name;
        }).map(({ id }) => ({ id }));

        const repeatable: boolean = programStage.repeatable.toLowerCase() === 'true';

        const programStageDataElements = programStageDataElementsData.filter((programStageDataElements) => {
            return programStageDataElements?.program === program?.name &&
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
                    id: dataElements.find(dataElement => dataElement.name === name)?.id
                },
            }));

        return {
            ...programStage, enableUserAssignment, repeatable, program,
            programStageDataElements, programStageSections
        }
    });
}

function buildProgramStageSections(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name); // shortcut

    const programStageSections = get("programStageSections");
    const programStages = get("programStages");
    const programStageSectionsDataElementsData = get("programStageSectionsDataElements");
    const dataElementsData = get("dataElements");

    return programStageSections.map(programStageSection => {
        const programStage = {
            id: getByName(programStages, programStageSection.programStage)?.id
        };

        const sortOrder: number = +programStageSection.sortOrder;

        const renderType = {
            DESKTOP: { type: programStageSection.renderTypeDesktop ?? "LISTING" },
            MOBILE: { type: programStageSection.renderTypeMobile ?? "LISTING" }
        };
        delete programStageSection.renderTypeDesktop;
        delete programStageSection.renderTypeMobile;

        const programStageSectionsDataElements = programStageSectionsDataElementsData
            .map(PSSDataElements => {
                const programStageSection = programStageSections.find(
                    programStageSection => {
                        return programStageSection.name === PSSDataElements.programStageSection &&
                            programStageSection.programStage === PSSDataElements.programStage &&
                            programStageSection.program === PSSDataElements.program
                    }
                )?.id;

                const dataElement = dataElementsData.find(
                    dataElement => dataElement.name === PSSDataElements.name
                )?.id;

                return { programStageSection, dataElement }
            });

        const dataElements = programStageSectionsDataElements.filter((dataElements) => {
            return dataElements?.programStageSection === programStageSection?.id;
        }).map(({ dataElement }) => ({ id: dataElement }));

        return { ...programStageSection, programStage, sortOrder, renderType, dataElements }
    });
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
        let data = { ...action } as MetadataItem; // copy that we will modify

        replaceById(data, "programRule", rules);
        replaceById(data, "dataElement", elements);
        replaceById(data, "trackedEntityAttribute", attrs);
        replaceById(data, "programStage", stages);
        replaceById(data, "programStageSection", sections);

        return data;
    });
}

function buildProgramRuleVariables(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name); // shortcut

    const vars = get("programRuleVariables"),
        programs = get("programs"),
        elements = get("programDataElements"),
        attrs = get("trackedEntityAttributes"),
        stages = get("programStages");

    return vars.map(variable => {
        let data = { ...variable } as MetadataItem; // copy that we will modify

        replaceById(data, "program", programs);
        replaceById(data, "dataElement", elements);
        replaceById(data, "trackedEntityAttribute", attrs);
        replaceById(data, "programStage", stages);

        return data;
    });
}

// Return all the items (rows) from the sheet with the given name.
function getItems(sheets: Sheet[], name: string) {
    return sheets.find(sheet => sheet.name === name)?.items ?? [];
}

// Return the item from the list that has the given name.
function getByName(items: MetadataItem[], name: string): MetadataItem {
    return items.find(item => item.name === name) ?? {};
}

// Modify data[key], so instead of data[key]=name, it becomes data[key]={id: id}
// with the id of the item in items that had that name.
function replaceById(data: MetadataItem, key: string, items: MetadataItem[]) {
    if (key in data) {
        const name = data[key];
        const item = getByName(items, name);
        data[key] = { id: item.id };
    }
}

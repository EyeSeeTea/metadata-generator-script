import _ from "lodash";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";

type localeKey =
    | "Afrikaans"
    | "Amharic"
    | "Arabic"
    | "Bislama"
    | "Burmese"
    | "Chinese"
    | "Dutch"
    | "Dzongkha"
    | "English"
    | "French"
    | "German"
    | "Gujarati"
    | "Hindi"
    | "Indonesian"
    | "Italian"
    | "Khmer"
    | "Kinyarwanda"
    | "Lao"
    | "Nepali"
    | "Norwegian"
    | "Persian"
    | "Portuguese"
    | "Pushto"
    | "Russian"
    | "Spanish"
    | "Swahili"
    | "Tajik"
    | "Vietnamese"
    | "default";

// Return an object containing the metadata representation of all the sheets
// that are included in the spreadsheet.
export function buildMetadata(sheets: Sheet[], defaultCC: string) {
    const get = (name: string) => getItems(sheets, name); // shortcut

    const sheetDataSets = get("dataSets"),
        sheetDataElements = get("dataElements"),
        sheetDataSetSections = get("sections"),
        sheetSectionDataElements = get("sectionDataElements"),
        sheetCategoryCombos = get("categoryCombos"),
        sheetCategoryOptions = get("categoryOptions"),
        sheetCategories = get("categories"),
        sheetOptionSets = get("optionSets"),
        sheetOptions = get("options");

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
            const dataElements = sheetSectionDataElements
                .filter(item => item.section === section.name && item.dataSet === section.dataSet)
                .map(({ name }) => ({ id: getByName(sheetDataElements, name).id }));

            const translations = processTranslations(sheets, section.name, "section");

            return { ...section, dataSet: { id: dataSet }, dataElements, translations };
        })
        .groupBy(({ dataSet }) => dataSet.id)
        .mapValues(items => items.map((section, index) => ({ ...section, sortOrder: index + 1 })))
        .values()
        .flatten()
        .value();

    const categories = sheetCategories.map(category => {
        const categoryOptions = sheetCategoryOptions
            .filter(option => option.category === category.name)
            .map(({ id }) => ({ id }));

        const translations = processTranslations(sheets, category.name, "category");

        return { ...category, categoryOptions, translations };
    });

    const categoryCombos = sheetCategoryCombos.map(categoryCombo => {
        const categories = sheetCategories
            .filter(category => category.categoryCombo === categoryCombo?.name)
            .map(({ id }) => ({ id }));

        const translations = processTranslations(sheets, categoryCombo.name, "categoryCombo");

        return { ...categoryCombo, categories, translations };
    });

    const optionSets = sheetOptionSets.map(optionSet => {
        const options = sheetOptions.filter(option => option.optionSet === optionSet.name).map(({ id }) => ({ id }));

        const translations = processTranslations(sheets, optionSet.name, "optionSet");

        return { ...optionSet, options, translations };
    });

    const categoryOptions = _.uniqBy(sheetCategoryOptions, item => item.id).map(categoryOption => {
        const translations = processTranslations(sheets, categoryOption.name, "categoryOption");

        return { ...categoryOption, translations };
    });

    return {
        dataSets: buildDataSets(sheets),
        dataElements: buildDataElements(sheets),
        dataElementGroups: buildDataElementGroups(sheets),
        dataElementGroupSets: buildDataElementGroupSets(sheets),
        options,
        sections,
        categories,
        categoryCombos,
        categoryOptions,
        optionSets,
        trackedEntityAttributes: buildTrackedEntityAttributes(sheets),
        trackedEntityTypes: buildTrackedEntityTypes(sheets),
        programSections: buildprogramSections(sheets),
        programs: buildPrograms(sheets),
        programStages: buildProgramStages(sheets),
        programStageSections: buildProgramStageSections(sheets),
        programRules: buildProgramRules(sheets),
        programRuleActions: buildProgramRuleActions(sheets),
        programRuleVariables: buildProgramRuleVariables(sheets),
        legendSets: buildLegendSets(sheets),
        attributes: buildAttributes(sheets),
    };
}

function buildDataSets(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const dataSets = get("dataSets");
    const dataElements = get("dataElements");
    const dataSetElements = get("dataSetElements");
    const dataSetInputPeriods = get("dataSetInputPeriods");
    const dataSetSections = get("sections");
    const categoryCombos = get("categoryCombos");

    return dataSets.map(dataSet => {
        let data: MetadataItem = JSON.parse(JSON.stringify(dataSet));

        data.dataSetElements = dataSetElements
            .filter(dseToFilter => {
                return dseToFilter.dataSet === data.name;
            })
            .map(elements => {
                return {
                    dataSet: { id: data.id },
                    dataElement: { id: getByName(dataElements, elements.name).id },
                    categoryCombo: elements.categoryCombo
                        ? { id: getByName(categoryCombos, elements.categoryCombo).id }
                        : undefined,
                };
            });

        data.sections = dataSetSections
            .filter(dssToFilter => {
                return dssToFilter.dataSet === data.name;
            })
            .map(section => {
                return { id: section.id };
            });

        data.dataInputPeriods = dataSetInputPeriods
            .filter(dsipToFilter => {
                return dsipToFilter.name === data.name;
            })
            .map(inputPeriod => {
                return {
                    period: { id: inputPeriod.period },
                    openingDate: inputPeriod.openingDate,
                    closingDate: inputPeriod.closingDate,
                };
            });

        data.legendSets = processItemLegendSets(sheets, data.name, "dataSet");
        data.translations = processTranslations(sheets, data.name, "dataSet");
        data.attributeValues = processItemAttributes(sheets, data, "dataSet");

        replaceById(data, "categoryCombo", categoryCombos);

        data.workflow = data.workflow ? { id: data.workflow } : undefined;

        return { ...data };
    });
}

function buildDataElementsType(sheets: Sheet[], deType: "dataElements" | "programDataElements") {
    const get = (name: string) => getItems(sheets, name);

    const dataElements = get(deType);
    const categoryCombos = get("categoryCombos");
    const optionSets = get("optionSets");

    return dataElements.map(dataElement => {
        let data: MetadataItem = JSON.parse(JSON.stringify(dataElement));

        const domainType = deType === "dataElements" ? "AGGREGATE" : "TRACKER";

        const categoryCombo = getByName(categoryCombos, data.categoryCombo)?.id;
        const optionSet = getByName(optionSets, data.optionSet)?.id;
        const commentOptionSet = getByName(optionSets, data.commentOptionSet)?.id;

        const translations = processTranslations(sheets, data.name, "dataElement");
        const attributeValues = processItemAttributes(sheets, data, "dataElement");
        const legendSets = processItemLegendSets(sheets, data.name, "dataElement");

        return {
            ...data,
            categoryCombo: categoryCombo ? { id: categoryCombo } : undefined,
            optionSet: optionSet ? { id: optionSet } : undefined,
            commentOptionSet: commentOptionSet ? { id: commentOptionSet } : undefined,
            domainType: domainType,
            translations: translations,
            attributeValues: attributeValues,
            legendSets: legendSets,
        };
    });
}

function buildDataElements(sheets: Sheet[]) {
    return [...buildDataElementsType(sheets, "dataElements"), ...buildDataElementsType(sheets, "programDataElements")];
}

function buildDataElementGroups(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const dataElementGroups = get("dataElementGroups");
    const dataElementGroupElements = get("dataElementGroupElements");
    const dataElements = get("dataElements");

    return dataElementGroups.map(degGroup => {
        let data: MetadataItem = JSON.parse(JSON.stringify(degGroup));

        data.dataElements = dataElementGroupElements
            .filter(degeToFilter => {
                return degeToFilter.dataElementGroup === data.name;
            })
            .map(elements => {
                return {
                    id: getByName(dataElements, elements.name).id,
                };
            });

        data.translations = processTranslations(sheets, data.name, "dataElementGroup");

        return { ...data };
    });
}

function buildDataElementGroupSets(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const dataElementGroupSets = get("dataElementGroupSets");
    const dataElementGroupSetGroups = get("dataElementGroupSetGroups");
    const dataElementGroups = get("dataElementGroups");

    return dataElementGroupSets.map(degsGroup => {
        let data: MetadataItem = JSON.parse(JSON.stringify(degsGroup));

        data.dataElementGroups = dataElementGroupSetGroups
            .filter(degsgToFilter => {
                return degsgToFilter.dataElementGroupSet === data.name;
            })
            .map(groups => {
                return {
                    id: getByName(dataElementGroups, groups.name).id,
                };
            });

        data.translations = processTranslations(sheets, data.name, "dataElementGroupSet");

        return { ...data };
    });
}

function buildAttributes(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const attributes = get("attributes");
    const optionSets = get("optionSets");

    return attributes.map(attribute => {
        let data: MetadataItem = JSON.parse(JSON.stringify(attribute));

        const optionSetId = optionSets.find(osToFilter => {
            return osToFilter.name === data.optionSet;
        })?.id;
        const optionSet = optionSetId
            ? {
                  id: optionSetId,
              }
            : undefined;

        data.translation = processTranslations(sheets, data.name, "attribute");

        return { ...data, optionSet };
    });
}

function buildPrograms(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const programs = get("programs");
    const pSections = get("programSections");
    const pStages = get("programStages");
    const trackedEntityTypes = get("trackedEntityTypes");
    const categoryCombos = get("categoryCombos");
    const programTeas = get("programTrackedEntityAttributes");
    const trackedEntityAttributes = get("trackedEntityAttributes");

    return programs.map(program => {
        let data = { ...program } as MetadataItem;

        const trackedEntityType = {
            id: getByName(trackedEntityTypes, program.trackedEntityType)?.id,
        };

        const programStages = pStages
            .filter(pStageToFilter => {
                return pStageToFilter.program === program.name;
            })
            .map(programStage => ({ id: programStage.id }));

        replaceById(data, "categoryCombo", categoryCombos);

        data.translations = processTranslations(sheets, data.name, "program");

        if (trackedEntityType.id) {
            // WITH_REGISTRATION == Tracker Program
            const programType = "WITH_REGISTRATION";

            replaceById(data, "relatedProgram", programs);

            // Event Program Stages belong to programStageSections
            const programSections = pSections
                .filter(pSectionToFilter => {
                    return pSectionToFilter?.program === program.name;
                })
                .map(programSection => ({ id: programSection.id }));

            const programTrackedEntityAttributes = programTeas
                .filter(pTeasToFilter => {
                    return pTeasToFilter.program === program.name;
                })
                .map(pTea => buildProgTEA(program, pTea, trackedEntityAttributes));
            addSortOrder(programTrackedEntityAttributes);

            return {
                ...data,
                programType,
                trackedEntityType,
                programStages,
                programSections,
                programTrackedEntityAttributes,
            };
        } else {
            // WITHOUT_REGISTRATION == Event Program
            const programType = "WITHOUT_REGISTRATION";
            return { ...data, programType, programStages };
        }
    });
}

function buildprogramSections(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const programSections = _.cloneDeep(get("programSections"));
    const programs = get("programs");
    const teAttributes = get("trackedEntityAttributes");

    const sectionsAttributes = get("programSectionsTrackedEntityAttributes").map(psTrackedEntityAttribute => {
        const programSection = programSections.find(pSectionToFind => {
            return (
                pSectionToFind.name === psTrackedEntityAttribute.programSection &&
                pSectionToFind.program === psTrackedEntityAttribute.program
            );
        })?.id;

        const trackedEntityAttribute = getByName(teAttributes, psTrackedEntityAttribute.name)?.id;

        return { programSection, trackedEntityAttribute };
    });

    return programSections.map(programSection => {
        if (programSection.sortOrder === undefined) {
            addSortOrder(
                programSections.filter(pSectionToFilter => {
                    return pSectionToFilter.program === programSection.program;
                })
            );
        }

        replaceById(programSection, "program", programs);

        const renderType = addRenderType(programSection, "LISTING");

        const trackedEntityAttributes = sectionsAttributes
            .filter(sectionsAttributeToFilter => {
                return sectionsAttributeToFilter?.programSection === programSection.id;
            })
            .map(sectionsAttribute => ({ id: sectionsAttribute.trackedEntityAttribute }));

        return { ...programSection, renderType, trackedEntityAttributes };
    });
}

function buildProgramStages(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const programStages = get("programStages");
    const programs = get("programs");
    const psSections = get("programStageSections");
    const psDataElements = get("programStageDataElements");
    const programDataElements = get("programDataElements");

    return programStages.map(programStage => {
        const programStageSections = psSections
            .filter(psSectionToFilter => {
                return (
                    psSectionToFilter?.programStage === programStage.name &&
                    psSectionToFilter?.program === programStage.program
                );
            })
            .map(psSection => ({ id: psSection.id }));

        const programStageDataElements = psDataElements
            .filter(psDataElementToFilter => {
                return (
                    psDataElementToFilter?.program === programStage.program &&
                    psDataElementToFilter?.programStage === programStage.name
                );
            })
            .map((data, index) => ({
                id: data.id,
                programStage: {
                    id: programStage.id,
                },
                sortOrder: index,
                compulsory: data.compulsory,
                allowProvidedElsewhere: data.allowProvidedElsewhere,
                displayInReports: data.displayInReports,
                allowFutureDate: data.allowFutureDate,
                skipSynchronization: data.skipSynchronization,
                renderType: addRenderType(data, "DEFAULT"),
                dataElement: {
                    id: getByName(programDataElements, data.name)?.id,
                },
            }));

        replaceById(programStage, "program", programs);

        const translations = processTranslations(sheets, programStage.name, "programStage");

        return { ...programStage, programStageDataElements, programStageSections, translations };
    });
}

function buildProgramStageSections(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const programStageSections = _.cloneDeep(get("programStageSections"));
    const programStages = get("programStages");
    const pssDataElements = get("programStageSectionsDataElements");
    const programDataElements = get("programDataElements");

    const programStageSectionsDataElements = pssDataElements.map(pssDataElement => {
        const programStageSectionId = programStageSections.find(psSectionToFind => {
            return (
                psSectionToFind.name === pssDataElement.programStageSection &&
                psSectionToFind.programStage === pssDataElement.programStage &&
                psSectionToFind.program === pssDataElement.program
            );
        })?.id;

        const dataElementId = getByName(programDataElements, pssDataElement.name)?.id;

        return { programStageSectionId, dataElementId };
    });

    return programStageSections.map(programStageSection => {
        if (typeof programStageSection.sortOrder === "undefined") {
            addSortOrder(
                programStageSections.filter(psSectionToFilter => {
                    return (
                        psSectionToFilter.program === programStageSection.program &&
                        psSectionToFilter.programStage === programStageSection.programStage
                    );
                })
            );
        }

        replaceById(programStageSection, "programStage", programStages);

        const renderType = addRenderType(programStageSection, "LISTING");

        const dataElements = programStageSectionsDataElements
            .filter(pssDataElementToFilter => {
                return pssDataElementToFilter?.programStageSectionId === programStageSection?.id;
            })
            .map(pssDataElement => ({ id: pssDataElement.dataElementId }));

        delete programStageSection.program;

        return { ...programStageSection, renderType, dataElements };
    });
}

function buildProgTEA(program: MetadataItem, pTea: MetadataItem, trackedEntityAttributes: MetadataItem[]) {
    const tea = getByName(trackedEntityAttributes, pTea.name);
    return {
        id: pTea.id,
        program: { id: program.id },
        displayName: `${program.name} ${pTea.name}`,
        valueType: pTea.valueType,
        displayInList: pTea.displayInList,
        mandatory: pTea.mandatory,
        allowFutureDate: pTea.allowFutureDate,
        searchable: pTea.searchable,
        renderType: addRenderType(pTea, "DEFAULT"),
        trackedEntityAttribute: {
            id: tea.id,
            displayName: tea.name,
            valueType: tea.valueType,
            unique: tea?.unique,
        },
    };
}

function buildLegendSets(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const legendSets = get("legendSets");
    const legendsArray = get("legends");

    return legendSets.map(legendSet => {
        const legends = legendsArray
            .filter(legendToFilter => {
                return legendToFilter.legendSet === legendSet.name;
            })
            .map(legend => ({
                id: legend.id,
                name: legend.name,
                startValue: legend.startValue,
                endValue: legend.endValue,
            }));

        return { ...legendSet, legends };
    });
}

function buildTrackedEntityAttributes(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const trackedEntityAttributes = get("trackedEntityAttributes");
    const optionSets = get("optionSets");

    return trackedEntityAttributes.map(trackedEntityAttribute => {
        let data = { ...trackedEntityAttribute } as MetadataItem;

        replaceById(data, "optionSet", optionSets);

        const legendSets = processItemLegendSets(sheets, data.name, "trackedEntityAttribute");

        const translations = processTranslations(sheets, trackedEntityAttribute.name, "trackedEntityAttribute");

        return { ...data, legendSets, translations };
    });
}

function buildTrackedEntityTypes(sheets: Sheet[]) {
    const get = (name: string) => getItems(sheets, name);

    const trackedEntityTypes = get("trackedEntityTypes");
    const trackedEntityAttributes = get("trackedEntityAttributes");
    const teaAttributes = get("trackedEntityTypeAttributes");
    const optionSets = get("optionSets");

    return trackedEntityTypes.map(trackedEntityType => {
        let data = { ...trackedEntityType } as MetadataItem;

        const trackedEntityTypeAttributes = teaAttributes
            .filter(teaAttributeToFilter => {
                return teaAttributeToFilter.trackedEntityType === trackedEntityType.name;
            })
            .map(trackedEntityTypeAttribute => {
                const displayName = trackedEntityTypeAttribute.name;
                const trackedEntityAttribute = getByName(trackedEntityAttributes, displayName);
                const optionSetId = getByName(optionSets, trackedEntityAttribute.optionSet)?.id;

                return {
                    displayName,
                    text: displayName,
                    value: trackedEntityAttribute.id,
                    valueType: trackedEntityAttribute.valueType,
                    unique: trackedEntityAttribute?.unique,
                    displayInList: trackedEntityTypeAttribute.displayInList,
                    mandatory: trackedEntityTypeAttribute.mandatory,
                    searchable: trackedEntityTypeAttribute.searchable,
                    optionSet: optionSetId
                        ? {
                              id: optionSetId,
                          }
                        : undefined,
                    trackedEntityAttribute: {
                        id: trackedEntityAttribute.id,
                    },
                };
            });

        const translations = processTranslations(sheets, trackedEntityType.name, "trackedEntityType");

        return { ...data, trackedEntityTypeAttributes, translations };
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

        const translations = processTranslations(sheets, rule.name, "programRule");

        return { ...rule, program: { id: program.id }, programRuleActions, translations };
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

        data.translations = processTranslations(sheets, variable.name, "programRuleVariable");

        return data;
    });
}

// UTILS
const localeDictionary = {
    Afrikaans: "af",
    Amharic: "am",
    Arabic: "ar",
    Bislama: "bi",
    Burmese: "my",
    Chinese: "zh",
    Dutch: "nl",
    Dzongkha: "dz",
    English: "en",
    French: "fr",
    German: "de",
    Gujarati: "gu",
    Hindi: "hi",
    Indonesian: "in",
    Italian: "it",
    Khmer: "km",
    Kinyarwanda: "rw",
    Lao: "lo",
    Nepali: "ne",
    Norwegian: "no",
    Persian: "fa",
    Portuguese: "pt",
    Pushto: "ps",
    Russian: "ru",
    Spanish: "es",
    Swahili: "sw",
    Tajik: "tg",
    Vietnamese: "vi",
    default: undefined,
};

function processTranslations(sheets: Sheet[], parentDataName: string, metadataType: string) {
    const get = (name: string) => getItems(sheets, name);
    const translations = get(`${metadataType}Translations`);

    return translations
        .filter(translationsToFilter => {
            return translationsToFilter[metadataType] === parentDataName;
        })
        .map(translation => {
            const localeKey: localeKey = translation.locale ?? "default";
            const locale: string | undefined = localeDictionary[localeKey];

            return locale
                ? {
                      property: translation.name,
                      locale: locale,
                      value: translation.value,
                  }
                : {};
        });
}

function processItemAttributes(sheets: Sheet[], parentData: MetadataItem, metadataType: string) {
    const get = (name: string) => getItems(sheets, name);
    const attributes = get("attributes");

    return attributes
        .filter(attribute => {
            return attribute[`${metadataType}Attribute`] === "TRUE";
        })
        .flatMap(atribute => {
            const value = parentData[atribute.name];
            delete parentData[atribute.name];

            return value
                ? {
                      value: value,
                      attribute: {
                          id: atribute.id,
                          name: atribute.name,
                      },
                  }
                : [];
        });
}

function processItemLegendSets(sheets: Sheet[], parentDataName: string, metadataType: string) {
    const get = (name: string) => getItems(sheets, name);

    const legendSets = get("legendSets");
    const itemLegends = get(`${metadataType}Legends`);

    return itemLegends
        .filter(itemLegendToFilter => {
            return itemLegendToFilter[metadataType] === parentDataName;
        })
        .map(legend => {
            const legendId = getByName(legendSets, legend.name)?.id;

            return { id: legendId };
        });
}

// Add sortOrder to filteredMetadataItems, these items belong to the same 'group'.
// The idea is to use metadataItems.filter(filterFunction) as filteredMetadataItems.
function addSortOrder(filteredMetadataItems: MetadataItem[]) {
    filteredMetadataItems.forEach((item, index) => {
        item.sortOrder = index;
    });
}

// Adds renderType to a metadata object with a default fallback value
function addRenderType(metadataItem: MetadataItem, defaultValue: string) {
    const renderType = {
        DESKTOP: { type: metadataItem.renderTypeDesktop ?? defaultValue },
        MOBILE: { type: metadataItem.renderTypeMobile ?? defaultValue },
    };
    delete metadataItem.renderTypeDesktop;
    delete metadataItem.renderTypeMobile;

    return renderType;
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

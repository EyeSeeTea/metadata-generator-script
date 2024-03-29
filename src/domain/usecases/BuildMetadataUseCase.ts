import { MetadataOutput } from "domain/entities/MetadataOutput";
import { SheetsRepository } from "domain/repositories/SheetsRepository";
import _ from "lodash";
import { MetadataItem } from "domain/entities/MetadataItem";
import { Sheet } from "domain/entities/Sheet";
import { getItems } from "utils/utils";

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

export class BuildMetadataUseCase {
    constructor(private sheetsRepository: SheetsRepository) {}

    async execute(sheetId: string): Promise<MetadataOutput> {
        const sheets = await this.sheetsRepository.getSpreadsheet(sheetId);

        return this.buildMetadata(sheets);
    }

    // Return an object containing the metadata representation of all the sheets
    // that are included in the spreadsheet.
    private buildMetadata(sheets: Sheet[]): MetadataOutput {
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
                this.addSharingSetting(optionSet);

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
                    .map(({ name }) => ({ id: this.getByName(sheetDataElements, name).id }));

                const translations = this.processTranslations(sheets, section.name, "section");
                this.addSharingSetting(section);

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

            const translations = this.processTranslations(sheets, category.name, "category");
            this.addSharingSetting(category);

            return { ...category, categoryOptions, translations };
        });

        const categoryCombos = sheetCategoryCombos.map(categoryCombo => {
            const categories = sheetCategories
                .filter(category => category.categoryCombo === categoryCombo?.name)
                .map(({ id }) => ({ id }));

            this.addSharingSetting(categoryCombo);
            const translations = this.processTranslations(sheets, categoryCombo.name, "categoryCombo");

            return { ...categoryCombo, categories, translations };
        });

        const optionSets = sheetOptionSets.map(optionSet => {
            const options = sheetOptions
                .filter(option => option.optionSet === optionSet.name)
                .map(({ id }) => ({ id }));

            this.addSharingSetting(optionSet);
            const translations = this.processTranslations(sheets, optionSet.name, "optionSet");

            return { ...optionSet, options, translations };
        });

        const categoryOptions = _.uniqBy(sheetCategoryOptions, item => item.id).map(categoryOption => {
            this.addSharingSetting(categoryOption);
            const translations = this.processTranslations(sheets, categoryOption.name, "categoryOption");

            return { ...categoryOption, translations };
        });

        return {
            dataSets: this.buildDataSets(sheets),
            dataElements: this.buildDataElements(sheets),
            dataElementGroups: this.buildDataElementGroups(sheets),
            dataElementGroupSets: this.buildDataElementGroupSets(sheets),
            options,
            sections,
            categories,
            categoryCombos,
            categoryOptions,
            optionSets,
            trackedEntityAttributes: this.buildTrackedEntityAttributes(sheets),
            trackedEntityTypes: this.buildTrackedEntityTypes(sheets),
            programSections: this.buildprogramSections(sheets),
            programs: this.buildPrograms(sheets),
            programStages: this.buildProgramStages(sheets),
            programStageSections: this.buildProgramStageSections(sheets),
            programRules: this.buildProgramRules(sheets),
            programRuleActions: this.buildProgramRuleActions(sheets),
            programRuleVariables: this.buildProgramRuleVariables(sheets),
            legendSets: this.buildLegendSets(sheets),
            attributes: this.buildAttributes(sheets),
        };
    }

    private buildDataSets(sheets: Sheet[]) {
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
                        dataElement: { id: this.getByName(dataElements, elements.name).id },
                        categoryCombo: elements.categoryCombo
                            ? { id: this.getByName(categoryCombos, elements.categoryCombo).id }
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

            data.legendSets = this.processItemLegendSets(sheets, data.name, "dataSet");
            data.translations = this.processTranslations(sheets, data.name, "dataSet");
            data.attributeValues = this.processItemAttributes(sheets, data, "dataSet");

            this.replaceById(data, "categoryCombo", categoryCombos);
            this.addSharingSetting(data);

            data.workflow = data.workflow ? { id: data.workflow } : undefined;

            return { ...data };
        });
    }

    private buildDataElementsType(sheets: Sheet[], deType: "dataElements" | "programDataElements") {
        const get = (name: string) => getItems(sheets, name);

        const dataElements = get(deType);
        const categoryCombos = get("categoryCombos");
        const optionSets = get("optionSets");

        return dataElements.map(dataElement => {
            let data: MetadataItem = JSON.parse(JSON.stringify(dataElement));

            const domainType = deType === "dataElements" ? "AGGREGATE" : "TRACKER";

            const categoryCombo = this.getByName(categoryCombos, data.categoryCombo)?.id;
            const optionSet = this.getByName(optionSets, data.optionSet)?.id;
            const commentOptionSet = this.getByName(optionSets, data.commentOptionSet)?.id;

            const translations = this.processTranslations(sheets, data.name, "dataElement");
            const attributeValues = this.processItemAttributes(sheets, data, "dataElement");
            const legendSets = this.processItemLegendSets(sheets, data.name, "dataElement");

            this.addSharingSetting(data);

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

    private buildDataElements(sheets: Sheet[]) {
        return [
            ...this.buildDataElementsType(sheets, "dataElements"),
            ...this.buildDataElementsType(sheets, "programDataElements"),
        ];
    }

    private buildDataElementGroups(sheets: Sheet[]) {
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
                        id: this.getByName(dataElements, elements.name).id,
                    };
                });

            this.addSharingSetting(data);
            data.translations = this.processTranslations(sheets, data.name, "dataElementGroup");

            return { ...data };
        });
    }

    private buildDataElementGroupSets(sheets: Sheet[]) {
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
                        id: this.getByName(dataElementGroups, groups.name).id,
                    };
                });

            this.addSharingSetting(data);
            data.translations = this.processTranslations(sheets, data.name, "dataElementGroupSet");

            return { ...data };
        });
    }

    private buildAttributes(sheets: Sheet[]) {
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

            this.addSharingSetting(data);
            data.translation = this.processTranslations(sheets, data.name, "attribute");

            return { ...data, optionSet };
        });
    }

    private buildPrograms(sheets: Sheet[]) {
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
                id: this.getByName(trackedEntityTypes, program.trackedEntityType)?.id,
            };

            const programStages = pStages
                .filter(pStageToFilter => {
                    return pStageToFilter.program === program.name;
                })
                .map(programStage => ({ id: programStage.id }));

            this.replaceById(data, "categoryCombo", categoryCombos);

            this.addSharingSetting(data);
            data.translations = this.processTranslations(sheets, data.name, "program");

            if (trackedEntityType.id) {
                // WITH_REGISTRATION == Tracker Program
                const programType = "WITH_REGISTRATION";

                this.replaceById(data, "relatedProgram", programs);

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
                    .map(pTea => this.buildProgTEA(program, pTea, trackedEntityAttributes));
                this.addSortOrder(programTrackedEntityAttributes);

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

    private buildprogramSections(sheets: Sheet[]) {
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

            const trackedEntityAttribute = this.getByName(teAttributes, psTrackedEntityAttribute.name)?.id;

            return { programSection, trackedEntityAttribute };
        });

        return programSections.map(programSection => {
            if (programSection.sortOrder === undefined) {
                this.addSortOrder(
                    programSections.filter(pSectionToFilter => {
                        return pSectionToFilter.program === programSection.program;
                    })
                );
            }

            this.replaceById(programSection, "program", programs);

            const renderType = this.addRenderType(programSection, "LISTING");
            this.addSharingSetting(programSection);

            const trackedEntityAttributes = sectionsAttributes
                .filter(sectionsAttributeToFilter => {
                    return sectionsAttributeToFilter?.programSection === programSection.id;
                })
                .map(sectionsAttribute => ({ id: sectionsAttribute.trackedEntityAttribute }));

            return { ...programSection, renderType, trackedEntityAttributes };
        });
    }

    private buildProgramStages(sheets: Sheet[]) {
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
                    renderType: this.addRenderType(data, "DEFAULT"),
                    dataElement: {
                        id: this.getByName(programDataElements, data.name)?.id,
                    },
                }));

            this.replaceById(programStage, "program", programs);

            this.addSharingSetting(programStage);
            const translations = this.processTranslations(sheets, programStage.name, "programStage");

            return { ...programStage, programStageDataElements, programStageSections, translations };
        });
    }

    private buildProgramStageSections(sheets: Sheet[]) {
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

            const dataElementId = this.getByName(programDataElements, pssDataElement.name)?.id;

            return { programStageSectionId, dataElementId };
        });

        return programStageSections.map(programStageSection => {
            if (typeof programStageSection.sortOrder === "undefined") {
                this.addSortOrder(
                    programStageSections.filter(psSectionToFilter => {
                        return (
                            psSectionToFilter.program === programStageSection.program &&
                            psSectionToFilter.programStage === programStageSection.programStage
                        );
                    })
                );
            }

            this.replaceById(programStageSection, "programStage", programStages);
            this.addSharingSetting(programStageSection);

            const renderType = this.addRenderType(programStageSection, "LISTING");

            const dataElements = programStageSectionsDataElements
                .filter(pssDataElementToFilter => {
                    return pssDataElementToFilter?.programStageSectionId === programStageSection?.id;
                })
                .map(pssDataElement => ({ id: pssDataElement.dataElementId }));

            delete programStageSection.program;

            return { ...programStageSection, renderType, dataElements };
        });
    }

    private buildProgTEA(program: MetadataItem, pTea: MetadataItem, trackedEntityAttributes: MetadataItem[]) {
        const tea = this.getByName(trackedEntityAttributes, pTea.name);
        return {
            id: pTea.id,
            program: { id: program.id },
            displayName: `${program.name} ${pTea.name}`,
            valueType: pTea.valueType,
            displayInList: pTea.displayInList,
            mandatory: pTea.mandatory,
            allowFutureDate: pTea.allowFutureDate,
            searchable: pTea.searchable,
            renderType: this.addRenderType(pTea, "DEFAULT"),
            trackedEntityAttribute: {
                id: tea.id,
                displayName: tea.name,
                valueType: tea.valueType,
                unique: tea?.unique,
            },
        };
    }

    private buildLegendSets(sheets: Sheet[]) {
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

    private buildTrackedEntityAttributes(sheets: Sheet[]) {
        const get = (name: string) => getItems(sheets, name);

        const trackedEntityAttributes = get("trackedEntityAttributes");
        const optionSets = get("optionSets");

        return trackedEntityAttributes.map(trackedEntityAttribute => {
            let data = { ...trackedEntityAttribute } as MetadataItem;

            this.replaceById(data, "optionSet", optionSets);

            const legendSets = this.processItemLegendSets(sheets, data.name, "trackedEntityAttribute");

            const translations = this.processTranslations(
                sheets,
                trackedEntityAttribute.name,
                "trackedEntityAttribute"
            );

            return { ...data, legendSets, translations };
        });
    }

    private buildTrackedEntityTypes(sheets: Sheet[]) {
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
                    const trackedEntityAttribute = this.getByName(trackedEntityAttributes, displayName);
                    const optionSetId = this.getByName(optionSets, trackedEntityAttribute.optionSet)?.id;

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

            this.addSharingSetting(data);
            const translations = this.processTranslations(sheets, trackedEntityType.name, "trackedEntityType");

            return { ...data, trackedEntityTypeAttributes, translations };
        });
    }

    private buildProgramRules(sheets: Sheet[]) {
        const rules = getItems(sheets, "programRules");
        const programs = getItems(sheets, "programs");
        const actions = getItems(sheets, "programRuleActions");

        return rules.map(rule => {
            const program = this.getByName(programs, rule.program);

            const programRuleActions = actions
                .filter(action => action.programRule === rule.name)
                .map(action => ({ id: action.id }));

            this.addSharingSetting(rule);
            const translations = this.processTranslations(sheets, rule.name, "programRule");

            return { ...rule, program: { id: program.id }, programRuleActions, translations };
        });
    }

    private buildProgramRuleActions(sheets: Sheet[]) {
        const get = (name: string) => getItems(sheets, name); // shortcut

        const actions = get("programRuleActions"),
            rules = get("programRules"),
            elements = get("programDataElements"),
            attrs = get("trackedEntityAttributes"),
            stages = get("programStages"),
            sections = get("programStageSections");

        return actions.map(action => {
            let data = { ...action } as MetadataItem; // copy that we will modify

            this.replaceById(data, "programRule", rules);
            this.replaceById(data, "dataElement", elements);
            this.replaceById(data, "trackedEntityAttribute", attrs);
            this.replaceById(data, "programStage", stages);
            this.replaceById(data, "programStageSection", sections);
            this.addSharingSetting(data);

            const programRuleActionType = data.name;
            delete data.name;

            return { programRuleActionType, ...data };
        });
    }

    private buildProgramRuleVariables(sheets: Sheet[]) {
        const get = (name: string) => getItems(sheets, name); // shortcut

        const vars = get("programRuleVariables"),
            programs = get("programs"),
            elements = get("programDataElements"),
            attrs = get("trackedEntityAttributes"),
            stages = get("programStages");

        return vars.map(variable => {
            let data = { ...variable } as MetadataItem; // copy that we will modify

            this.replaceById(data, "program", programs);
            this.replaceById(data, "dataElement", elements);
            this.replaceById(data, "trackedEntityAttribute", attrs);
            this.replaceById(data, "programStage", stages);

            this.addSharingSetting(data);
            data.translations = this.processTranslations(sheets, variable.name, "programRuleVariable");

            return data;
        });
    }

    // UTILS
    localeDictionary = {
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

    private processTranslations(sheets: Sheet[], parentDataName: string, metadataType: string) {
        const get = (name: string) => getItems(sheets, name);
        const translations = get(`${metadataType}Translations`);

        return translations
            .filter(translationsToFilter => {
                return translationsToFilter[metadataType] === parentDataName;
            })
            .map(translation => {
                const localeKey: localeKey = translation.locale ?? "default";
                const locale: string | undefined = this.localeDictionary[localeKey];

                return locale
                    ? {
                          property: translation.name,
                          locale: locale,
                          value: translation.value,
                      }
                    : {};
            });
    }

    private processItemAttributes(sheets: Sheet[], parentData: MetadataItem, metadataType: string) {
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

    private processItemLegendSets(sheets: Sheet[], parentDataName: string, metadataType: string) {
        const get = (name: string) => getItems(sheets, name);

        const legendSets = get("legendSets");
        const itemLegends = get(`${metadataType}Legends`);

        return itemLegends
            .filter(itemLegendToFilter => {
                return itemLegendToFilter[metadataType] === parentDataName;
            })
            .map(legend => {
                const legendId = this.getByName(legendSets, legend.name)?.id;

                return { id: legendId };
            });
    }

    // Add sortOrder to filteredMetadataItems, these items belong to the same 'group'.
    // The idea is to use metadataItems.filter(filterFunction) as filteredMetadataItems.
    private addSortOrder(filteredMetadataItems: MetadataItem[]) {
        filteredMetadataItems.forEach((item, index) => {
            item.sortOrder = index;
        });
    }

    // Adds renderType to a metadata object with a default fallback value
    private addRenderType(metadataItem: MetadataItem, defaultValue: string) {
        const renderType = {
            DESKTOP: { type: metadataItem.renderTypeDesktop ?? defaultValue },
            MOBILE: { type: metadataItem.renderTypeMobile ?? defaultValue },
        };
        delete metadataItem.renderTypeDesktop;
        delete metadataItem.renderTypeMobile;

        return renderType;
    }

    private addSharingSetting(data: MetadataItem) {
        data.sharing = data.sharing ? JSON.parse(data.sharing) : undefined;
    }

    // Return the item from the list that has the given name.
    private getByName(items: MetadataItem[], name: string): MetadataItem {
        return items.find(item => item.name === name) ?? {};
    }

    // Modify data[key], so instead of data[key]=name, it becomes data[key]={id: id}
    // with the id of the item in items that had that name.
    private replaceById(data: MetadataItem, key: string, items: MetadataItem[]) {
        if (key in data) {
            const name = data[key];
            const item = this.getByName(items, name);
            data[key] = { id: item.id };
        }
    }
}

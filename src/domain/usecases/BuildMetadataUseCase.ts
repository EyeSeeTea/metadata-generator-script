import { MetadataOutput } from "domain/entities/MetadataOutput";
import { SheetsRepository } from "domain/repositories/SheetsRepository";
import _ from "lodash";
import { MetadataItem } from "domain/entities/MetadataItem";
import { Sheet } from "domain/entities/Sheet";
import { getItems } from "utils/utils";
import { MetadataRepository } from "domain/repositories/MetadataRepository";
import log from "utils/log";
import { Translation } from "domain/entities/Translation";
import { Maybe } from "utils/ts-utils";

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
    constructor(private sheetsRepository: SheetsRepository, private metadataRepository: MetadataRepository) {}

    async execute(sheetId: string): Promise<MetadataOutput> {
        const sheets = await this.sheetsRepository.getSpreadsheet(sheetId);
        const newSheets = await this.getAllExistingMetadata(sheets);
        const metadata = this.buildMetadata(sheets);
        const existingMetadata = this.buildMetadata(newSheets);
        return _(metadata).merge({}, metadata, existingMetadata).value();
    }

    private async getAllExistingMetadata(sheets: Sheet[]) {
        const metadataIds = this.getUidsFromSheets(sheets);
        const allIds = metadataIds.flatMap(metadata => metadata.ids);
        const metadata = await this.metadataRepository.getByIds(allIds);

        const newSheets = sheets.map(sheet => {
            if (sheet.name === "dataSets") {
                return { ...sheet, items: _(metadata.dataSets).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "dataElementGroups") {
                return { ...sheet, items: _(metadata.dataElementGroups).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "dataElementGroupSets") {
                return { ...sheet, items: _(metadata.dataElementGroupSets).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "categoryCombos") {
                return { ...sheet, items: _(metadata.categoryCombos).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "categories") {
                return { ...sheet, items: _(metadata.categories).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "categoryOptions") {
                return { ...sheet, items: _(metadata.categoryOptions).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "optionSets") {
                return { ...sheet, items: _(metadata.optionSets).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "trackedEntityTypes") {
                return { ...sheet, items: _(metadata.trackedEntityTypes).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "trackedEntityAttributes") {
                return { ...sheet, items: _(metadata.trackedEntityAttributes).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "programs") {
                return { ...sheet, items: _(metadata.programs).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "programStages") {
                return { ...sheet, items: _(metadata.programStages).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "sections") {
                return { ...sheet, items: _(metadata.sections).unionBy(sheet.items, "id").value() };
            } else if (sheet.name === "dataElements") {
                return { ...sheet, items: _(metadata.dataElements).unionBy(sheet.items, "id").value() };
            }
            return sheet;
        });
        return newSheets;
    }

    private getUidsFromSheets(sheets: Sheet[]): MetadataIds[] {
        const dataSetIds = _(sheets)
            .flatMap(sheet => {
                if (
                    sheet.name === "dataSetElements" ||
                    sheet.name === "dataSetLegends" ||
                    sheet.name === "dataSetTranslations" ||
                    sheet.name === "sections" ||
                    sheet.name === "sectionDataElements"
                ) {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.dataSet) ? item.dataSet : undefined;
                        })
                        .compact()
                        .value();
                } else if (sheet.name === "dataSetInputPeriods") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.name) ? item.name : undefined;
                        })
                        .compact()
                        .value();
                } else if (sheet.name === "dataSets") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.id) ? item.id : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const sectionIds = _(sheets)
            .flatMap(sheet => {
                if (sheet.name === "sectionDataElements" || sheet.name === "sectionTranslations") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.section) ? item.section : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const dataElementIds = _(sheets)
            .flatMap(sheet => {
                if (sheet.name === "dataElementLegends" || sheet.name === "dataElementTranslations") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.dataElement) ? item.dataElement : undefined;
                        })
                        .compact()
                        .value();
                } else if (sheet.name === "dataElementGroupElements" || sheet.name === "dataElementGroupSetGroups") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.name) ? item.name : undefined;
                        })
                        .compact()
                        .value();
                } else if (sheet.name === "dataElements") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.id) ? item.id : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const dataElementGroupIds = _(sheets)
            .flatMap(sheet => {
                if (sheet.name === "dataElementGroupElements" || sheet.name === "dataElementGroupTranslations") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.dataElementGroup) ? item.dataElementGroup : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const dataElementGroupSetsIds = _(sheets)
            .flatMap(sheet => {
                if (sheet.name === "dataElementGroupSetGroups" || sheet.name === "dataElementGroupSetTranslations") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.dataElementGroupSet) ? item.dataElementGroupSet : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const categoryCombosIds = _(sheets)
            .flatMap(sheet => {
                if (sheet.name === "categoryComboTranslations" || sheet.name === "categories") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.categoryCombo) ? item.categoryCombo : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const categoryIds = _(sheets)
            .flatMap(sheet => {
                if (sheet.name === "categoryTranslations" || sheet.name === "categoryOptions") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.category) ? item.category : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const categoryOptionsIds = _(sheets)
            .flatMap(sheet => {
                if (sheet.name === "categoryOptionTranslations") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.categoryOption) ? item.categoryOption : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const optionSetIds = _(sheets)
            .flatMap(sheet => {
                if (sheet.name === "optionSetTranslations") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.optionSet) ? item.optionSet : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const trackedEntityTypesIds = _(sheets)
            .flatMap(sheet => {
                if (sheet.name === "trackedEntityTypeAttributes" || sheet.name === "trackedEntityTypeTranslations") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.trackedEntityType) ? item.trackedEntityType : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const trackedEntityAttributesIds = _(sheets)
            .flatMap(sheet => {
                if (
                    sheet.name === "trackedEntityTypeAttributes" ||
                    sheet.name === "programTrackedEntityAttributes" ||
                    sheet.name === "programSectionsTrackedEntityAttributes"
                ) {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.name) ? item.name : undefined;
                        })
                        .compact()
                        .value();
                } else if (
                    sheet.name === "trackedEntityAttributeLegends" ||
                    sheet.name === "trackedEntityAttributeTranslations"
                ) {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.trackedEntityAttribute)
                                ? item.trackedEntityAttribute
                                : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const programIds = _(sheets)
            .flatMap(sheet => {
                if (
                    sheet.name === "programTrackedEntityAttributes" ||
                    sheet.name === "programTranslations" ||
                    sheet.name === "programSections" ||
                    sheet.name === "programSectionsTrackedEntityAttributes" ||
                    sheet.name === "programStages"
                ) {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.program) ? item.program : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        const programStagesIds = _(sheets)
            .flatMap(sheet => {
                if (sheet.name === "programStageTranslations") {
                    return _(sheet.items)
                        .map(item => {
                            return this.isValidUid(item.programStage) ? item.programStage : undefined;
                        })
                        .compact()
                        .value();
                }
            })
            .compact()
            .uniq()
            .value();

        return [
            { type: "dataSets", ids: dataSetIds },
            { type: "dataElements", ids: dataElementIds },
            { type: "dataElementGroups", ids: dataElementGroupIds },
            { type: "dataElementGroupSets", ids: dataElementGroupSetsIds },
            { type: "categoryCombos", ids: categoryCombosIds },
            { type: "categories", ids: categoryIds },
            { type: "categoryOptions", ids: categoryOptionsIds },
            { type: "optionSets", ids: optionSetIds },
            { type: "trackedEntityTypes", ids: trackedEntityTypesIds },
            { type: "trackedEntityAttributes", ids: trackedEntityAttributesIds },
            { type: "programs", ids: programIds },
            { type: "programStages", ids: programStagesIds },
            { type: "sections", ids: sectionIds },
        ];
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
                const optionSetId = this.isValidUid(option.optionSet)
                    ? option.optionSet
                    : sheetOptionSets.find(({ name }) => name === option.optionSet)?.id;

                return { ...option, optionSet: { id: optionSetId } };
            })
            .groupBy(({ optionSet }) => optionSet.id)
            .mapValues(options => options.map((option, index) => ({ ...option, sortOrder: index + 1 })))
            .values()
            .flatten()
            .value();

        const sections = _(sheetDataSetSections)
            .map(section => {
                const dataSetId = this.isValidUid(section.dataSet)
                    ? section.dataSet
                    : sheetDataSets.find(({ name }) => name === section.dataSet)?.id;

                const dataElements = sheetSectionDataElements
                    .filter(
                        item =>
                            (item.section === section.name || item.section === section.id) &&
                            (item.dataSet === section.dataSet || item.dataSet === section.dataSet?.id)
                    )
                    .map(({ name }) => ({
                        id: this.isValidUid(name) ? name : this.getByName(sheetDataElements, name).id,
                    }));

                const translations = this.processTranslations(sheets, section.name, section.id, "section");
                this.addSharingSetting(section);

                return {
                    ...section,
                    dataSet: { id: _.isObjectLike(section.dataSet) ? section.dataSet.id : dataSetId },
                    dataElements: [...(section.dataElements || []), ...dataElements],
                    translations: [...(section.translations || []), ...translations],
                };
            })
            .groupBy(({ dataSet }) => dataSet.id)
            .mapValues(items => items.map((section, index) => ({ ...section, sortOrder: index + 1 })))
            .values()
            .flatten()
            .value();

        const categories = sheetCategories.map(category => {
            const categoryOptions = sheetCategoryOptions
                .filter(option => this.getByNameOrId(category, option.category))
                .map(({ id }) => ({ id }));

            const translations = [
                ...(category.translations || []),
                ...this.processTranslations(sheets, category.name, category.id, "category"),
            ];
            this.addSharingSetting(category);

            return {
                ...category,
                categoryOptions: [...(category.categoryOptions || []), ...categoryOptions],
                translations,
            };
        });

        const categoryCombos = sheetCategoryCombos.map(categoryCombo => {
            const categories = sheetCategories
                .filter(category => this.getByNameOrId(categoryCombo, category.categoryCombo))
                .map(({ id }) => ({ id }));

            this.addSharingSetting(categoryCombo);
            const translations = [
                ...(categoryCombo.translations || []),
                ...this.processTranslations(sheets, categoryCombo.name, categoryCombo.id, "categoryCombo"),
            ];

            return { ...categoryCombo, categories: [...(categoryCombo.categories || []), ...categories], translations };
        });

        const optionSets = sheetOptionSets.map(optionSet => {
            const options = sheetOptions
                .filter(option => option.optionSet === optionSet.name || option.optionSet === optionSet.id)
                .map(({ id }) => ({ id }));

            this.addSharingSetting(optionSet);
            const translations = this.processTranslations(sheets, optionSet.name, optionSet.id, "optionSet");

            return {
                ...optionSet,
                options: [...(optionSet.options || []), ...options],
                translations: [...(optionSet.translations || []), ...translations],
            };
        });

        const categoryOptions = _.uniqBy(sheetCategoryOptions, item => item.id).map(categoryOption => {
            this.addSharingSetting(categoryOption);
            const translations = this.processTranslations(
                sheets,
                categoryOption.name,
                categoryOption.id,
                "categoryOption"
            );

            return { ...categoryOption, translations: [...(categoryOption.translations || []), ...translations] };
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

            const newDataSetElements = dataSetElements
                .filter(dseToFilter => {
                    return this.getByNameOrId(dataSet, dseToFilter.dataSet);
                })
                .map(elements => {
                    const dataElementId = this.isValidUid(elements.name)
                        ? elements.name
                        : this.getByName(dataElements, elements.name)?.id;

                    if (!dataElementId)
                        throw Error(`Cannot find dataElement: ${elements.name} in sheet dataSetElements`);

                    const categoryComboId = this.isValidUid(elements.categoryCombo)
                        ? elements.categoryCombo
                        : this.getByName(categoryCombos, elements.categoryCombo)?.id;

                    return {
                        dataSet: { id: data.id },
                        dataElement: { id: dataElementId },
                        categoryCombo: categoryComboId ? { id: categoryComboId } : undefined,
                    };
                });

            const newSections = dataSetSections
                .filter(dssToFilter => {
                    return this.getByNameOrId(dataSet, dssToFilter.dataSet);
                })
                .map(section => {
                    return { id: section.id };
                });

            const newDataInputPeriods = dataSetInputPeriods
                .filter(dsipToFilter => {
                    return this.getByNameOrId(dataSet, dsipToFilter.name);
                })
                .map(inputPeriod => {
                    return {
                        period: { id: inputPeriod.period },
                        openingDate: inputPeriod.openingDate,
                        closingDate: inputPeriod.closingDate,
                    };
                });

            data.legendSets = _([
                ...(data.legendSets || []),
                ...this.processItemLegendSets(sheets, data.name, data.id, "dataSet"),
            ])
                .uniqBy(dls => dls.id)
                .value();

            data.translations = this.mergeAndGetUniqueTranslations(
                data.translations,
                this.processTranslations(sheets, data.name, data.id, "dataSet")
            );

            data.attributeValues = _([
                ...(data.attributeValues || []),
                ...this.processItemAttributes(sheets, data, "dataSet"),
            ])
                .uniqBy(this.getAttributeId)
                .value();

            if (!_.isObjectLike(data.categoryCombo)) {
                this.replaceById(data, "categoryCombo", categoryCombos);
            }

            this.addSharingSetting(data);

            if (!_.isObjectLike(data.workflow)) {
                data.workflow = { id: data.workflow.id };
            }

            return {
                ...data,
                sections: [...(data.sections || []), ...newSections],
                dataSetElements: _([...(data.dataSetElements || []), ...newDataSetElements])
                    .uniqBy(dse => dse.dataElement.id)
                    .value(),
                dataInputPeriods: _([...(data.dataInputPeriods || []), ...newDataInputPeriods])
                    .uniqBy(dse => dse.period.id)
                    .value(),
            };
        });
    }

    private getAttributeId(attribute: MetadataItem) {
        return attribute.attribute.id;
    }

    private mergeAndGetUniqueTranslations(
        existingTranslations: Maybe<Translation[]>,
        newTranslations: Translation[]
    ): Translation[] {
        const result = _.unionBy(existingTranslations, newTranslations, obj => {
            return _.join([obj.property?.toLowerCase(), obj.locale?.toLowerCase()], "-");
        });
        return result;
    }

    private buildDataElementsType(sheets: Sheet[], deType: "dataElements" | "programDataElements") {
        const get = (name: string) => getItems(sheets, name);

        const dataElements = get(deType);
        const categoryCombos = get("categoryCombos");
        const optionSets = get("optionSets");

        return dataElements.map(dataElement => {
            let data: MetadataItem = JSON.parse(JSON.stringify(dataElement));

            const domainType = deType === "dataElements" ? "AGGREGATE" : "TRACKER";

            const categoryComboId = _.isObjectLike(data.categoryCombo)
                ? data.categoryCombo.id
                : this.getRelatedId(data.categoryCombo, categoryCombos);

            const optionSetId = _.isObjectLike(data.optionSet)
                ? data.optionSet.id
                : this.getRelatedId(data.optionSet, optionSets);

            const commentOptionSetId = _.isObjectLike(data.commentOptionSet)
                ? data.commentOptionSet.id
                : this.getRelatedId(data.commentOptionSet, optionSets);

            const translations = this.processTranslations(sheets, data.name, data.id, "dataElement");
            const attributeValues = this.processItemAttributes(sheets, data, "dataElement");
            const legendSets = this.processItemLegendSets(sheets, data.name, data.id, "dataElement");

            this.addSharingSetting(data);

            return {
                ...data,
                categoryCombo: categoryComboId ? { id: categoryComboId } : undefined,
                optionSet: optionSetId ? { id: optionSetId } : undefined,
                commentOptionSet: commentOptionSetId ? { id: commentOptionSetId } : undefined,
                domainType: domainType,
                translations: this.mergeAndGetUniqueTranslations(data.translations, translations),
                attributeValues: _([...(data.attributeValues || []), ...attributeValues])
                    .uniqBy(this.getAttributeId)
                    .value(),
                legendSets: _([...(data.legendSets || []), ...legendSets])
                    .uniqBy(this.getId)
                    .value(),
            };
        });
    }

    private getId(value: MetadataItem) {
        return value.id;
    }

    private getRelatedId(value: string, items: MetadataItem[]): string | undefined {
        return this.isValidUid(value) ? value : this.getByName(items, value)?.id;
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

            const newDataElements = dataElementGroupElements
                .filter(degeToFilter => {
                    return this.getByNameOrId(data, degeToFilter.dataElementGroup);
                })
                .map(elements => {
                    const dataElementId = this.isValidUid(elements.name)
                        ? elements.name
                        : this.getByName(dataElements, elements.name).id;
                    return { id: dataElementId };
                });

            this.addSharingSetting(data);
            data.translations = this.mergeAndGetUniqueTranslations(
                data.translations,
                this.processTranslations(sheets, data.name, data.id, "dataElementGroup")
            );

            return { ...data, dataElements: _(data.dataElements).unionBy(newDataElements, "id").value() };
        });
    }

    private buildDataElementGroupSets(sheets: Sheet[]) {
        const get = (name: string) => getItems(sheets, name);

        const dataElementGroupSets = get("dataElementGroupSets");
        const dataElementGroupSetGroups = get("dataElementGroupSetGroups");
        const dataElementGroups = get("dataElementGroups");

        return dataElementGroupSets.map(degsGroup => {
            let data: MetadataItem = JSON.parse(JSON.stringify(degsGroup));

            const newGroups = dataElementGroupSetGroups
                .filter(degsgToFilter => {
                    return this.getByNameOrId(data, degsgToFilter.dataElementGroupSet);
                })
                .map(groups => {
                    const dataElementGroupId = this.isValidUid(groups.name)
                        ? groups.name
                        : this.getByName(dataElementGroups, groups.name).id;
                    return { id: dataElementGroupId };
                });

            this.addSharingSetting(data);
            data.translations = this.mergeAndGetUniqueTranslations(
                data.translations,
                this.processTranslations(sheets, data.name, data.id, "dataElementGroupSet")
            );

            return { ...data, dataElementGroups: _(data.dataElementGroups).unionBy(newGroups).value() };
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
            data.translation = this.mergeAndGetUniqueTranslations(
                data.translations,
                this.processTranslations(sheets, data.name, data.id, "attribute")
            );

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

            const trackedEntityTypeId = this.isValidUid(program.trackedEntityType)
                ? program.trackedEntityType
                : this.getByName(trackedEntityTypes, program.trackedEntityType)?.id;

            const trackedEntityType = _.isObjectLike(program.trackedEntityType)
                ? { id: program.trackedEntityType.id }
                : { id: trackedEntityTypeId };

            const programStages = pStages
                .filter(pStageToFilter => {
                    return this.getByNameOrId(program, pStageToFilter.program);
                })
                .map(programStage => ({ id: programStage.id }));

            if (!_.isObjectLike(data.categoryCombo)) {
                this.replaceById(data, "categoryCombo", categoryCombos);
            }

            this.addSharingSetting(data);
            data.translations = this.mergeAndGetUniqueTranslations(
                data.translations,
                this.processTranslations(sheets, data.name, data.id, "program")
            );

            if (trackedEntityType.id) {
                // WITH_REGISTRATION == Tracker Program
                const programType = "WITH_REGISTRATION";

                if (!_.isObjectLike(data.categoryCombo)) {
                    this.replaceById(data, "relatedProgram", programs);
                }

                // Event Program Stages belong to programStageSections
                const programSections = pSections
                    .filter(pSectionToFilter => {
                        return this.getByNameOrId(program, pSectionToFilter.program);
                    })
                    .map(programSection => ({ id: programSection.id }));

                const programTrackedEntityAttributes = programTeas
                    .filter(pTeasToFilter => {
                        return this.getByNameOrId(program, pTeasToFilter.program);
                    })
                    .map(pTea => this.buildProgTEA(program, pTea, trackedEntityAttributes));
                this.addSortOrder(programTrackedEntityAttributes);

                return {
                    ...data,
                    programType,
                    trackedEntityType,
                    programStages,
                    programSections: _([...(data.programSections || []), ...programSections])
                        .uniqBy(this.getId)
                        .value(),
                    programTrackedEntityAttributes: [
                        ...(data.programTrackedEntityAttributes || []),
                        ...programTrackedEntityAttributes,
                    ],
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

            const trackedEntityAttribute = this.isValidUid(psTrackedEntityAttribute.name)
                ? psTrackedEntityAttribute.name
                : this.getByName(teAttributes, psTrackedEntityAttribute.name)?.id;

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

            if (!_.isObjectLike(programStage.program)) {
                this.replaceById(programStage, "program", programs);
            }

            this.addSharingSetting(programStage);
            const translations = this.mergeAndGetUniqueTranslations(
                programStage.translations,
                this.processTranslations(sheets, programStage.name, programStage.id, "programStage")
            );

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
        // const tea =  this.getByName(trackedEntityAttributes, pTea.name);
        const tea = trackedEntityAttributes.find(tea => this.getByNameOrId(tea, pTea.name));
        if (!tea)
            throw Error(`Cannot get trackedEntityAttribute: ${pTea.name} in sheet programTrackedEntityAttributes`);
        return {
            id: pTea.id,
            program: { id: program.id },
            displayName: `${program.name} ${tea.name}`,
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

            // update sheet name from trackedEntityAttributeSLegends to trackedEntityAttributeLegends in
            // template
            const legendSets = this.processItemLegendSets(sheets, data.name, data.id, "trackedEntityAttribute");

            const translations = this.processTranslations(
                sheets,
                trackedEntityAttribute.name,
                trackedEntityAttribute.id,
                "trackedEntityAttribute"
            );

            return {
                ...data,
                legendSets: [...(data.legendSets || []), ...legendSets],
                translations: this.mergeAndGetUniqueTranslations(data.translations, translations),
            };
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
                    return this.getByNameOrId(trackedEntityType, teaAttributeToFilter.trackedEntityType);
                })
                .map(trackedEntityTypeAttribute => {
                    const displayName = trackedEntityTypeAttribute.name;
                    const trackedEntityAttribute = trackedEntityAttributes.find(tea =>
                        this.getByNameOrId(tea, displayName)
                    );
                    if (!trackedEntityAttribute)
                        throw Error(
                            `trackedEntityAttribute not found: ${displayName} in sheet trackedEntityTypeAttributes`
                        );
                    const optionSetId = this.getByName(optionSets, trackedEntityAttribute.optionSet)?.id;

                    const nameAndText = this.isValidUid(displayName) ? trackedEntityAttribute.name : displayName;

                    return {
                        displayName: nameAndText,
                        text: nameAndText,
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
            const translations = this.processTranslations(
                sheets,
                trackedEntityType.name,
                trackedEntityType.id,
                "trackedEntityType"
            );

            return {
                ...data,
                trackedEntityTypeAttributes: [
                    ...(data.trackedEntityTypeAttributes || []),
                    ...trackedEntityTypeAttributes,
                ],
                translations: this.mergeAndGetUniqueTranslations(data.translations, translations),
            };
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
            const translations = this.processTranslations(sheets, rule.name, rule.id, "programRule");

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
            data.translations = this.mergeAndGetUniqueTranslations(
                data.translations,
                this.processTranslations(sheets, variable.name, variable.id, "programRuleVariable")
            );

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

    private processTranslations(sheets: Sheet[], parentDataName: string, parentDataId: string, metadataType: string) {
        const get = (name: string) => getItems(sheets, name);
        const translations = get(`${metadataType}Translations`);

        return translations
            .filter(translationsToFilter => {
                return (
                    translationsToFilter[metadataType] === parentDataName ||
                    translationsToFilter[metadataType] === parentDataId
                );
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

    private processItemLegendSets(sheets: Sheet[], parentDataName: string, parentDataId: string, metadataType: string) {
        const get = (name: string) => getItems(sheets, name);

        const legendSets = get("legendSets");
        const itemLegends = get(`${metadataType}Legends`);

        return itemLegends
            .filter(itemLegendToFilter => {
                return (
                    itemLegendToFilter[metadataType] === parentDataName ||
                    itemLegendToFilter[metadataType] === parentDataId
                );
            })
            .map(legend => {
                const legendId = this.isValidUid(legend.name)
                    ? legend.name
                    : this.getByName(legendSets, legend.name)?.id;
                if (!legendId) throw Error(`Cannot find Legend: ${legend.name} in ${metadataType}Legends sheet`);

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
        data.sharing = data.sharing ? data.sharing : undefined;
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
            const itemId = this.isValidUid(name) ? name : this.getByName(items, name)?.id;
            data[key] = { id: itemId };
        }
    }

    private getByNameOrId(item: MetadataItem, nameOrId: string, nameProperty = "name", idProperty = "id"): boolean {
        return item[nameProperty] === nameOrId || item[idProperty] === nameOrId;
    }

    private isValidUid(uid: string): boolean {
        return /^[a-zA-Z][a-zA-Z0-9]{10}$/.test(uid);
    }

    private logNotFoundItemByIdOrName(metadataName: string, value: string): void {
        if (value) log.warn(`Cannot find ${metadataName} with ID/NAME: ${value}`);
    }
}

type MetadataIds = {
    type:
        | "dataSets"
        | "sections"
        | "categories"
        | "categoryCombos"
        | "categoryOptions"
        | "dataElementGroups"
        | "dataSets"
        | "dataElements"
        | "dataElementGroupSets"
        | "optionSets"
        | "trackedEntityTypes"
        | "trackedEntityTypeAttributes"
        | "trackedEntityAttributes"
        | "programs"
        | "programStages"
        | "dataElementGroups";
    ids: string[];
};

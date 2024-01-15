import _ from "lodash";
import { MetadataRepository, Query } from "domain/repositories/MetadataRepository";
import {
    DataElementsSheetRow,
    CategoryCombosSheetRow,
    CategoriesSheetRow,
    CategoryOptionsSheetRow,
    ProgramsSheetRow,
    ProgramStagesSheetRow,
    ProgramStageSectionsDataElementsSheetRow,
    ProgramStageDataElementsSheetRow,
    ProgramStageSectionsSheetRow,
    LegendSetsSheetRow,
    LegendsSheetRow,
    DataElementLegendsSheetRow,
    ProgramRuleVariablesSheetRow,
    ProgramRulesSheetRow,
    programRuleActionsSheetRow,
} from "domain/entities/Sheet";
import { DataElement } from "domain/entities/DataElement";
import { Id, Path, Ref, RenderType } from "../entities/Base";
import { CategoryCombo } from "domain/entities/CategoryCombo";
import { Category } from "../entities/Category";
import { CategoryOption } from "domain/entities/CategoryOptions";
import { Program, ProgramSection, ProgramTrackedEntityAttribute } from "domain/entities/Program";
import { ProgramStage } from "../entities/ProgramStage";
import { ProgramStageSection } from "../entities/ProgramStageSection";
import { convertHeadersToArray, headers } from "utils/csvHeaders";
import { fieldsType, metadataFields } from "utils/metadataFields";
import { ProgramRuleVariable } from "domain/entities/ProgramRuleVariable";
import { Legend, LegendSet } from "../entities/LegendSet";
import { ProgramRule, ProgramRuleAction } from "domain/entities/ProgramRule";
import { MetadataItem } from "../entities/MetadataItem";
import { SheetsRepository } from "domain/repositories/SheetsRepository";
import { SpreadSheet, SpreadSheetName } from "domain/entities/SpreadSheet";
import { TranslationRow, buildTranslationsRows, Translation } from "domain/entities/Translation";
import { Option, OptionSet } from "domain/entities/OptionSet";
import { getValueOrEmpty } from "utils/utils";
import { TrackedEntityAttribute, TrackedEntityType } from "domain/entities/TrackedEntityType";
import { Maybe } from "utils/ts-utils";
import logger from "utils/log";

export class PullEventProgramUseCase {
    constructor(private metadataRepository: MetadataRepository, private spreadSheetsRepository: SheetsRepository) {}

    async execute(options: PullEventProgramUseCaseOptions) {
        await this.exportProgram(options);
    }

    private async exportProgram(options: PullEventProgramUseCaseOptions): Promise<void> {
        // PROGRAM GET
        const { eventProgramId, csvPath, spreadSheetId } = options;
        const programData = await this.getProgramData([eventProgramId]);

        const programStagesIds = _.uniq(
            programData.flatMap(pd => pd.programStages).flatMap(ps => (ps?.id ? ps.id : []))
        );

        const programStagesData = await Promise.all(
            this.chunkUniqueIdsArray(programStagesIds).map(async ids => await this.getProgramStageData(ids))
        ).then(programStagesDataArray => programStagesDataArray.flat());

        const programStageSectionsIds = _.uniq(
            programStagesData.flatMap(psd => psd.programStageSections).flatMap(pss => (pss?.id ? pss.id : []))
        );

        const programStageSectionsData = await Promise.all(
            this.chunkUniqueIdsArray(programStageSectionsIds).map(
                async ids => await this.getProgramStageSectionData(ids)
            )
        ).then(programStageSectionsDataArray => programStageSectionsDataArray.flat());

        const programRulesData = (await this.metadataRepository.getProgramRulesofPrograms([
            eventProgramId,
        ])) as ProgramRule[];

        const programRuleActionsIds = programRulesData.flatMap(pr =>
            pr.programRuleActions ? pr.programRuleActions.flatMap(ref => ref.id) : []
        );

        const programRuleActionData = await Promise.all(
            this.chunkUniqueIdsArray(programRuleActionsIds).map(async ids => await this.getProgramRuleActionsData(ids))
        ).then(programRuleActionsDataArray => programRuleActionsDataArray.flat());

        const programRuleVariablesIds = programData
            .flatMap(pd => pd.programRuleVariables)
            .flatMap(prv => (prv?.id ? prv.id : []));

        const programRuleVariablesData = await Promise.all(
            this.chunkUniqueIdsArray(programRuleVariablesIds).map(
                async ids => await this.getProgramRuleVariablesData(ids)
            )
        ).then(programRuleVariablesDataArray => programRuleVariablesDataArray.flat());

        // DATA ELEMENTS GET
        const chunkedUniqueDEIds = this.chunkUniqueIdsArray(
            _.concat(
                _(programStagesData)
                    .flatMap(ps => ps.programStageDataElements)
                    .map(psde => psde.dataElement.id)
                    .value(),
                _(programStageSectionsData)
                    .flatMap(pss => pss.dataElements)
                    .map(de => de.id)
                    .value(),
                _(programRuleVariablesData)
                    .flatMap(prv => prv.dataElement?.id ?? [])
                    .value()
            )
        );

        const dataElementsData = await Promise.all(
            chunkedUniqueDEIds.map(async dataElementsIds => {
                return await this.getDataElementsData(dataElementsIds);
            })
        ).then(dataElementsDataArray => dataElementsDataArray.flat());

        // CATEGORY COMBOS GET
        const categoryCombosIds = _.concat(
            _.uniq(programData.map(program => program.categoryCombo.id)),
            _.uniq(dataElementsData.map(dataElement => dataElement.categoryCombo.id))
        );
        const categoryCombosData = await this.getCategoryCombosData(categoryCombosIds);

        const categoriesIds = _.uniq(categoryCombosData.flatMap(cc => cc.categories).flatMap(ref => ref.id));
        const categoriesData = await this.getCategoriesData(categoriesIds);

        const categoryOptionsIds = _.uniq(categoriesData.flatMap(c => c.categoryOptions).flatMap(ref => ref.id));
        const categoryOptionsData = await this.getCategoryOptionsData(categoryOptionsIds);

        // LEGEND SETS GET
        const legendSetsIds = dataElementsData.flatMap(de => de.legendSets).map(ref => ref.id);
        const legendSetsData = await this.getLegendSetsData(legendSetsIds);

        // PROGRAMS ROWS BUILD
        const programRows = programData.map(program => this.buildProgramRow(program));

        const programStagesRows = programStagesData.map(programStage => this.buildProgramStageRow(programStage));

        const programName = programData
            .flatMap(pd => pd.name)
            .values()
            .next().value;

        const programStagesDataElementsRows = programStagesData.flatMap(programStage =>
            this.buildProgramStageDataElementRows(programStage, programName, dataElementsData)
        );

        const pssRows = programStageSectionsData.map(pss => {
            const programStageName = programStagesData.find(psToFind => psToFind.id === pss.programStage.id)?.name;
            if (!programStageName) throw new Error(` programStage id ${pss.programStage.id} name not found`);
            const pssRow = this.buildProgramStageSectionRow(pss, programName, programStageName);
            const pssdeRows = this.buildProgramStageSectionsDataElementRow(
                programName,
                programStageName,
                pss.name,
                pss.dataElements,
                dataElementsData
            );
            return {
                pssRow: pssRow,
                pssdeRows: pssdeRows,
            };
        });

        const programStageSectionsRows = pssRows.map(pssr => pssr.pssRow);
        const programStageSectionsDataElementRow = pssRows.flatMap(pssr => pssr.pssdeRows);

        const programRulesRows = programRulesData.map(pr => this.buildProgramRuleRow(pr, programName));

        const programRuleActionsRows = programRuleActionData.map(pra => {
            const programRuleName = this.findById(programRulesData, pra.programRule.id)?.name;
            if (!programRuleName) throw new Error(`programRule id: ${pra.programRule.id} name not found`);

            const dataElementName = pra.dataElement
                ? this.findById(dataElementsData, pra.dataElement.id)?.name
                : undefined;

            const programStageName = pra.programStage
                ? this.findById(programStagesData, pra.programStage.id)?.name
                : undefined;

            const programStageSectionsName = pra.programStageSection
                ? this.findById(programStageSectionsData, pra.programStageSection.id)?.name
                : undefined;

            return this.buildProgramRuleActionsRows(
                pra,
                programRuleName,
                dataElementName,
                programStageName,
                programStageSectionsName
            );
        });

        const programRuleVariablesRows = programRuleVariablesData.map(prv =>
            this.buildProgramRuleVariableRow(prv, programName, dataElementsData, programStagesData)
        );

        // DATA ELEMENTS ROWS BUILD
        const dataElementsRows = dataElementsData.map(dataElement => this.buildDataElementRow(dataElement));

        // CATEGORY COMBOS ROWS BUILD
        const categoryCombosRows = categoryCombosData.map(categoryCombo => this.buildCategoryComboRow(categoryCombo));
        const categoriesRows = categoriesData.map(categories => this.buildCategoryRow(categories, categoryCombosData));
        const categoryOptionsRows = categoryOptionsData.map(categoryOption =>
            this.buildCategoryOptionRow(categoryOption, categoriesData)
        );

        // LEGEND SETS BUILD

        // const legendSetRows = legendSetsData.map(ls => this.buildLegendSetRow(ls));
        // const legendsRows = legendSetsData.flatMap(ls => this.buildLegendsRows(ls.legends, ls.name));

        const dataElementLegendsRows = dataElementsData.flatMap(de => {
            return de.legendSets.flatMap(dels => {
                const legendSetName = legendSetsData.find(lsToFind => lsToFind.id === dels.id)?.name;
                if (!legendSetName) return [];

                return this.buildDataElementLegendsRow(de.name, legendSetName);
            });
        });

        const programTranslationsRows = this.generateTranslations("program", programData);
        const programStageTranslationsRows = this.generateTranslations("programStage", programStagesData);
        const categoryTranslationsRows = this.generateTranslations("category", categoriesData);
        const categoryComboTranslationsRows = this.generateTranslations("categoryCombo", categoryCombosData);
        const categoryOptionTranslationsRows = this.generateTranslations("categoryOption", categoryOptionsData);

        const programRelatedIds = this.getRelatedIdsFromProgram(programData);
        const optionSetIds = this.getOptionSetIds(dataElementsData);

        const metadata = await this.metadataRepository.getByIds([...optionSetIds, ...programRelatedIds]);

        const trackedEntityAttributesRows = this.buildTrackedEntityAttributesRows(metadata.trackedEntityAttributes);
        const trackedEntityAttributesTranslationsRows = this.generateTranslations(
            "trackedEntityAttribute",
            metadata.trackedEntityAttributes
        );

        const legendSetRows = this.buildLegendsSetRows(metadata.legendSets, legendSetsData);
        const legendsRows = _(legendSetsData)
            .concat(metadata.legendSets)
            .flatMap(ls => this.buildLegendsRows(ls.legends, ls.name))
            .compact()
            .value();

        const trackedEntityAttributesLegendsRows = this.buildTrackedEntityAttributesLegends(
            metadata.legendSets,
            metadata.trackedEntityAttributes
        );

        const trackedEntityTypesRows = this.buildTrackedEntityTypesRows(metadata.trackedEntityTypes);
        const trackedEntityTypeAttributesRows = this.buildTrackedEntityTypeAttributeRows(
            metadata.trackedEntityTypes,
            trackedEntityAttributesRows
        );
        const trackedEntityTypesTranslationsRows = this.generateTranslations(
            "trackedEntityType",
            metadata.trackedEntityTypes
        );
        const programTrackedEntityAttributesRows = this.buildProgramTrackedEntityAttributesRows(
            programData,
            metadata.trackedEntityAttributes
        );

        const programSectionsRows = this.buildProgramSectionsRows(programData);
        const programSectionsTrackedEntityAttributesRows = this.buildProgramSectionsTrackedEntityAttributes(
            programData,
            metadata.trackedEntityAttributes
        );

        const programDataElementsRows = this.buildProgramDataElementsRows(programStagesData, dataElementsData);
        const programDataElementTranslationsRows = this.generateTranslations("programDataElement", dataElementsData);

        const optionSetsRows = this.buildOptionSetRows(metadata.optionSets);
        const optionSetTranslationsRows = this.generateTranslations("optionSet", metadata.optionSets);
        const optionsRows = this.buildOptionsRows(metadata.options);

        await this.spreadSheetsRepository.save(spreadSheetId || csvPath, [
            this.convertToSpreadSheetValue("programs", programRows, convertHeadersToArray(headers.programsHeaders)),
            this.convertToSpreadSheetValue(
                "programSections",
                programSectionsRows,
                convertHeadersToArray(headers.programSectionsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programSectionsTrackedEntityAttributes",
                programSectionsTrackedEntityAttributesRows,
                convertHeadersToArray(headers.programSectionsTrackedEntityAttributesHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programTrackedEntityAttributes",
                programTrackedEntityAttributesRows,
                convertHeadersToArray(headers.programTrackedEntityAttributesHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programDataElements",
                programDataElementsRows,
                convertHeadersToArray(headers.programDataElementsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programDataElementTranslations",
                programDataElementTranslationsRows,
                convertHeadersToArray(headers.programDataElementTranslationsHeaders)
            ),

            this.convertToSpreadSheetValue(
                "programTranslations",
                programTranslationsRows,
                convertHeadersToArray(headers.programTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programStages",
                programStagesRows,
                convertHeadersToArray(headers.programStagesHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programStageDataElements",
                programStagesDataElementsRows,
                convertHeadersToArray(headers.programStageDataElementsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programStageTranslations",
                programStageTranslationsRows,
                convertHeadersToArray(headers.programStageTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programStageSections",
                programStageSectionsRows,
                convertHeadersToArray(headers.programStageSectionsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programStageSectionsDataElements",
                programStageSectionsDataElementRow,
                convertHeadersToArray(headers.programStageSectionsDataElementsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "trackedEntityTypes",
                trackedEntityTypesRows,
                convertHeadersToArray(headers.trackedEntityTypesRowsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "trackedEntityTypeAttributes",
                trackedEntityTypeAttributesRows,
                convertHeadersToArray(headers.trackedEntityTypeAttributesRowsHeaders)
            ),

            this.convertToSpreadSheetValue(
                "trackedEntityTypeTranslations",
                trackedEntityTypesTranslationsRows,
                convertHeadersToArray(headers.trackedEntityTypeTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "trackedEntityAttributes",
                trackedEntityAttributesRows,
                convertHeadersToArray(headers.trackedEntityAttributesHeaders)
            ),
            this.convertToSpreadSheetValue(
                "trackedEntityAttributeTranslations",
                trackedEntityAttributesTranslationsRows,
                convertHeadersToArray(headers.trackedEntityAttributeTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "trackedEntityAttributesLegends",
                trackedEntityAttributesLegendsRows,
                convertHeadersToArray(headers.trackedEntityAttributesLegendsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programRules",
                programRulesRows,
                convertHeadersToArray(headers.programRulesHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programRuleActions",
                programRuleActionsRows,
                convertHeadersToArray(headers.programRuleActionsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "programRuleVariables",
                programRuleVariablesRows,
                convertHeadersToArray(headers.programRuleVariablesHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElements",
                dataElementsRows,
                convertHeadersToArray(headers.dataElementsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElementLegends",
                dataElementLegendsRows,
                convertHeadersToArray(headers.dataElementLegendsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categoryCombos",
                categoryCombosRows,
                convertHeadersToArray(headers.categoryCombosHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categoryComboTranslations",
                categoryComboTranslationsRows,
                convertHeadersToArray(headers.categoryComboTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categories",
                categoriesRows,
                convertHeadersToArray(headers.categoriesHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categoryTranslations",
                categoryTranslationsRows,
                convertHeadersToArray(headers.categoryTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categoryOptions",
                categoryOptionsRows,
                convertHeadersToArray(headers.categoryOptionsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categoryOptionTranslations",
                categoryOptionTranslationsRows,
                convertHeadersToArray(headers.categoryOptionTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "legendSets",
                legendSetRows,
                convertHeadersToArray(headers.legendSetsHeaders)
            ),
            this.convertToSpreadSheetValue("legends", legendsRows, convertHeadersToArray(headers.legendsHeaders)),
            this.convertToSpreadSheetValue(
                "optionSets",
                optionSetsRows,
                convertHeadersToArray(headers.optionSetsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "optionSetTranslations",
                optionSetTranslationsRows,
                convertHeadersToArray(headers.optionSetTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue("options", optionsRows, convertHeadersToArray(headers.optionsHeaders)),
        ]);
    }

    private buildProgramDataElementTranslationsRows(dataElements: DataElement[]) {
        return _(dataElements)
            .flatMap(dataElement => {
                const translations = buildTranslationsRows(dataElement.translations);
                return translations.map(translation => {
                    return { programDataElement: dataElement.name, ...translation };
                });
            })
            .value();
    }

    private buildProgramDataElementsRows(programStage: ProgramStage[], dataElements: DataElement[]) {
        return programStage.flatMap(section => {
            return _(section.programStageDataElements)
                .map(programDataElement => {
                    const dataElementDetails = dataElements.find(
                        dataElement => dataElement.id === programDataElement.dataElement.id
                    );
                    if (!dataElementDetails) {
                        logger.warn(
                            `Cannot find dataElement: ${programDataElement.dataElement.id} in section ${section.name}`
                        );
                        return undefined;
                    }
                    return {
                        id: programDataElement.dataElement.id,
                        name: dataElementDetails.name,
                        shortName: dataElementDetails.shortName,
                        formName: dataElementDetails.formName,
                        programStageSection: section.name,
                        code: dataElementDetails.code,
                        valueType: dataElementDetails.valueType,
                        aggregationType: dataElementDetails.aggregationType,
                        description: dataElementDetails.description,
                        optionSet: dataElementDetails.optionSet?.name || "",
                    };
                })
                .compact()
                .value();
        });
    }

    private buildProgramSectionsTrackedEntityAttributes(
        programs: Program[],
        trackedEntityAttributes: TrackedEntityAttribute[] = []
    ): { name: string; program: string; programSection: string }[] {
        return _(programs)
            .flatMap(program => {
                const allSections = program.programSections.flatMap(section => section);
                return allSections.flatMap(section => {
                    const attributes = section.trackedEntityAttributes.flatMap(attribute => attribute);
                    return _(attributes)
                        .map(trackedEntityAttribute => {
                            const attributeDetails = trackedEntityAttributes.find(
                                tea => tea.id === trackedEntityAttribute.id
                            );
                            if (!attributeDetails) {
                                logger.warn(
                                    `Cannot found trackedEntityAttribute: ${trackedEntityAttribute.id} in programSectionsTrackedEntityAttributes sheet`
                                );
                                return undefined;
                            }
                            return {
                                name: trackedEntityAttribute.name,
                                program: program.name,
                                programSection: section.name,
                            };
                        })
                        .compact()
                        .value();
                });
            })
            .value();
    }

    private buildProgramSectionsRows(programData: Program[]): ProgramSectionRow[] {
        return _(programData)
            .flatMap(program => {
                return program.programSections.map((section): ProgramSectionRow => {
                    return {
                        id: section.id,
                        name: section.name,
                        program: program.name,
                        renderTypeMobile: section.renderType.MOBILE.type,
                        renderTypeDesktop: section.renderType.DESKTOP.type,
                        description: section.description,
                    };
                });
            })
            .value();
    }

    private buildProgramTrackedEntityAttributesRows(
        programData: Program[],
        trackedEntityAttributes: TrackedEntityAttribute[]
    ): ProgramTrackedEntityAttributesRow[] {
        return _(programData)
            .flatMap(program => {
                return _(program.programTrackedEntityAttributes)
                    .map((programTea): Maybe<ProgramTrackedEntityAttributesRow> => {
                        const teaDetails = trackedEntityAttributes.find(
                            tea => tea.id === programTea.trackedEntityAttribute.id
                        );
                        if (!teaDetails) return undefined;
                        return {
                            id: programTea.id,
                            name: teaDetails.name,
                            program: program.name,
                            displayInList: programTea.displayInList,
                            mandatory: programTea.mandatory,
                            allowFutureDate: programTea.allowFutureDate,
                            searchable: programTea.searchable,
                            renderTypeDesktop: programTea.renderType ? programTea.renderType.DESKTOP.type : "",
                            renderTypeMobile: programTea.renderType ? programTea.renderType.MOBILE.type : "",
                        };
                    })
                    .compact()
                    .value();
            })
            .value();
    }

    private buildTrackedEntityTypeAttributeRows(
        trackedEntityTypes: TrackedEntityType[],
        trackedEntityAttributesRows: TrackedEntityAttributeRow[]
    ) {
        return _(trackedEntityTypes)
            .flatMap(trackedEntityType => {
                return _(trackedEntityType.trackedEntityTypeAttributes)
                    .map(trackedEntityTypeAttribute => {
                        const tetAttributeDetails = trackedEntityAttributesRows.find(
                            tea => tea.id === trackedEntityTypeAttribute.trackedEntityAttribute.id
                        );
                        if (!tetAttributeDetails) {
                            logger.warn(`Cannot find trackedEntityAttribute ${trackedEntityTypeAttribute.id}`);
                            return undefined;
                        }
                        return {
                            trackedEntityType: trackedEntityType.name,
                            name: tetAttributeDetails.name,
                            displayInList: trackedEntityTypeAttribute.displayInList,
                            mandatory: trackedEntityTypeAttribute.mandatory,
                            searchable: trackedEntityTypeAttribute.searchable,
                        };
                    })
                    .compact()
                    .value();
            })
            .value();
    }

    private buildTrackedEntityTypesRows(trackedEntityTypes: TrackedEntityType[]): TrackedEntityTypeRow[] {
        return _(trackedEntityTypes)
            .map((trackedEntityType): TrackedEntityTypeRow => {
                return {
                    id: trackedEntityType.id,
                    name: trackedEntityType.name,
                    description: trackedEntityType.description,
                    allowAuditLog: trackedEntityType.allowAuditLog,
                    minAttributesRequiredToSearch: trackedEntityType.minAttributesRequiredToSearch,
                    maxTeiCountToReturn: trackedEntityType.maxTeiCountToReturn,
                    featureType: trackedEntityType.featureType,
                };
            })
            .value();
    }

    private buildTrackedEntityAttributesLegends(
        legendSets: LegendSet[],
        trackedEntityAttributes: TrackedEntityAttribute[]
    ): TrackedEntityAttributesLegendRow[] {
        return _(trackedEntityAttributes)
            .flatMap(trackedEntityAttribute => {
                return _(trackedEntityAttribute.legendSets)
                    .map(legendSet => {
                        const legendSetDetails = legendSets.find(l => l.id === legendSet.id);
                        if (!legendSetDetails) {
                            logger.warn(
                                `Cannot find legendSet ${legendSet.id} in trackedEntityAttribute ${trackedEntityAttribute.name}`
                            );
                            return undefined;
                        }
                        return { trackedEntityAttribute: trackedEntityAttribute.name, name: legendSetDetails.name };
                    })
                    .compact()
                    .value();
            })
            .compact()
            .value();
    }

    private buildLegendsSetRows(legendSets: LegendSet[], legendSetsData: LegendSet[]): LegendSetsSheetRow[] {
        return _(legendSets).concat(legendSetsData).map(this.buildLegendSetRow).compact().value();
    }

    private getRelatedIdsFromProgram(programData: Program[]): Id[] {
        return _(programData)
            .flatMap(program => {
                const trackedEntityTypeAttributes = program.trackedEntityType
                    ? program.trackedEntityType.trackedEntityTypeAttributes
                    : [];

                const relatedIds = _(trackedEntityTypeAttributes)
                    .flatMap(trackedEntityTypeAttribute => {
                        const { id, trackedEntityAttribute } = trackedEntityTypeAttribute;
                        const legendSetIds = trackedEntityAttribute.legendSets.map(legendSet => legendSet.id);
                        const optionSetId = trackedEntityAttribute.optionSet?.id;
                        const optionsIds = _(trackedEntityAttribute.optionSet?.options)
                            .map(option => option.id)
                            .value();
                        return [...legendSetIds, ...optionsIds, id, optionSetId, trackedEntityAttribute.id];
                    })
                    .compact()
                    .value();

                const allTrackedEntityAttributeIds = program.programTrackedEntityAttributes.map(
                    pTea => pTea.trackedEntityAttribute.id
                );

                return [...relatedIds, ...allTrackedEntityAttributeIds, program.trackedEntityType?.id];
            })
            .compact()
            .uniq()
            .value();
    }

    private buildTrackedEntityAttributesRows(
        trackedEntityAttributes: TrackedEntityAttribute[]
    ): TrackedEntityAttributeRow[] {
        return trackedEntityAttributes.map((trackedEntityAttribute): TrackedEntityAttributeRow => {
            return {
                id: trackedEntityAttribute.id,
                name: trackedEntityAttribute.name,
                shortName: trackedEntityAttribute.shortName,
                formName: trackedEntityAttribute.formName,
                code: trackedEntityAttribute.code,
                description: trackedEntityAttribute.description,
                fieldMask: trackedEntityAttribute.fieldMask,
                optionSet: trackedEntityAttribute.optionSet?.id,
                valueType: trackedEntityAttribute.valueType,
                aggregationType: trackedEntityAttribute.aggregationType,
                unique: trackedEntityAttribute.unique,
                orgunitScope: trackedEntityAttribute.orgunitScope,
                generated: trackedEntityAttribute.generated,
                pattern: trackedEntityAttribute.pattern,
                inherit: trackedEntityAttribute.inherit,
                confidential: trackedEntityAttribute.confidential,
                displayInListNoProgram: trackedEntityAttribute.displayInListNoProgram,
                skipSynchronization: trackedEntityAttribute.skipSynchronization,
            };
        });
    }

    private buildOptionsRows(options: Option[]): OptionRow[] {
        return _(options)
            .map(option => {
                return {
                    id: option.id,
                    name: getValueOrEmpty(option.name),
                    code: getValueOrEmpty(option.code),
                    optionSet: getValueOrEmpty(option.optionSet?.id),
                    shortName: getValueOrEmpty(option.shortName),
                    description: getValueOrEmpty(option.description),
                };
            })
            .value();
    }

    private buildOptionSetRows(optionSets: OptionSet[]): OptionSetRow[] {
        return _(optionSets)
            .map(optionSet => {
                return {
                    id: optionSet.id,
                    name: optionSet.name,
                    code: optionSet.code,
                    valueType: optionSet.valueType,
                    description: optionSet.description,
                };
            })
            .value();
    }

    private getOptionSetIds(dataElements: DataElement[]): Id[] {
        const optionSetIds = dataElements.flatMap(dataElement => {
            const optionSet = dataElement.optionSet;
            const optionSetId = optionSet?.id;
            const optionsIds = _(optionSet?.options)
                .map(option => option.id)
                .value();

            const commentOptionSet = dataElement.commentOptionSet;
            const commentOptionSetId = commentOptionSet?.id;
            const commentOptionsIds = _(commentOptionSet?.options)
                .map(option => option.id)
                .value();

            return [optionSetId, ...optionsIds, commentOptionSetId, ...commentOptionsIds];
        });

        return _(optionSetIds).compact().value();
    }

    private generateTranslations<T extends string, Model extends { name: string; translations: Translation[] }>(
        key: T,
        metadata: Model[]
    ): Array<TranslationRow & { T: string }> {
        return metadata.flatMap(model => {
            const translations = buildTranslationsRows(model.translations);
            return translations.map(translation => {
                return { [key]: model.name, ...translation } as TranslationRow & { T: string };
            });
        });
    }

    private convertToSpreadSheetValue<Model>(
        sheetName: SpreadSheetName,
        rows: Model[],
        headers: string[]
    ): SpreadSheet {
        return { name: sheetName, range: "A2", values: rows.map(Object.values), columns: headers };
    }

    //
    // GETS
    //
    private async getProgramData(programId: Id[]): Promise<Program[]> {
        const programsQuery: Query = this.makeQuery("programs", metadataFields.programsFields, programId);
        return (await this.metadataRepository.getMetadata(programsQuery)) as Program[];
    }

    private async getProgramStageData(programStageId: Id[]): Promise<ProgramStage[]> {
        const programStagesQuery: Query = this.makeQuery(
            "programStages",
            metadataFields.programStagesFields,
            programStageId
        );
        return (await this.metadataRepository.getMetadata(programStagesQuery)) as ProgramStage[];
    }

    private async getProgramStageSectionData(programStageSectionId: Id[]): Promise<ProgramStageSection[]> {
        const programStageSectionQuery: Query = this.makeQuery(
            "programStageSections",
            metadataFields.programStageSectionFields,
            programStageSectionId
        );
        return (await this.metadataRepository.getMetadata(programStageSectionQuery)) as ProgramStageSection[];
    }

    private async getProgramRuleActionsData(programRuleActionsIds: Id[]): Promise<ProgramRuleAction[]> {
        const programRuleActionsQuery: Query = this.makeQuery(
            "programRuleActions",
            metadataFields.programRuleActionsFields,
            programRuleActionsIds
        );
        return (await this.metadataRepository.getMetadata(programRuleActionsQuery)) as ProgramRuleAction[];
    }

    private async getProgramRuleVariablesData(programRuleVariablesIds: Id[]): Promise<ProgramRuleVariable[]> {
        const programRuleVariablesQuery: Query = this.makeQuery(
            "programRuleVariables",
            metadataFields.programRuleVariablesFields,
            programRuleVariablesIds
        );
        return (await this.metadataRepository.getMetadata(programRuleVariablesQuery)) as ProgramRuleVariable[];
    }

    private async getDataElementsData(dataElementsIds: Id[]): Promise<DataElement[]> {
        const dataElementsQuery: Query = this.makeQuery(
            "dataElements",
            metadataFields.dataElementFieds,
            dataElementsIds
        );

        return (await this.metadataRepository.getMetadata(dataElementsQuery)) as DataElement[];
    }

    private async getCategoryCombosData(categoryCombosIds: Id[]): Promise<CategoryCombo[]> {
        const categoryCombosQuery: Query = this.makeQuery(
            "categoryCombos",
            metadataFields.categoryComboFields,
            categoryCombosIds
        );
        return (await this.metadataRepository.getMetadata(categoryCombosQuery)) as CategoryCombo[];
    }

    private async getCategoriesData(categoriesIds: Id[]): Promise<Category[]> {
        const categoriesQuery: Query = this.makeQuery("categories", metadataFields.categoriesFields, categoriesIds);
        return (await this.metadataRepository.getMetadata(categoriesQuery)) as Category[];
    }

    private async getCategoryOptionsData(categoryOptionsIds: Id[]): Promise<CategoryOption[]> {
        const categoryOptionsQuery: Query = this.makeQuery(
            "categoryOptions",
            metadataFields.categoryOptionsFields,
            categoryOptionsIds
        );
        return (await this.metadataRepository.getMetadata(categoryOptionsQuery)) as CategoryOption[];
    }

    private async getLegendSetsData(legendSetsIds: Id[]): Promise<LegendSet[]> {
        const legendSetsQuery: Query = this.makeQuery("legendSets", metadataFields.LegendSetsFields, legendSetsIds);
        return (await this.metadataRepository.getMetadata(legendSetsQuery)) as LegendSet[];
    }

    //
    // BUILD
    //
    private buildProgramRow(program: Program): ProgramsSheetRow {
        return {
            id: program.id,
            name: program.name,
            shortName: program.shortName,
            code: program.code,
            description: program.description,
            trackedEntityType: program.trackedEntityType?.name,
            categoryCombo: program.categoryCombo?.name,
            version: program.version,
            expiryPeriodType: program.expiryPeriodType,
            expiryDays: program.expiryDays,
            completeEventsExpiryDays: program.completeEventsExpiryDays,
            displayFrontPageList: this.booleanToString(program.displayFrontPageList),
            useFirstStageDuringRegistration: this.booleanToString(program.useFirstStageDuringRegistration),
            accessLevel: program.accessLevel,
            minAttributesRequiredToSearch: program.minAttributesRequiredToSearch,
            maxTeiCountToReturn: program.maxTeiCountToReturn,
            selectIncidentDatesInFuture: this.booleanToString(program.selectIncidentDatesInFuture),
            selectEnrollmentDatesInFuture: this.booleanToString(program.selectEnrollmentDatesInFuture),
            onlyEnrollOnce: this.booleanToString(program.onlyEnrollOnce),
            displayIncidentDate: this.booleanToString(program.displayIncidentDate),
            incidentDateLabel: program.incidentDateLabel,
            enrollmentDateLabel: program.enrollmentDateLabel,
            ignoreOverdueEvents: this.booleanToString(program.ignoreOverdueEvents),
            featureType: program.featureType,
            relatedProgram: program.relatedProgram?.id,
        };
    }

    private buildProgramStageRow(programStage: ProgramStage): ProgramStagesSheetRow {
        return {
            id: programStage.id,
            name: programStage.name,
            program: programStage.program.name,
            enableUserAssignment: programStage.enableUserAssignment,
            blockEntryForm: programStage.blockEntryForm,
            featureType: programStage.featureType,
            preGenerateUID: programStage.preGenerateUID,
            executionDateLabel: programStage.executionDateLabel,
            validationStrategy: programStage.validationStrategy,
            description: programStage.description,
            minDaysFromStart: programStage.minDaysFromStart,
            repeatable: programStage.repeatable,
            periodType: programStage.periodType,
            displayGenerateEventBox: programStage.displayGenerateEventBox,
            standardInterval: programStage.standardInterval,
            autoGenerateEvent: programStage.autoGenerateEvent,
            openAfterEnrollment: programStage.openAfterEnrollment,
            reportDateToUse: programStage.reportDateToUse,
            remindCompleted: programStage.remindCompleted,
            allowGenerateNextVisit: programStage.allowGenerateNextVisit,
            generatedByEnrollmentDate: programStage.generatedByEnrollmentDate,
            hideDueDate: programStage.hideDueDate,
            dueDateLabel: programStage.dueDateLabel,
        };
    }

    private buildProgramStageDataElementRows(
        programStage: ProgramStage,
        programName: string,
        dataElements: DataElement[]
    ): ProgramStageDataElementsSheetRow[] {
        return programStage.programStageDataElements.map(psde => {
            const deName = dataElements.find(deToFind => deToFind.id === psde.dataElement.id)?.name;

            if (!deName)
                throw new Error(
                    `buildProgramStageDataElementRows: dataElement id ${psde.dataElement.id} name not found`
                );
            const render = this.renderToString(psde.renderType);
            return {
                id: psde.id,
                program: programName,
                programStage: programStage.name,
                name: deName,
                compulsory: psde.compulsory,
                allowProvidedElsewhere: psde.allowProvidedElsewhere,
                displayInReports: psde.displayInReports,
                allowFutureDate: psde.allowFutureDate,
                skipSynchronization: psde.skipSynchronization,
                renderTypeMobile: render?.mobile,
                renderTypeDesktop: render?.desktop,
            };
        });
    }

    private buildProgramStageSectionRow(
        programStageSection: ProgramStageSection,
        program: string,
        programStage: string
    ): ProgramStageSectionsSheetRow {
        const render = this.renderToString(programStageSection.renderType);
        return {
            id: programStageSection.id,
            program: program,
            programStage: programStage,
            name: programStageSection.name,
            renderTypeMobile: render?.mobile,
            renderTypeDesktop: render?.desktop,
            description: programStageSection.description,
        };
    }

    private buildProgramStageSectionsDataElementRow(
        program: string,
        programStage: string,
        programStageSection: string,
        dataElements: Ref[],
        dataElementsDetails: DataElement[]
    ): ProgramStageSectionsDataElementsSheetRow[] {
        return _(dataElements)
            .map(psDataElement => {
                const dataElementDetail = dataElementsDetails.find(dataElement => dataElement.id === psDataElement.id);
                if (!dataElementDetail) return undefined;
                return {
                    program: program,
                    programStage: programStage,
                    programStageSection: programStageSection,
                    name: dataElementDetail.name,
                };
            })
            .compact()
            .value();
    }

    private buildProgramRuleRow(programRule: ProgramRule, programName: string): ProgramRulesSheetRow {
        return {
            id: programRule.id,
            name: programRule.name,
            program: programName,
            condition: programRule.condition,
            description: programRule.description,
        };
    }

    private buildProgramRuleActionsRows(
        programRuleAction: ProgramRuleAction,
        programRuleName: string,
        dataElementName?: string,
        programStage?: string,
        programStageSection?: string
    ): programRuleActionsSheetRow {
        return {
            id: programRuleAction.id,
            programRule: programRuleName,
            name: programRuleAction.programRuleActionType,
            content: programRuleAction.content,
            data: programRuleAction.data,
            location: programRuleAction.location,
            dataElement: dataElementName,
            // TODO: add trackedEntityAttributes
            trackedEntityAttribute: undefined,
            programStage: programStage,
            programStageSection: programStageSection,
        };
    }

    private buildProgramRuleVariableRow(
        prv: ProgramRuleVariable,
        programName: string,
        dataElements: DataElement[],
        programStages: ProgramStage[]
    ): ProgramRuleVariablesSheetRow {
        const baseRow: ProgramRuleVariablesSheetRow = {
            id: prv.id,
            name: prv.name,
            displayName: prv.displayName,
            program: programName,
            useCodeForOptionSet: prv.useCodeForOptionSet,
            programRuleVariableSourceType: prv.programRuleVariableSourceType,
        };

        if (prv.programRuleVariableSourceType !== "TEI_ATTRIBUTE") {
            baseRow.dataElement = dataElements.find(deToFind => deToFind.id === prv.dataElement?.id)?.name;
        }
        // TODO: add trackedEntityAttributes
        // else {
        //     baseRow.trackedEntityAttribute = trackedEntityAttributes.find(teaToFind => teaToFind.id === prv.dataElement?.id)?.name;
        // }

        if (prv.programRuleVariableSourceType === "DATAELEMENT_NEWEST_EVENT_PROGRAM_STAGE") {
            baseRow.programStage = programStages.find(psToFind => psToFind.id === prv.programStage?.id)?.name;
        }

        return baseRow;
    }

    private buildDataElementRow(dataElement: DataElement): DataElementsSheetRow {
        return {
            id: dataElement.id,
            name: dataElement.name,
            shortName: dataElement.shortName,
            formName: dataElement.formName,
            code: dataElement.code,
            categoryCombo: dataElement.categoryCombo.id,
            valueType: dataElement.valueType,
            aggregationType: dataElement.aggregationType,
            domainType: dataElement.domainType,
            description: dataElement.description,
            optionSet: dataElement.optionSet ? dataElement.optionSet.id : undefined,
            commentOptionSet: dataElement.commentOptionSet ? dataElement.commentOptionSet.id : undefined,
            zeroIsSignificant: this.booleanToString(dataElement.zeroIsSignificant),
            url: dataElement.url,
            fieldMask: dataElement.fieldMask,
        };
    }

    private buildCategoryComboRow(categoryCombo: CategoryCombo): CategoryCombosSheetRow {
        return {
            id: categoryCombo.id,
            name: categoryCombo.name,
            code: categoryCombo.code,
            dataDimensionType: categoryCombo.dataDimensionType,
            description: categoryCombo.description,
        };
    }

    private buildCategoryRow(category: Category, categoryCombosData: CategoryCombo[]): CategoriesSheetRow {
        const categoryComboName =
            categoryCombosData.find(ccToFind => ccToFind.categories[0]?.id === category.id)?.name ?? "";
        return {
            id: category.id,
            name: category.name,
            shortName: category.shortName,
            code: category.code,
            categoryCombo: categoryComboName,
            dataDimensionType: category.dataDimensionType,
            description: category.description,
        };
    }

    private buildCategoryOptionRow(
        categoryOption: CategoryOption,
        categoriesData: Category[]
    ): CategoryOptionsSheetRow {
        const categoryComboName =
            categoriesData.find(cToFind => cToFind.categoryOptions[0]?.id === categoryOption.id)?.name ?? "";
        return {
            id: categoryOption.id,
            name: categoryOption.name,
            code: categoryOption.code,
            shortName: categoryOption.shortName,
            description: categoryOption.description,
            category: categoryComboName,
        };
    }

    private buildLegendSetRow(legendSet: LegendSet): LegendSetsSheetRow {
        return {
            id: legendSet.id,
            name: legendSet.name,
            code: legendSet.code,
        };
    }

    private buildLegendsRows(legends: Legend[], legendSetName: string): LegendsSheetRow[] {
        return legends.map(legend => {
            return {
                id: legend.id,
                name: legend.name,
                legendSet: legendSetName,
                startValue: legend.startValue,
                endValue: legend.endValue,
            };
        });
    }

    private buildDataElementLegendsRow(dataElementName: string, legendSetName: string): DataElementLegendsSheetRow {
        return {
            dataElement: dataElementName,
            name: legendSetName,
        };
    }

    //
    // UTILS
    //
    private booleanToString(bool: boolean | undefined) {
        if (!bool) return undefined;
        return bool ? "TRUE" : "FALSE";
    }

    private renderToString(render: RenderType | undefined) {
        return { desktop: render?.DESKTOP?.type ?? undefined, mobile: render?.MOBILE?.type ?? undefined };
    }

    private makeQuery(type: string, fields: fieldsType, ids: string[]) {
        return {
            type: type,
            value: {
                [type]: {
                    fields: fields,
                    filter: {
                        id: { in: ids },
                    },
                },
            },
        };
    }

    private chunkUniqueIdsArray(array: string[]) {
        return _(array).uniq().chunk(500).value();
    }

    private findById(object: MetadataItem[], id: string) {
        return object.find(item => item.id === id) ?? undefined;
    }
}

type PullEventProgramUseCaseOptions = { eventProgramId: string; spreadSheetId: string; csvPath: Path };

type OptionSetRow = Omit<OptionSet, "translations" | "options">;
type OptionRow = Partial<Omit<Option, "translations" | "optionSet"> & { optionSet: string }>;
type TrackedEntityAttributeRow = Omit<TrackedEntityAttribute, "translations" | "optionSet" | "legendSets"> & {
    optionSet: Maybe<string>;
};

type TrackedEntityAttributesLegendRow = { trackedEntityAttribute: string; name: string };
type TrackedEntityTypeRow = Omit<TrackedEntityType, "trackedEntityTypeAttributes" | "translations">;
type ProgramTrackedEntityAttributesRow = Omit<
    ProgramTrackedEntityAttribute,
    "renderType" | "trackedEntityAttribute"
> & {
    name: string;
    program: string;
    renderTypeDesktop: string;
    renderTypeMobile: string;
};

type ProgramSectionRow = Pick<ProgramSection, "id" | "name" | "description"> & {
    program: string;
    renderTypeDesktop: string;
    renderTypeMobile: string;
};

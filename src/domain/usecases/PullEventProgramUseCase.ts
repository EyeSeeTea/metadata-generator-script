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
import { Id, Ref, RenderType } from "../entities/Base";
import { CategoryCombo } from "domain/entities/CategoryCombo";
import { Category } from "../entities/Category";
import { CategoryOption } from "domain/entities/CategoryOptions";
import { Program } from "domain/entities/Program";
import { ProgramStage } from "../entities/ProgramStage";
import { ProgramStageSection } from "../entities/ProgramStageSection";
import { headers } from "utils/csvHeaders";
import { fieldsType, metadataFields } from "utils/metadataFields";
import { ProgramRuleVariable } from "domain/entities/ProgramRuleVariable";
import { Legend, LegendSet } from "../entities/LegendSet";
import { ProgramRule, ProgramRuleAction } from "domain/entities/ProgramRule";
import { MetadataItem } from "../entities/MetadataItem";

export class PullEventProgramUseCase {
    constructor(private metadataRepository: MetadataRepository) {}

    async execute(eventProgramId: Id, path?: string) {
        // PROGRAM GET
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
            const pssRow = this.buildProgramStageSectionRow(pss, programStageName, programName);
            const pssdeRows = this.buildProgramStageSectionsDataElementRow(
                programName,
                programStageName,
                pss.name,
                pss.dataElements
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

            this.buildProgramRuleActionsRows(
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

        const legendSetRows = legendSetsData.map(ls => this.buildLegendSetRow(ls));
        const legendsRows = legendSetsData.flatMap(ls => this.buildLegendsRows(ls.legends, ls.name));

        const dataElementLegendsRows = dataElementsData.flatMap(de => {
            return de.legendSets.flatMap(dels => {
                const legendSetName = legendSetsData.find(lsToFind => lsToFind.id === dels.id)?.name;
                if (!legendSetName) return [];

                return this.buildDataElementLegendsRow(de.name, legendSetName);
            });
        });

        //
        // PRINT CSVs
        //
        await this.metadataRepository.exportMetadataToCSV(programRows, headers.programsHeaders, "programs", path);

        await this.metadataRepository.exportMetadataToCSV(
            programStagesRows,
            headers.programStagesHeaders,
            "programStages",
            path
        );

        await this.metadataRepository.exportMetadataToCSV(
            programStagesDataElementsRows,
            headers.programStageDataElementsHeaders,
            "programStageDataElements",
            path
        );

        await this.metadataRepository.exportMetadataToCSV(
            programStageSectionsRows,
            headers.programStageSectionsHeaders,
            "programStageSections",
            path
        );

        await this.metadataRepository.exportMetadataToCSV(
            programStageSectionsDataElementRow,
            headers.programStageSectionsDataElementsHeaders,
            "programStageSectionsDataElements",
            path
        );

        await this.metadataRepository.exportMetadataToCSV(
            programRulesData,
            headers.programRulesHeaders,
            "programRules",
            path
        );

        await this.metadataRepository.exportMetadataToCSV(
            programRuleActionData,
            headers.programRuleActionsHeaders,
            "programRuleActions",
            path
        );

        await this.metadataRepository.exportMetadataToCSV(
            programRuleVariablesRows,
            headers.programRuleVariablesHeaders,
            "programRuleVariables",
            path
        );

        await this.metadataRepository.exportMetadataToCSV(
            dataElementsRows,
            headers.dataElementsHeaders,
            "dataElements",
            path
        );

        await this.metadataRepository.exportMetadataToCSV(
            dataElementLegendsRows,
            headers.dataElementLegendsHeaders,
            "dataElementLegends",
            path
        );

        await this.metadataRepository.exportMetadataToCSV(
            categoryCombosRows,
            headers.categoryCombosHeaders,
            "categoryCombos",
            path
        );
        await this.metadataRepository.exportMetadataToCSV(
            categoriesRows,
            headers.categoriesHeaders,
            "categories",
            path
        );
        await this.metadataRepository.exportMetadataToCSV(
            categoryOptionsRows,
            headers.categoryOptionsHeaders,
            "categoryOptions",
            path
        );

        await this.metadataRepository.exportMetadataToCSV(legendSetRows, headers.legendSetsHeaders, "legendSets", path);

        await this.metadataRepository.exportMetadataToCSV(legendsRows, headers.legendsHeaders, "legends", path);
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
            trackedEntityType: program.trackedEntityType?.id,
            categoryCombo: program.categoryCombo.id,
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
            program: programStage.program.id,
            enableUserAssignment: programStage.enableUserAssignment,
            blockEntryForm: programStage.blockEntryForm,
            featureType: programStage.featureType,
            preGenerateUID: programStage.preGenerateUID,
            executionDateLabel: programStage.executionDateLabel,
            validationStrategy: programStage.validationStrategy,
            description: programStage.description,
            minDaysFromStart: programStage.minDaysFromStart,
            repeatable: programStage.repeatable,
            periodType: programStage.preGenerateUID,
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
                name: deName,
                program: programName,
                programStage: programStage.name,
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
        dataElements: Ref[]
    ): ProgramStageSectionsDataElementsSheetRow[] {
        return dataElements.map(dataElement => {
            return {
                program: program,
                programStage: programStage,
                programStageSection: programStageSection,
                name: dataElement.id,
            };
        });
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
            optionSet: dataElement.optionSet,
            commentOptionSet: dataElement.commentOptionSet,
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

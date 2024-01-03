import _ from "lodash";
import { MetadataRepository, Query } from "domain/repositories/MetadataRepository";
import { DataSet, DataSetElement } from "domain/entities/DataSet";
import {
    DataSetsSheetRow,
    DataSetElementsSheetRow,
    DataElementsSheetRow,
    CategoryCombosSheetRow,
    CategoriesSheetRow,
    CategoryOptionsSheetRow,
} from "domain/entities/Sheet";
import { DataElement } from "domain/entities/DataElement";
import { Id, Path } from "../entities/Base";
import { fieldsType, metadataFields } from "utils/metadataFields";
import { CategoryCombo } from "domain/entities/CategoryCombo";
import { Category } from "../entities/Category";
import { CategoryOption } from "domain/entities/CategoryOptions";
import { SheetsRepository } from "domain/repositories/SheetsRepository";
import { SpreadSheet, SpreadSheetName } from "domain/entities/SpreadSheet";
import { convertHeadersToArray, headers } from "utils/csvHeaders";
import { Maybe } from "utils/ts-utils";
import { option } from "cmd-ts";
import logger from "utils/log";
import { defaultLanguages } from "utils/utils";
import { Translation } from "domain/entities/Translation";
import { DataElementGroup } from "domain/entities/DataElementGroup";
import { MetadataItem } from "domain/entities/MetadataItem";
import { DataElementGroupSet } from "domain/entities/DataElementGroupSet";

export class PullDataSetUseCase {
    constructor(private metadataRepository: MetadataRepository, private sheetsRepository: SheetsRepository) {}

    async execute({ dataSetId, spreadSheetId, csvPath }: PullDataSetUseCaseOptions) {
        const dataSetData = await this.getDataSetData([dataSetId]);

        const chunkedUniqueDEIds = _(dataSetData)
            .flatMap(dataSet => {
                return _(dataSet.dataSetElements)
                    .map(dataSetElement => {
                        return dataSetElement.dataElement.id;
                    })
                    .uniq()
                    .value();
            })
            .chunk(500)
            .value();

        const dataElementsData = await Promise.all(
            chunkedUniqueDEIds.map(async dataElementsIds => {
                return await this.getDataElementsData(dataElementsIds);
            })
        ).then(dataElementsDataArray => dataElementsDataArray.flat());

        const categoryCombosIds = _.concat(
            _.uniq(dataSetData.map(dataSet => dataSet.categoryCombo.id)),
            _.uniq(dataElementsData.map(dataElement => dataElement.categoryCombo.id))
        );
        const categoryCombosData = await this.getCategoryCombosData(categoryCombosIds);

        const categoriesIds = _.uniq(categoryCombosData.flatMap(cc => cc.categories).flatMap(ref => ref.id));
        const categoriesData = await this.getCategoriesData(categoriesIds);

        const categoryOptionsIds = _.uniq(categoriesData.flatMap(c => c.categoryOptions).flatMap(ref => ref.id));
        const categoryOptionsData = await this.getCategoryOptionsData(categoryOptionsIds);

        const dataSetRows = dataSetData.map(dataSet => this.buildDataSetRow(dataSet));

        const dataElementsRows = dataElementsData.map(dataElement => this.buildDataElementRow(dataElement));
        const dataSetElementsRows = dataSetData.flatMap(dataSet =>
            this.buildDataSetElementRows(dataSet.name, dataSet.dataSetElements, dataElementsData, categoryCombosData)
        );

        const categoryCombosRows = categoryCombosData.map(categoryCombo => this.buildCategoryComboRow(categoryCombo));
        const categoriesRows = categoriesData.map(categories => this.buildCategoryRow(categories, categoryCombosData));
        const categoryOptionsRows = categoryOptionsData.map(categoryOption =>
            this.buildCategoryOptionRow(categoryOption, categoriesData)
        );

        const allSections = dataSetData.flatMap(dataSet => dataSet.sections);
        const sectionsDataRows = allSections.map(dataSetSection => {
            return {
                id: dataSetSection.id,
                name: this.getValueOrEmpty(dataSetSection.name),
                code: this.getValueOrEmpty(dataSetSection.code),
                dataSet: this.getValueOrEmpty(dataSetSection.dataSet.id),
                showRowTotals: dataSetSection.showRowTotals,
                showColumnTotals: dataSetSection.showColumnTotals,
                description: this.getValueOrEmpty(dataSetSection.description),
            };
        });

        const sectionTranslationsRows = _(allSections)
            .flatMap(section => {
                return section.translations.map(translation => {
                    const localeDetails = defaultLanguages.find(language => language.id === translation.locale);
                    return {
                        id: section.id,
                        name: this.getValueOrEmpty(translation.property),
                        locale: localeDetails ? localeDetails.name : "",
                        value: this.getValueOrEmpty(translation.value),
                    };
                });
            })
            .value();

        const sectionDataElementsRows = allSections.flatMap(section => {
            return section.dataElements.map(dataElement => {
                return { dataSet: section.dataSet.id, section: section.id, name: dataElement.id };
            });
        });

        const relatedIdsInDataSet = this.getRelatedIdsInDataSets(dataSetData);
        const relatedIdsInDataElements = this.getRelatedIdsInDataElements(dataElementsData);

        const metadata = await this.metadataRepository.getByIds([...relatedIdsInDataSet, ...relatedIdsInDataElements]);

        const dataElementGroupsRows = this.buildDataElementGroupsRows(metadata);
        const dataElementGroupSetRows = this.buildDataElementGroupSetRows(metadata);
        const dataElementGroupSetGroupsRows = this.buildDataElementGroupSetGroupsRows(metadata.dataElementGroupSets);
        const dataElementGroupSetTranslationsRows = this.buildDataElementGroupSetTranslationsRows(
            metadata.dataElementGroupSets
        );
        const dataElementGroupElementsRows = this.buildDataElementGroupElementsRows(metadata.dataElementGroups);
        const dataElementGroupTranslationsRows = this.buildDataElementGroupTranslationsRows(metadata.dataElementGroups);

        const optionSetRows = _(metadata.optionSets)
            .map(optionSet => {
                return {
                    id: optionSet.id,
                    name: this.getValueOrEmpty(optionSet.name),
                    code: this.getValueOrEmpty(optionSet.code),
                    valueType: this.getValueOrEmpty(optionSet.valueType),
                    description: this.getValueOrEmpty(optionSet.description),
                };
            })
            .value();

        const optionsRows = _(metadata.options)
            .map(option => {
                return {
                    id: option.id,
                    name: this.getValueOrEmpty(option.name),
                    code: this.getValueOrEmpty(option.code),
                    optionSet: this.getValueOrEmpty(option.optionSet?.id),
                    shortName: this.getValueOrEmpty(option.shortName),
                    description: this.getValueOrEmpty(option.description),
                };
            })
            .value();

        const optionSetTranslationsRows = _(metadata.optionSets)
            .flatMap(optionSet => {
                const translations = this.buildTranslationsRows(optionSet.translations);
                return translations.map(translation => {
                    return { optionSet: optionSet.id, ...translation };
                });
            })
            .value();

        const dataSetInputPeriodsRows = dataSetData.flatMap(dataSet => {
            const periods = dataSet.dataInputPeriods.map(period => period);
            return periods.map((period): DataSetInputPeriodsRows => {
                return {
                    name: dataSet.id,
                    period: period.period.id,
                    openingDate: period.openingDate,
                    closingDate: period.closingDate,
                };
            });
        });

        const dataSetLegendsRows = dataSetData.flatMap(dataSet => {
            return dataSet.legendSets.map((legendSet): DataSetLegendRow => {
                return { dataSet: dataSet.id, name: legendSet.id };
            });
        });

        const dataSetTranslationsRows = dataSetData.flatMap(dataSet => {
            const translations = this.buildTranslationsRows(dataSet.translations);
            return translations.map(translation => {
                return { dataSet: dataSet.id, ...translation };
            });
        });

        const dataElementsTranslationsRows = dataElementsData.flatMap(dataElement => {
            const translations = this.buildTranslationsRows(dataElement.translations);
            return translations.map(translation => {
                return { dataElement: dataElement.id, ...translation };
            });
        });

        const dataElementsLegendsRows = this.buildDataElementsLegendsRows(dataElementsData);

        const categoryComboTranslationsRows = categoryCombosData.flatMap(categoryCombo => {
            const translations = this.buildTranslationsRows(categoryCombo.translations);
            return translations.map(translation => ({ categoryCombo: categoryCombo.id, ...translation }));
        });

        const categoryTranslationsRows = categoriesData.flatMap(category => {
            const translations = this.buildTranslationsRows(category.translations);
            return translations.map(translation => ({ categoryCombo: category.id, ...translation }));
        });

        const categoryOptionTranslationsRows = categoryOptionsData.flatMap(categoryOption => {
            const translations = this.buildTranslationsRows(categoryOption.translations);
            return translations.map(translation => ({ categoryCombo: categoryOption.id, ...translation }));
        });

        await this.generateSpreadSheet(
            spreadSheetId,
            csvPath,
            dataSetRows,
            dataSetElementsRows,
            dataElementsRows,
            categoryCombosRows,
            categoriesRows,
            categoryOptionsRows,
            sectionsDataRows,
            optionSetRows,
            optionsRows,
            optionSetTranslationsRows,
            sectionTranslationsRows,
            sectionDataElementsRows,
            dataSetInputPeriodsRows,
            dataSetLegendsRows,
            dataSetTranslationsRows,
            dataElementsTranslationsRows,
            dataElementsLegendsRows,
            categoryComboTranslationsRows,
            categoryTranslationsRows,
            categoryOptionTranslationsRows,
            dataElementGroupsRows,
            dataElementGroupElementsRows,
            dataElementGroupTranslationsRows,
            dataElementGroupSetRows,
            dataElementGroupSetGroupsRows,
            dataElementGroupSetTranslationsRows
        );
    }

    private buildDataElementGroupSetTranslationsRows(dataElementGroupSets: DataElementGroupSet[]) {
        return dataElementGroupSets.flatMap(dataElementGroupSet => {
            const translations = this.buildTranslationsRows(dataElementGroupSet.translations);
            return translations.map(translation => {
                return { dataElementGroupSet: dataElementGroupSet.id, ...translation };
            });
        });
    }

    private buildDataElementGroupSetGroupsRows(
        dataElementGroupSets: DataElementGroupSet[]
    ): DataElementGroupSetGroupsRow[] {
        return dataElementGroupSets.flatMap(dataElementGroupSet => {
            const dataElementGroupsIds = _(dataElementGroupSet.dataElementGroups)
                .map(dataElementGroup => dataElementGroup.id)
                .value();

            return dataElementGroupsIds.map(dataElementGroupId => {
                return { dataElementGroupSet: dataElementGroupSet.id, name: dataElementGroupId };
            });
        });
    }

    private buildDataElementGroupSetRows(metadata: MetadataItem) {
        return _(metadata.dataElementGroupSets)
            .map((dataElementGroupSet): DataElementGroupSetRow => {
                return {
                    id: dataElementGroupSet.id,
                    name: dataElementGroupSet.name,
                    shortName: dataElementGroupSet.shortName,
                    code: dataElementGroupSet.code,
                    description: dataElementGroupSet.description,
                    compulsory: this.booleanToString(dataElementGroupSet.compulsory),
                    dataDimension: this.booleanToString(dataElementGroupSet.dataDimension),
                };
            })
            .value();
    }

    private buildDataElementGroupTranslationsRows(dataElementGroups: DataElementGroup[]): TranslationRow[] {
        return dataElementGroups.flatMap(dataElementGroup => {
            const translations = this.buildTranslationsRows(dataElementGroup.translations);
            return translations.map(translation => {
                return { dataElementGroup: dataElementGroup.id, ...translation };
            });
        });
    }

    private buildDataElementGroupsRows(metadata: MetadataItem): DataElementGroupRow[] {
        return _(metadata.dataElementGroups)
            .map((dataElementGroup): DataElementGroupRow => {
                return {
                    id: dataElementGroup.id,
                    name: dataElementGroup.name,
                    shortName: dataElementGroup.shortName,
                    code: dataElementGroup.code,
                    description: dataElementGroup.description,
                };
            })
            .value();
    }

    private buildDataElementGroupElementsRows(dataElementGroupsRows: DataElementGroup[]): DataElementGroupElementRow[] {
        return dataElementGroupsRows.flatMap(dataElementGroup => {
            return dataElementGroup.dataElements.map((dataElement): DataElementGroupElementRow => {
                return { dataElementGroup: dataElementGroup.id, name: dataElement.id };
            });
        });
    }

    private getRelatedIdsInDataElements(dataElementsData: DataElement[]): Id[] {
        const deGroupIds = dataElementsData.flatMap(dataElement => {
            const groups = dataElement.dataElementGroups.map(dataElementGroup => dataElementGroup.id);
            return groups;
        });

        const deGroupSetIds = dataElementsData.flatMap(dataElement => {
            const dataGroupSetIds = dataElement.dataElementGroups.flatMap(dataElementGroup =>
                dataElementGroup.groupSets.map(groupSet => groupSet.id)
            );
            return dataGroupSetIds;
        });

        const uniqueDataElementGroupIds = _(deGroupIds).uniq().value();
        const uniqueDataElementGroupSetIds = _(deGroupSetIds).uniq().value();

        return [...uniqueDataElementGroupIds, ...uniqueDataElementGroupSetIds];
    }

    private getRelatedIdsInDataSets(dataSetData: DataSet[]) {
        return dataSetData.flatMap(dataSet => {
            const optionSetIds = _(dataSet.dataSetElements)
                .flatMap(dataSetElement => {
                    const optionSet = dataSetElement.dataElement.optionSet;
                    const optionSetId = optionSet?.id;
                    const optionsIds = _(optionSet?.options)
                        .map(option => option.id)
                        .compact()
                        .value();

                    const commentOptionSet = dataSetElement.dataElement.commentOptionSet;
                    const commentOptionSetId = commentOptionSet?.id;
                    const commentOptionsIds = _(commentOptionSet?.options)
                        .map(option => option.id)
                        .compact()
                        .value();
                    return [...optionsIds, ...commentOptionsIds, optionSetId, commentOptionSetId];
                })
                .compact()
                .uniq()
                .value();
            return optionSetIds;
        });
    }

    private buildDataElementsLegendsRows(dataElementsData: DataElement[]) {
        return dataElementsData.flatMap(dataElement => {
            return dataElement.legendSets.map(legendSet => {
                return { dataElement: dataElement.id, name: legendSet.id };
            });
        });
    }

    private buildTranslationsRows(translations: Translation[]): TranslationRow[] {
        return translations.map((translation: Translation): TranslationRow => {
            const localeDetails = defaultLanguages.find(language => language.id === translation.locale);
            if (!localeDetails) {
                logger.warn(`Locale ${translation.locale} not found for translation: ${translation.value}`);
            }
            return {
                name: this.getValueOrEmpty(translation.property),
                locale: localeDetails ? localeDetails.name : "",
                value: this.getValueOrEmpty(translation.value),
            };
        });
    }

    private getValueOrEmpty(value: string | undefined): Maybe<string> {
        return value ? value : "";
    }

    private async generateSpreadSheet(
        spreadSheetId: string,
        csvPath: string,
        dataSetRows: DataSetsSheetRow[],
        dataSetElementsRows: DataSetElementsSheetRow[],
        dataElementsRows: DataElementsSheetRow[],
        categoryCombosRows: CategoryCombosSheetRow[],
        categoriesRows: CategoriesSheetRow[],
        categoryOptionsRows: CategoryOptionsSheetRow[],
        sectionsDataRows: any[],
        optionSetsRows: any[],
        optionsRows: any[],
        optionSetTranslationsRows: any[],
        sectionTranslationsRows: any[],
        sectionDataElementsRows: any,
        dataSetInputPeriodsRows: DataSetInputPeriodsRows[],
        dataSetLegendsRows: DataSetLegendRow[],
        dataSetTranslationsRows: TranslationRow[],
        dataElementsTranslationsRows: TranslationRow[],
        dataElementsLegendsRows: DataElementLegendRow[],
        categoryComboTranslationsRows: TranslationRow[],
        categoriesTranslationsRows: TranslationRow[],
        categoryOptionTranslationsRows: TranslationRow[],
        dataElementGroupsRows: DataElementGroupRow[],
        dataElementGroupElementsRows: DataElementGroupElementRow[],
        dataElementGroupTranslationsRows: TranslationRow[],
        dataElementGroupSetRows: DataElementGroupSetRow[],
        dataElementGroupSetGroupsRows: DataElementGroupSetGroupsRow[],
        dataElementGroupSetTranslationsRows: TranslationRow[]
    ) {
        await this.sheetsRepository.save(spreadSheetId || csvPath, [
            this.convertToSpreadSheetValue("dataSets", dataSetRows, convertHeadersToArray(headers.dataSetsHeaders)),
            this.convertToSpreadSheetValue(
                "dataSetElements",
                dataSetElementsRows,
                convertHeadersToArray(headers.dataSetElementsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataSetInputPeriods",
                dataSetInputPeriodsRows,
                convertHeadersToArray(headers.dataSetInputPeriodsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataSetLegends",
                dataSetLegendsRows,
                convertHeadersToArray(headers.dataSetLegendsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataSetTranslations",
                dataSetTranslationsRows,
                convertHeadersToArray(headers.dataSetTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElements",
                dataElementsRows,
                convertHeadersToArray(headers.dataElementsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "sections",
                sectionsDataRows,
                convertHeadersToArray(headers.sectionsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "sectionDataElements",
                sectionDataElementsRows,
                convertHeadersToArray(headers.sectionsDataElementsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "sectionTranslations",
                sectionTranslationsRows,
                convertHeadersToArray(headers.sectionsTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElementLegends",
                dataElementsLegendsRows,
                convertHeadersToArray(headers.dataElementsLegendsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElementTranslations",
                dataElementsTranslationsRows,
                convertHeadersToArray(headers.dataElementsTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElementGroups",
                dataElementGroupsRows,
                convertHeadersToArray(headers.dataElementGroupsRowsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElementGroupElements",
                dataElementGroupElementsRows,
                convertHeadersToArray(headers.dataElementGroupElementsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElementGroupTranslations",
                dataElementGroupTranslationsRows,
                convertHeadersToArray(headers.dataElementGroupTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElementGroupSets",
                dataElementGroupSetRows,
                convertHeadersToArray(headers.dataElementGroupSetRowsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElementGroupSetGroups",
                dataElementGroupSetGroupsRows,
                convertHeadersToArray(headers.dataElementGroupSetGroupsRowsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElementGroupSetTranslations",
                dataElementGroupSetTranslationsRows,
                convertHeadersToArray(headers.dataElementGroupSetTranslationsRowsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categoryCombos",
                categoryCombosRows,
                convertHeadersToArray(headers.categoryCombosHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categoryComboTranslations",
                categoryComboTranslationsRows,
                convertHeadersToArray(headers.categoryCombosTranslationsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categories",
                categoriesRows,
                convertHeadersToArray(headers.categoriesHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categoryTranslations",
                categoriesTranslationsRows,
                convertHeadersToArray(headers.categoriesTranslationsHeaders)
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
                "optionSets",
                optionSetsRows,
                convertHeadersToArray(headers.optionSetsHeaders)
            ),
            this.convertToSpreadSheetValue("options", optionsRows, convertHeadersToArray(headers.optionsHeaders)),
            this.convertToSpreadSheetValue(
                "optionSetTranslations",
                optionSetTranslationsRows,
                convertHeadersToArray(headers.optionSetTranslationsHeaders)
            ),
        ]);
    }

    private convertToSpreadSheetValue(
        sheetName: SpreadSheetName,
        rows: DataSetsSheetRow[] | DataSetElementsSheetRow[] | DataElementsSheetRow[] | TranslationRow[],
        headers: string[]
    ): SpreadSheet {
        return { name: sheetName, range: "A2", values: rows.map(Object.values), columns: headers };
    }

    private async getDataSetData(dataSetId: Id[]): Promise<DataSet[]> {
        const dataSetQuery: Query = this.makeQuery("dataSets", metadataFields.dataSetFieds, dataSetId);
        return (await this.metadataRepository.getMetadata(dataSetQuery)) as DataSet[];
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

    private buildDataSetRow(dataSet: DataSet): DataSetsSheetRow {
        return {
            id: dataSet.id,
            name: dataSet.name,
            code: dataSet.code,
            shortName: dataSet?.shortName,
            description: dataSet?.description,
            expiryDays: dataSet?.expiryDays,
            openFuturePeriods: dataSet?.openFuturePeriods,
            timelyDays: dataSet?.timelyDays,
            periodType: dataSet?.periodType,
            categoryCombo: dataSet?.categoryCombo?.id,
            notifyCompletingUser: this.booleanToString(dataSet.notifyCompletingUser),
            workflow: dataSet?.workflow?.id,
            mobile: this.booleanToString(dataSet.mobile),
            fieldCombinationRequired: this.booleanToString(dataSet.fieldCombinationRequired),
            validCompleteOnly: this.booleanToString(dataSet.validCompleteOnly),
            noValueRequiresComment: this.booleanToString(dataSet.noValueRequiresComment),
            skipOffline: this.booleanToString(dataSet.skipOffline),
            dataElementDecoration: this.booleanToString(dataSet.dataElementDecoration),
            renderAsTabs: this.booleanToString(dataSet.renderAsTabs),
            renderHorizontally: this.booleanToString(dataSet.renderAsTabs),
            compulsoryFieldsCompleteOnly: this.booleanToString(dataSet.compulsoryFieldsCompleteOnly),
        };
    }

    private buildDataSetElementRows(
        dataSetName: string,
        dataSetElements: DataSetElement[],
        dataElementsData: DataElement[],
        categoryCombosData: CategoryCombo[]
    ): DataSetElementsSheetRow[] {
        return dataSetElements.map(dse => {
            const dataElementName = dataElementsData.find(deToFind => deToFind.id === dse.dataElement.id)?.name;
            if (!dataElementName) throw new Error(`dataElement name not found`);

            const categoryComboName = categoryCombosData.find(ccToFind => ccToFind.id === dse.categoryCombo?.id)?.name;

            return {
                dataSet: dataSetName,
                name: dataElementName,
                categoryCombo: categoryComboName,
            };
        });
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

    private booleanToString(bool: boolean) {
        return bool ? "TRUE" : "FALSE";
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
}

type PullDataSetUseCaseOptions = { dataSetId: string; spreadSheetId: string; csvPath: Path };

type DataSetInputPeriodsRows = { name: string; period: string; openingDate: string; closingDate: string };

type DataSetLegendRow = { dataSet: string; name: string };

type TranslationRow = { name: Maybe<string>; locale: Maybe<string>; value: Maybe<string> };
type DataElementLegendRow = { dataElement: string; name: string };
type DataElementGroupElementRow = { dataElementGroup: string; name: string };
type DataElementGroupRow = Omit<DataElementGroup, "translations" | "dataElements" | "groupSets">;
type DataElementGroupSetRow = Omit<
    DataElementGroupSet,
    "compulsory" | "dataDimension" | "dataElementGroups" | "translations"
> & {
    compulsory: string;
    dataDimension: string;
};
type DataElementGroupSetGroupsRow = { dataElementGroupSet: string; name: string };

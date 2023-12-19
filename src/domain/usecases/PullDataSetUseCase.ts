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

        await this.generateSpreadSheet(
            spreadSheetId,
            csvPath,
            dataSetRows,
            dataSetElementsRows,
            dataElementsRows,
            categoryCombosRows,
            categoriesRows,
            categoryOptionsRows
        );
    }

    private async generateSpreadSheet(
        spreadSheetId: string,
        csvPath: string,
        dataSetRows: DataSetsSheetRow[],
        dataSetElementsRows: DataSetElementsSheetRow[],
        dataElementsRows: DataElementsSheetRow[],
        categoryCombosRows: CategoryCombosSheetRow[],
        categoriesRows: CategoriesSheetRow[],
        categoryOptionsRows: CategoryOptionsSheetRow[]
    ) {
        await this.sheetsRepository.save(spreadSheetId || csvPath, [
            this.convertToSpreadSheetValue("dataSets", dataSetRows, convertHeadersToArray(headers.dataSetsHeaders)),
            this.convertToSpreadSheetValue(
                "dataSetElements",
                dataSetElementsRows,
                convertHeadersToArray(headers.dataSetElementsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "dataElements",
                dataElementsRows,
                convertHeadersToArray(headers.dataElementsHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categoryCombos",
                categoryCombosRows,
                convertHeadersToArray(headers.categoryCombosHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categories",
                categoriesRows,
                convertHeadersToArray(headers.categoriesHeaders)
            ),
            this.convertToSpreadSheetValue(
                "categoryOptions",
                categoryOptionsRows,
                convertHeadersToArray(headers.categoryOptionsHeaders)
            ),
        ]);
    }

    private convertToSpreadSheetValue(
        sheetName: SpreadSheetName,
        rows: DataSetsSheetRow[] | DataSetElementsSheetRow[] | DataElementsSheetRow[],
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

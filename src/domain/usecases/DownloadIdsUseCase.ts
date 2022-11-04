import _ from "lodash";
import { MetadataItem } from "domain/entities/MetadataItem";
import { Sheet } from "domain/entities/Sheet";
import { createObjectCsvWriter } from "csv-writer";
import { getItems } from "utils/utils";
import log from "utils/log";
import { SheetsRepository } from "domain/repositories/SheetsRepository";
import { MetadataRepository } from "domain/repositories/MetadataRepository";

const env = process.env;

type MetadataQuery = { [key: string]: any };
type Query = { type: string; value: MetadataQuery };
type FilterNames = { [key: string]: string[] };

export class DownloadIdsUseCase {
    constructor(
        private sheetsRepository: SheetsRepository,
        private metadataRepository: MetadataRepository,
        private path?: string
    ) {}

    async execute(sheetId: string) {
        const sheets = await this.sheetsRepository.getSpreadsheet(sheetId);

        await this.pullMetadata(sheets);
    }

    private allowedTypesArray = [
        "programSections",
        "programs",
        "programStages",
        "programStageSections",
        "trackedEntityTypes",
        "trackedEntityAttributes",
        "programRules",
        "programRuleVariables",
        "dataElements",
        "dataElementGroups",
        "dataElementGroupSets",
        "dataSets",
        "sections",
        "categories",
        "categoryCombos",
        "categoryOptions",
        "options",
        "optionSets",
        "legendSets",
        "attributes",
    ];

    // Get names from spreadsheet data
    private getNamesFromSpreadsheet(sheets: Sheet[]) {
        let filterNames: FilterNames = {};

        sheets.forEach(sheet => {
            if (!_.isEmpty(sheet.items)) {
                filterNames[sheet.name] = [];
                sheet.items.forEach(item => {
                    filterNames[sheet.name]?.push(item["name"]);
                });
            }
        });

        return filterNames;
    }

    // Make the appropriate query from the template for one metadata type
    private makeMetadataItemQuery(itemType: string, namesToFilter?: string[]) {
        let query: MetadataQuery = {};
        query[itemType] = {
            fields: {
                id: true,
            },
        };

        if (!_.isEmpty(namesToFilter)) {
            query[itemType]["filter"] = { name: { in: namesToFilter } };
        }
        return query;
    }

    // Make filtered query for each type present in names
    private makeQueries(names: FilterNames) {
        let queries: Query[] = [];

        Object.entries(names).forEach(([metadataItemType, nameArray]) => {
            if (this.allowedTypesArray.includes(metadataItemType)) {
                queries.push({
                    type: metadataItemType,
                    value: this.makeMetadataItemQuery(metadataItemType, nameArray),
                });
            }
        });

        return queries;
    }

    private makeCsvHeader(element: object) {
        const keys = Object.keys(element).filter(key => key !== "id");
        let csvHeaders: { id: string; title: string }[] = [
            {
                id: "id",
                title: "id",
            },
        ];

        keys.forEach(headerItem => {
            csvHeaders.push({
                id: headerItem,
                title: headerItem,
            });
        });

        return csvHeaders;
    }

    private writeCsv(metadataType: string, metadata: MetadataItem[]) {
        const filePath = `${this.path ? this.path : ""}${metadataType}.csv`;

        if (!metadata[0]) throw new Error("writeCsv metadata item empty.");
        const header = this.makeCsvHeader(metadata[0]);

        const Writer = createObjectCsvWriter({ path: filePath, header });

        Writer.writeRecords(metadata);
        log.info(`Written: ${filePath}`);
    }

    private async pullProgramRulesMetadata(query: Query, praSheet: MetadataItem[]) {
        const prQuery = { ...query };
        prQuery.value.programRules.fields.name = true;
        prQuery.value.programRules.fields.programRuleActions = true;

        const metadata = await this.metadataRepository.getMetadata(prQuery);

        const prMetadata = metadata.map(item => ({ id: item.id }));
        if (!_.isEmpty(prMetadata)) {
            this.writeCsv(query.type, prMetadata);
        }

        const praQuerys: Query = {
            type: "programRuleActions",
            value: {
                programRuleActions: {
                    fields: { id: true, programRuleActionType: true, programRule: true },
                    filter: {
                        id: {
                            in: metadata.flatMap(prItem =>
                                prItem.programRuleActions.map((item: { id: any }) => item.id)
                            ),
                        },
                    },
                },
            },
        };

        const praMetadata = await this.metadataRepository.getMetadata(praQuerys);

        if (!_.isEmpty(praMetadata)) {
            const praMetadataIds = praSheet.flatMap(praSheetItem => {
                const praMetadataItem = praMetadata.find(praMetaToFilter => {
                    const prName = metadata.find(item => item.id === praMetaToFilter.programRule.id)?.name;
                    return (
                        prName === praSheetItem.programRule &&
                        praMetaToFilter.programRuleActionType === praSheetItem.name
                    );
                });
                return { id: praMetadataItem?.id };
            });

            this.writeCsv("programRuleActions", praMetadataIds);
        }
    }

    private async pullMetadata(sheets: Sheet[]) {
        const filterNames = this.getNamesFromSpreadsheet(sheets);

        const queries = this.makeQueries(filterNames);

        return new Promise(() => {
            queries.forEach(async query => {
                if (query.type === "programRules") {
                    await this.pullProgramRulesMetadata(query, getItems(sheets, "programRuleActions"));
                } else {
                    const metadata = await this.metadataRepository.getMetadata(query);
                    if (!_.isEmpty(metadata)) {
                        this.writeCsv(query.type, metadata);
                    }
                }
            });
        });
    }
}

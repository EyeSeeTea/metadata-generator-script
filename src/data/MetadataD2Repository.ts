import _ from "lodash";
import { D2Api, MetadataResponse } from "@eyeseetea/d2-api/2.36";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Header, MetadataRepository, Query } from "domain/repositories/MetadataRepository";
import * as CsvWriter from "csv-writer";
import { metadataFields } from "utils/metadataFields";
import { promiseMap } from "utils/utils";

const emptyMetadataResponse = {
    dataSets: [],
    dataElements: [],
    dataElementGroups: [],
    dataElementGroupSets: [],
    options: [],
    sections: [],
    categories: [],
    categoryCombos: [],
    categoryOptions: [],
    optionSets: [],
    trackedEntityAttributes: [],
    trackedEntityTypes: [],
    programSections: [],
    programs: [],
    programStages: [],
    programStageSections: [],
    programRules: [],
    programRuleActions: [],
    programRuleVariables: [],
    legendSets: [],
    attributes: [],
};

export class MetadataD2Repository implements MetadataRepository {
    constructor(private api: D2Api) {}

    async getByIds(metadataIds: string[]): Promise<MetadataItem> {
        if (metadataIds.length === 0) return emptyMetadataResponse;
        const allMetadata = await promiseMap(_.chunk(metadataIds, 100), async ids => {
            const metadata = await this.api
                .request<MetadataItem>({
                    url: "/metadata",
                    method: "get",
                    params: { fields: ":owner", filter: `id:in:[${ids.join(",")}]` },
                })
                .getData();
            return _.omit(metadata, "system") as MetadataItem;
        });

        return allMetadata.reduce((acum, item) => {
            return { ...acum, ...(item || {}) };
        }, emptyMetadataResponse);
    }

    async getMetadata(query: Query): Promise<MetadataItem[]> {
        const metadata: MetadataItem[] = await this.api.metadata
            .get(query.value)
            .getData()
            .then(results => {
                let resultsAsMetadataItem = _.omit(results, "system") as MetadataItem;
                return resultsAsMetadataItem[query.type];
            });

        return metadata;
    }

    // TODO: Needs debuging/cleanup/alternative
    async getProgramRulesofPrograms(programIds: string[]): Promise<MetadataItem[]> {
        const metadata: MetadataItem[] = await this.api
            .get<any>("programRules", {
                fields: _(metadataFields.programRulesFields).keys().value(),
                filter: `program.id:in:[${programIds}]`,
                pageSize: 200,
            })
            .getData()
            .then(data => data.programRules);

        return metadata;
    }

    // Connect to a server using the given D2Api and upload the given metadata.
    async uploadMetadata(metadata: any): Promise<MetadataResponse> {
        const { response } = await this.api.metadata
            .postAsync(metadata, { importStrategy: "CREATE_AND_UPDATE", mergeMode: "MERGE" })
            .getData();

        const result = await this.api.system.waitFor(response.jobType, response.id).getData();

        if (!result) throw new Error("Upload Metadata Async Job not respoding");
        return result;
    }

    async updateCategoryOptionCombos(): Promise<void> {
        await this.api.maintenance.categoryOptionComboSingleUpdate("categoryOptionComboUpdate").getData();
    }

    async exportMetadataToCSV(metadata: MetadataItem[], header: Header, file: string, path?: string): Promise<void> {
        const createCsvWriter = CsvWriter.createObjectCsvWriter;
        const csvWriter = createCsvWriter({
            path: `${path ? path : "."}/${file}.csv`,
            header: header,
            fieldDelimiter: ";",
        });

        await csvWriter.writeRecords(metadata);
    }
}

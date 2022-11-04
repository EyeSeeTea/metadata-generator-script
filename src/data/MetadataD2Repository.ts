// REPO FOR METADATA GET/POST CODE
import _ from "lodash";
import { D2Api, MetadataResponse } from "@eyeseetea/d2-api/2.34";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { MetadataRepository, Query } from "domain/repositories/MetadataRepository";

export class MetadataD2Repository implements MetadataRepository {
    constructor(private api: D2Api) {}

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
        await this.api.maintenance.categoryOptionComboUpdate().getData();
    }
}

// METADATA INTERFACE DEF
import { MetadataItem, MetadataResponse } from "domain/entities/MetadataItem";

export interface MetadataRepository {
    getMetadata(query: Query): Promise<MetadataItem[]>;
    uploadMetadata(metadata: any): Promise<MetadataResponse>;
    updateCategoryOptionCombos(): Promise<void>;
}

type MetadataQuery = { [key: string]: any };
export type Query = { type: string; value: MetadataQuery };

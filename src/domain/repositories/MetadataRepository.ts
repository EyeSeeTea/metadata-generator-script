import { MetadataItem, MetadataResponse } from "domain/entities/MetadataItem";

export interface MetadataRepository {
    getMetadata(query: Query): Promise<MetadataItem[]>;
    uploadMetadata(metadata: any): Promise<MetadataResponse>;
    updateCategoryOptionCombos(): Promise<void>;
    exportMetadataToCSV(metadata: MetadataItem[], header: any, file: string, path?: string): Promise<void>;
}

export type MetadataQuery = { [key: string]: any };
export type Query = { type: string; value: MetadataQuery };
export type Header = { id: string; title: string }[];

import { MetadataItem, MetadataResponse } from "domain/entities/MetadataItem";

export interface MetadataRepository {
    getMetadata(query: Query): Promise<MetadataItem[]>;
    getProgramRulesofPrograms(programIds: string[]): Promise<MetadataItem[]>;
    uploadMetadata(metadata: any, importOptions: ImportOptions): Promise<MetadataResponse>;
    updateCategoryOptionCombos(): Promise<void>;
    exportMetadataToCSV(metadata: MetadataItem[], header: any, file: string, path?: string): Promise<void>;
}

export type MetadataQuery = { [key: string]: any };
export type Query = { type: string; value: MetadataQuery };
export type Header = { id: string; title: string }[];

export type ImportOptions = {
    mode?: "MERGE" | "REPLACE";
};

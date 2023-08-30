import { D2ModelSchemas } from "../../types/d2-api";

export type MetadataType = keyof D2ModelSchemas;

export type MetadataPackage = Record<MetadataType, MetadataItem[]>;

export type MetadataItem = { [key: string]: any };

export type { MetadataResponse, Stats as MetadataResponseStats } from "../../types/d2-api";

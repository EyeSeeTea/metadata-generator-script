import { MetadataItem } from "./MetadataItem";

export type MetadataOutput = {
    dataSets: MetadataItem[];
    dataElements: MetadataItem[];
    dataElementGroups: MetadataItem[];
    dataElementGroupSets: MetadataItem[];
    options: MetadataItem[];
    sections: MetadataItem[];
    categories: MetadataItem[];
    categoryCombos: MetadataItem[];
    categoryOptions: MetadataItem[];
    optionSets: MetadataItem[];
    trackedEntityAttributes: MetadataItem[];
    trackedEntityTypes: MetadataItem[];
    programSections: MetadataItem[];
    programs: MetadataItem[];
    programStages: MetadataItem[];
    programStageSections: MetadataItem[];
    programRules: MetadataItem[];
    programRuleActions: MetadataItem[];
    programRuleVariables: MetadataItem[];
    legendSets: MetadataItem[];
    attributes: MetadataItem[];
};

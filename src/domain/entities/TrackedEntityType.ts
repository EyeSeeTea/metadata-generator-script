import { Maybe } from "utils/ts-utils";
import { Id } from "./Base";
import { LegendSet } from "./LegendSet";
import { OptionSet } from "./OptionSet";
import { Translation } from "./Translation";

export type TrackedEntityType = {
    id: Id;
    name: string;
    description: string;
    allowAuditLog: boolean;
    minAttributesRequiredToSearch: number;
    maxTeiCountToReturn: number;
    featureType: string;
    trackedEntityTypeAttributes: TrackedEntityTypeAttribute[];
    translations: Translation[];
};

export type TrackedEntityTypeAttribute = {
    id: Id;
    mandatory: boolean;
    displayInList: boolean;
    searchable: boolean;
    trackedEntityAttribute: TrackedEntityAttribute;
};

export type TrackedEntityAttribute = {
    id: Id;
    name: string;
    shortName: string;
    formName: string;
    code: string;
    description: string;
    fieldMask: string;
    optionSet: Maybe<OptionSet>;
    valueType: string;
    aggregationType: string;
    unique: boolean;
    orgunitScope: boolean;
    generated: boolean;
    pattern: string;
    inherit: boolean;
    confidential: boolean;
    displayInListNoProgram: boolean;
    skipSynchronization: boolean;
    translations: Translation[];
    legendSets: LegendSet[];
};

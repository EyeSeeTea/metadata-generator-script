import { AggregationType, ValueType, DomainType, Id, Ref } from "./Base";
import { CategoryCombo } from "./CategoryCombo";
import { DataElementGroup } from "./DataElementGroup";
import { LegendSet } from "./LegendSet";
import { OptionSet } from "./OptionSet";
import { Translation } from "./Translation";

export interface DataElement {
    id: Id;
    name: string;
    shortName: string;
    formName: string;
    code: string;
    categoryCombo: CategoryCombo;
    valueType: ValueType;
    aggregationType: AggregationType;
    domainType: DomainType;
    description: string;
    optionSet?: OptionSet;
    commentOptionSet?: OptionSet;
    zeroIsSignificant: boolean;
    url: string;
    fieldMask: string;
    legendSets: LegendSet[];
    translations: Translation[];
    dataElementGroups: Pick<DataElementGroup, "id" | "groupSets">[];
}

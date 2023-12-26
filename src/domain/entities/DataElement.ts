import { AggregationType, ValueType, DomainType, Id, Ref } from "./Base";
import { Translation } from "./Translation";

export interface DataElement {
    id: Id;
    name: string;
    shortName: string;
    formName: string;
    code: string;
    categoryCombo: Ref;
    valueType: ValueType;
    aggregationType: AggregationType;
    domainType: DomainType;
    description: string;
    optionSet: Ref;
    commentOptionSet: Ref;
    zeroIsSignificant: boolean;
    url: string;
    fieldMask: string;
    legendSets: Ref[];
    translations: Translation[];
    dataElementGroups: Ref[];
}

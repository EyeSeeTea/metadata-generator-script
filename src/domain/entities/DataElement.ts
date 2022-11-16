import { AggregationType, ValueType, DomainType, Id, Ref } from "./Base";

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
    optionSet: string;
    commentOptionSet: string;
    zeroIsSignificant: boolean;
    url: string;
    fieldMask: string;
    //     attributeValues: D2AttributeValueGeneric<D2Attribute>[];

    //     legendSet: D2LegendSet;
    //     legendSets: D2LegendSet[];

    //     optionSetValue: boolean;

    //     translations: D2Translation[];
}

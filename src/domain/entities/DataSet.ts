import { PeriodType, Id, Ref, NamedRef } from "./Base";
import { CategoryCombo } from "./CategoryCombo";
import { DataElement } from "./DataElement";
import { LegendSet } from "./LegendSet";
import { Translation } from "./Translation";

export interface DataSet {
    id: Id;
    name: string;
    code: string;
    shortName: string;
    description: string;
    validCompleteOnly: boolean;
    dataElementDecoration: boolean;
    notifyCompletingUser: boolean;
    noValueRequiresComment: boolean;
    skipOffline: boolean;
    compulsoryFieldsCompleteOnly: boolean;
    fieldCombinationRequired: boolean;
    renderHorizontally: boolean;
    renderAsTabs: boolean;
    mobile: boolean;
    openPeriodsAfterCoEndDate: number;
    timelyDays: number;
    periodType: PeriodType;
    openFuturePeriods: number;
    expiryDays: number;
    categoryCombo: Pick<CategoryCombo, "id" | "name">;
    workflow: Ref;
    dataSetElements: Array<DataSetElement>;
    dataInputPeriods: Array<{ openingDate: string; closingDate: string; period: { id: string } }>;
    // attributeValues: Array<{ value: string; attribute: Ref }>;
    indicators: Ref[];
    legendSets: LegendSet[];
    sections: DataSetSection[];
    translations: Translation[];
}

export interface DataSetSection extends NamedRef {
    code: string;
    dataSet: Ref;
    description: string;
    showColumnTotals: boolean;
    showRowTotals: boolean;
    translations: Translation[];
    dataElements: DataElement[];
}

export interface DataSetElement {
    dataSet: Ref;
    dataElement: {
        id: Id;
        optionSet?: {
            id: Id;
            options: Ref[];
        };
        commentOptionSet?: {
            id: Id;
            options: Ref[];
        };
    };
    categoryCombo?: Ref;
}

export interface DataSetMetadata {
    dataSets: DataSet[];
}

export interface DataSet2 {
    id: Id;
    name: string;
    categoryCombo: CategoryCombo;
    dataSetElements: Array<{
        dataElement: DataSetDataElement;
        categoryCombo?: CategoryCombo;
    }>;
    dataInputPeriods: Array<{ period: { id: string } }>;
    organisationUnits: Ref[];
}

// interface CategoryCombo {
//     id: Id;
//     categoryOptionCombos: Ref[];
// }

export interface DataSetDataElement {
    id: Id;
    categoryCombo: CategoryCombo;
}

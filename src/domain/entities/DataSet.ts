import { PeriodType, Id, Ref } from "./Base";

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
    categoryCombo: Ref;
    workflow: Ref;
    dataSetElements: Array<DataSetElement>;
    dataInputPeriods: Array<{ openingDate: string; closingDate: string; period: { id: string } }>;
    // attributeValues: Array<{ value: string; attribute: Ref }>;
    indicators: Ref[];
    legendSets: Ref[];
    sections: Ref[];
}

export interface DataSetElement {
    dataSet: Ref;
    dataElement: Ref;
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

interface CategoryCombo {
    id: Id;
    categoryOptionCombos: Ref[];
}

export interface DataSetDataElement {
    id: Id;
    categoryCombo: CategoryCombo;
}

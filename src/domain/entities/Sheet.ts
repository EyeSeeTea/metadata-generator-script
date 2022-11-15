import { PeriodType, AggregationType, ValueType, domainType, dataDimensionType } from "./Base";
import { MetadataItem } from "./MetadataItem";

export interface Sheet {
    name: string;
    items: MetadataItem[];
}

export interface GoogleSheet {
    name: string;
    data: Array<Array<Cell>>;
}

export interface Cell {
    /**
     * The effective value of the cell. For cells with formulas, this is the calculated value. For cells with literals, this is the same as the user_entered_value. This field is read-only.
     */
    effectiveValue?: CellValue;
    /**
     * The value the user entered in the cell. e.g, `1234`, `'Hello'`, or `=NOW()` Note: Dates, Times and DateTimes are represented as doubles in serial number format.
     */
    userEnteredValue?: CellValue;
    /**
     * The formatted value of the cell. This is the value as it's shown to the user. This field is read-only.
     */
    value?: string;
    /**
     * A hyperlink this cell points to, if any. If the cell contains multiple hyperlinks, this field will be empty. This field is read-only. To set it, use a `=HYPERLINK` formula in the userEnteredValue.formulaValue field. A cell-level link can also be set from the userEnteredFormat.textFormat field. Alternatively, set a hyperlink in the textFormatRun.format.link field that spans the entire cell.
     */
    hyperlink?: string;
    /**
     * Any note on the cell.
     */
    note?: string;
}

export interface CellValue {
    /**
     * Represents a boolean value.
     */
    boolValue?: boolean | null;
    /**
     * Represents an error. This field is read-only.
     */
    errorValue?: {
        /**
         * A message with more information about the error (in the spreadsheet's locale).
         */
        message?: string | null;
        /**
         * The type of error.
         */
        type?: string | null;
    };
    /**
     * Represents a formula.
     */
    formulaValue?: string | null;
    /**
     * Represents a double value. Note: Dates, Times and DateTimes are represented as doubles in SERIAL_NUMBER format.
     */
    numberValue?: number | null;
    /**
     * Represents a string value. Leading single quotes are not included. For example, if the user typed `'123` into the UI, this would be represented as a `stringValue` of `"123"`.
     */
    stringValue?: string | null;
}

export interface DataSetsSheetRow {
    id: string;
    name: string;
    code?: string;
    shortName?: string;
    description?: string;
    expiryDays?: number;
    openFuturePeriods?: number;
    timelyDays?: number;
    periodType: PeriodType;
    categoryCombo?: string;
    notifyCompletingUser?: string;
    workflow?: string;
    mobile?: string;
    fieldCombinationRequired?: string;
    validCompleteOnly?: string;
    noValueRequiresComment?: string;
    skipOffline?: string;
    dataElementDecoration?: string;
    renderAsTabs?: string;
    renderHorizontally?: string;
    compulsoryFieldsCompleteOnly?: string;
}

export interface DataSetElementsSheetRow {
    dataSet: string;
    name: string;
    categoryCombo?: string;
}

export interface DataElementsSheetRow {
    id?: string;
    name: string;
    shortName?: string;
    formName?: string;
    code?: string;
    categoryCombo?: string;
    valueType?: ValueType;
    aggregationType?: AggregationType;
    domainType?: domainType;
    description?: string;
    optionSet?: string;
    commentOptionSet?: string;
    zeroIsSignificant?: string;
    url?: string;
    fieldMask?: string;
}

export interface CategoryCombosSheetRow {
    id: string;
    name: string;
    code: string;
    dataDimensionType: dataDimensionType;
    description: string;
}

export interface CategoriesSheetRow {
    id: string;
    name: string;
    shortName: string;
    code: string;
    categoryCombo: string;
    dataDimensionType: dataDimensionType;
    description: string;
}

export interface CategoryOptionsSheetRow {
    id: string;
    name: string;
    code: string;
    shortName: string;
    description: string;
    category: string;
}

import _ from "lodash";

export type Id = string;
export type Ref = { id: Id };
export type NamedRef = { id: Id; name: string };

export type ValueType =
    | "TEXT"
    | "LONG_TEXT"
    | "LETTER"
    | "PHONE_NUMBER"
    | "EMAIL"
    | "BOOLEAN"
    | "TRUE_ONLY"
    | "DATE"
    | "DATETIME"
    | "TIME"
    | "NUMBER"
    | "UNIT_INTERVAL"
    | "PERCENTAGE"
    | "INTEGER"
    | "INTEGER_POSITIVE"
    | "INTEGER_NEGATIVE"
    | "INTEGER_ZERO_OR_POSITIVE"
    | "TRACKER_ASSOCIATE"
    | "USERNAME"
    | "COORDINATE"
    | "ORGANISATION_UNIT"
    | "AGE"
    | "URL"
    | "FILE_RESOURCE"
    | "IMAGE"
    | "";

export type AggregationType =
    | "SUM"
    | "AVERAGE"
    | "AVERAGE_SUM_ORG_UNIT"
    | "LAST"
    | "LAST_AVERAGE_ORG_UNIT"
    | "LAST_IN_PERIOD"
    | "LAST_IN_PERIOD_AVERAGE_ORG_UNIT"
    | "FIRST"
    | "FIRST_AVERAGE_ORG_UNIT"
    | "COUNT"
    | "STDDEV"
    | "VARIANCE"
    | "MIN"
    | "MAX"
    | "NONE"
    | "CUSTOM"
    | "DEFAULT"
    | "";

export type PeriodType =
    | "Daily"
    | "Weekly"
    | "WeeklyWednesday"
    | "WeeklyThursday"
    | "WeeklySaturday"
    | "WeeklySunday"
    | "Biweekly"
    | "Monthly"
    | "BiMonthly"
    | "Quarterly"
    | "SixMonthly"
    | "SixMonthlyApril"
    | "SixMonthlyNovember"
    | "Yearly"
    | "FinancialApril"
    | "FinancialJuly"
    | "FinancialOctober"
    | "FinancialNovember"
    | "";

export type AccessLevelType = "OPEN" | "AUDITED" | "PROTECTED" | "CLOSED" | "";

export type FeatureType = "NONE" | "POINT" | "POLYGON" | "";

export type ValidationStrategyType = "ON_COMPLETE" | "ON_UPDATE_AND_INSERT";

export type DataDimensionType = "DISAGGREGATION" | "ATTRIBUTE";

export type DomainType = "TRACKER" | "AGGREGATE";

export type DataElementRenderType =
    | "DEFAULT"
    | "DROPDOWN"
    | "VERTICAL_RADIOBUTTONS"
    | "HORIZONTAL_RADIOBUTTONS"
    | "VERTICAL_CHECKBOXES"
    | "HORIZONTAL_CHECKBOXES"
    | "SHARED_HEADER_RADIOBUTTONS"
    | "ICONS_AS_BUTTONS"
    | "SPINNER"
    | "ICON"
    | "TOGGLE"
    | "VALUE"
    | "SLIDER"
    | "LINEAR_SCALE";

export type ProgramStageSectionRenderType = "LISTING" | "SEQUENTIAL" | "MATRIX";

export type RenderType = {
    MOBILE: {
        type: DataElementRenderType | ProgramStageSectionRenderType;
    };
    DESKTOP: {
        type: DataElementRenderType | ProgramStageSectionRenderType;
    };
};

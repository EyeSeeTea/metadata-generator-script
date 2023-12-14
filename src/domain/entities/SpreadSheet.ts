export type SpreadSheet = {
    name: SpreadSheetName;
    range: A1Notation;
    values: SpreadSheetValue;
};

// A1 Notation examples: https://developers.google.com/sheets/api/guides/concepts#expandable-1
type A1Notation = string;

export type SpreadSheetName = string;
type SpreadSheetValue = (string | number | undefined)[][];

import { Sheet } from "domain/entities/Sheet";

export interface SheetsRepository {
    getSpreadsheet(googleSheetId: string): Promise<Sheet[]>;
}

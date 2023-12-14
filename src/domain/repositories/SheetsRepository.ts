import { Sheet } from "domain/entities/Sheet";
import { SpreadSheet } from "domain/entities/SpreadSheet";

export interface SheetsRepository {
    getSpreadsheet(googleSheetId: string): Promise<Sheet[]>;
    save(googleSheetId: string, sheets: SpreadSheet[]): Promise<void>;
}

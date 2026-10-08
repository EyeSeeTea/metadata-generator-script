import { Sheet } from "domain/entities/Sheet";
import { SpreadSheet } from "domain/entities/SpreadSheet";

export interface SheetsRepository {
    getSpreadsheet(googleSheetId: string): Promise<Sheet[]>;
    getProgramNameRows?(googleSheetId: string): Promise<Array<string | undefined>>;
    save(id: string, sheets: SpreadSheet[]): Promise<void>;
}

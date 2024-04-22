import { Sheet } from "domain/entities/Sheet";
import { SpreadSheet } from "domain/entities/SpreadSheet";
import { SheetsRepository } from "domain/repositories/SheetsRepository";
import * as CsvWriter from "csv-writer";

export class CsvRepository implements SheetsRepository {
    getSpreadsheet(): Promise<Sheet[]> {
        throw new Error("Method not implemented.");
    }

    async save(path: string, sheets: SpreadSheet[]): Promise<void> {
        for await (const sheet of sheets) {
            const csvWriter = CsvWriter.createArrayCsvWriter({
                path: `${path ? path : "."}/${sheet.name}.csv`,
                header: sheet.columns,
                // fieldDelimiter: ";",
            });
            await csvWriter.writeRecords(sheet.values);
        }
    }
}

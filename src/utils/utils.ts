import fs from "fs";
import _ from "lodash";
import { MetadataResponse } from "domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";
import { MetadataOutput } from "domain/entities/MetadataOutput";

// Connect to a server using the given D2Api and upload the given metadata.
export function makeUploadMetadataLog(result: MetadataResponse) {
    return result.typeReports?.flatMap(({ klass, objectReports }) =>
        objectReports.flatMap(({ errorReports }) =>
            errorReports.flatMap(({ message, errorProperty }) => `${klass} ${errorProperty} ${message}`)
        )
    );
}

// Return all the items (rows) from the sheet with the given name.
export function getItems(sheets: Sheet[], name: string) {
    return sheets.find(sheet => sheet.name === name)?.items ?? [];
}

export function writeToJSON(metadata: MetadataOutput, path?: string) {
    fs.writeFileSync(path ? path : "out.json", JSON.stringify(metadata, null, 4));
}

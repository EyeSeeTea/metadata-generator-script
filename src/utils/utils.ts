import fs from "fs";
import _ from "lodash";
import { MetadataResponse } from "domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";
import { MetadataOutput } from "domain/entities/MetadataOutput";
import { Maybe } from "./ts-utils";

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

export function promiseMap<T, S>(inputValues: T[], mapper: (value: T) => Promise<S>): Promise<S[]> {
    const reducer = (acc$: Promise<S[]>, inputValue: T): Promise<S[]> =>
        acc$.then((acc: S[]) =>
            mapper(inputValue).then(result => {
                acc.push(result);
                return acc;
            })
        );
    return inputValues.reduce(reducer, Promise.resolve([]));
}

export const defaultLanguages = [
    {
        id: "af",
        name: "Afrikaans",
    },
    {
        id: "am",
        name: "Amharic",
    },
    {
        id: "ar",
        name: "Arabic",
    },
    {
        id: "bi",
        name: "Bislama",
    },
    {
        id: "my",
        name: "Burmese",
    },
    {
        id: "zh",
        name: "Chinese",
    },
    {
        id: "nl",
        name: "Dutch",
    },
    {
        id: "dz",
        name: "Dzongkha",
    },
    {
        id: "en",
        name: "English",
    },
    {
        id: "fr",
        name: "French",
    },
    {
        id: "de",
        name: "German",
    },
    {
        id: "gu",
        name: "Gujarati",
    },
    {
        id: "hi",
        name: "Hindi",
    },
    {
        id: "in",
        name: "Indonesian",
    },
    {
        id: "it",
        name: "Italian",
    },
    {
        id: "km",
        name: "Khmer",
    },
    {
        id: "rw",
        name: "Kinyarwanda",
    },
    {
        id: "lo",
        name: "Lao",
    },
    {
        id: "ne",
        name: "Nepali",
    },
    {
        id: "no",
        name: "Norwegian",
    },
    {
        id: "fa",
        name: "Persian",
    },
    {
        id: "pt",
        name: "Portuguese",
    },
    {
        id: "ps",
        name: "Pushto",
    },
    {
        id: "ru",
        name: "Russian",
    },
    {
        id: "es",
        name: "Spanish",
    },
    {
        id: "sw",
        name: "Swahili",
    },
    {
        id: "tg",
        name: "Tajik",
    },
    {
        id: "vi",
        name: "Vietnamese",
    },
];

export function getValueOrEmpty(value: string | undefined): Maybe<string> {
    return value ? value : "";
}

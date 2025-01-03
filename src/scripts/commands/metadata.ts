import _ from "lodash";
import { command, option, optional, subcommands, boolean, flag, string } from "cmd-ts";
import {
    getApiUrlOption,
    getD2Api,
    GoogleApiKey,
    SpreadsheetId,
    FilePath,
    getGoogleSheetsApi,
    DirPath,
    IDString,
    MergeMode,
    getGoogleSheetsApiByCredentials,
} from "../common";
import log from "utils/log";
import { GoogleSheetsRepository } from "data/GoogleSheetsRepository";
import { MetadataD2Repository } from "data/MetadataD2Repository";
import { BuildMetadataUseCase } from "domain/usecases/BuildMetadataUseCase";
import { DownloadIdsUseCase } from "domain/usecases/DownloadIdsUseCase";
import { makeUploadMetadataLog, writeToJSON } from "utils/utils";
import { PullDataSetUseCase } from "domain/usecases/PullDataSetUseCase";
import { PullEventProgramUseCase } from "domain/usecases/PullEventProgramUseCase";
import { CsvRepository } from "data/CsvRepository";

const dhis2UrlArg = { url: getApiUrlOption({ long: "dhis-url" }) };

const sheetIdArg = option({
    type: SpreadsheetId,
    long: "sheet-id",
    short: "s",
    description: "Google Spreadsheet ID",
});

const googleArgs = {
    gKey: option({
        type: GoogleApiKey,
        long: "google-key",
        short: "g",
        description: "Google Api key",
    }),
    sheetId: sheetIdArg,
};

export function getCommand() {
    const buildMetadata = command({
        name: "build-metadata",
        description: "Build metadata JSON from a spreadsheet and upload it to DHIS2 instance",
        args: {
            ...dhis2UrlArg,
            ...googleArgs,
            path: option({
                type: optional(FilePath),
                long: "path",
                short: "p",
                description: "JSON output path (file or directory)",
            }),
            LocalRun: flag({
                type: boolean,
                long: "local-run",
                short: "l",
                description: "Don't upload metadata to DHIS2 instance",
            }),
            UpdateCategoryOptionCombos: flag({
                type: boolean,
                long: "update-coc",
                short: "c",
                description: "Update category option combos",
            }),
            mergeMode: option({
                type: optional(MergeMode),
                long: "merge-mode",
                short: "m",
                defaultValue: () => "MERGE",
                description: "DHIS merge mode (default to MERGE)",
            }),
        },
        handler: async args => {
            try {
                const sheetsApi = getGoogleSheetsApi(args.gKey);
                const sheetsRepository = new GoogleSheetsRepository(sheetsApi);
                const metadataRepository = new MetadataD2Repository(getD2Api(args.url));
                log.info(`Reading https://docs.google.com/spreadsheets/d/${args.sheetId} ...`);

                log.info("Converting to metadata...");
                const buildMetadata = new BuildMetadataUseCase(sheetsRepository, metadataRepository);
                const metadata = await buildMetadata.execute(args.sheetId);

                log.info(`Writing metadata to ${args.path} ...`);
                writeToJSON(metadata, args.path);

                if (args.LocalRun === false) {
                    log.info(`Updating it on server at ${args.url} ...`);
                    const api = getD2Api(args.url);
                    const MetadataRepository = new MetadataD2Repository(api);
                    const result = await MetadataRepository.uploadMetadata(metadata, {
                        mode: args.mergeMode === "MERGE" ? "MERGE" : "REPLACE",
                    });
                    const messages = makeUploadMetadataLog(result);

                    log.info([result?.status, ...messages].join("\n"));

                    if (args.UpdateCategoryOptionCombos === true) {
                        log.info("Updating category option combos...");
                        await MetadataRepository.updateCategoryOptionCombos();
                    }
                }

                process.exit(0);
            } catch (error: any) {
                log.error(error.stack);
                process.exit(1);
            }
        },
    });

    const downloadIds = command({
        name: "download-ids",
        description: "Gets the IDs of the sheet metadata from DHIS2 instance and exports to CSV file.",
        args: {
            ...dhis2UrlArg,
            ...googleArgs,
            path: option({
                type: optional(DirPath),
                long: "path",
                short: "p",
                description: "CSV output path (directory)",
            }),
        },
        handler: async args => {
            try {
                const sheetsApi = getGoogleSheetsApi(args.gKey);
                const sheetsRepository = new GoogleSheetsRepository(sheetsApi);

                log.info(`Getting IDs from server at ${args.url} ...`);
                const api = getD2Api(args.url);
                const MetadataRepository = new MetadataD2Repository(api);

                log.info("Writing CSVs...");
                const downloadIds = new DownloadIdsUseCase(sheetsRepository, MetadataRepository, args.path);
                await downloadIds.execute(args.sheetId);

                process.exit(0);
            } catch (error: any) {
                log.error(error.stack);
                process.exit(1);
            }
        },
    });

    const pullDataSet = command({
        name: "pull-data-set",
        description: "Gets the dataSet metadata from DHIS2 instance and exports to google spreadsheet or CSV file.",
        args: {
            ...dhis2UrlArg,
            sheetId: option({
                type: optional(SpreadsheetId),
                long: "sheet-id",
                short: "s",
                description: "Google Spreadsheet ID",
            }),
            gCredentials: option({
                type: optional(string),
                long: "google-credentials",
            }),
            dataSetToPull: option({
                type: IDString,
                long: "data-set",
                short: "d",
                description: "dataSet to pull ID",
            }),
            path: option({
                type: optional(DirPath),
                long: "path",
                short: "p",
                description: "CSV output path (directory)",
            }),
            output: option({
                type: optional(string),
                defaultValue: () => "spreadsheet",
                long: "output",
                description: "output for the document: spreadsheet or csv",
            }),
        },
        handler: async args => {
            try {
                const params = parseOutputValues(args.output, args);
                let sheetsRepository;
                if (args.output === "csv") {
                    sheetsRepository = new CsvRepository();
                } else {
                    const sheetsApi = await getGoogleSheetsApiByCredentials(params.gCredentials);
                    sheetsRepository = new GoogleSheetsRepository(sheetsApi);
                }

                log.info(`Getting metadata from server at ${args.url} ...`);
                const api = getD2Api(args.url);
                const MetadataRepository = new MetadataD2Repository(api);

                log.info(`Generating ${args.output}...`);
                await new PullDataSetUseCase(MetadataRepository, sheetsRepository).execute({
                    dataSetId: args.dataSetToPull,
                    spreadSheetId: params.sheetId,
                    csvPath: params.path,
                });

                process.exit(0);
            } catch (error: any) {
                log.error(error.stack);
                process.exit(1);
            }
        },
    });

    const pullEvProgram = command({
        name: "pull-ev-program",
        description:
            "Gets the Event Program metadata from DHIS2 instance and exports to google spreadsheet or CSV file.",
        args: {
            ...dhis2UrlArg,
            eventProgramToPull: option({
                type: IDString,
                long: "event-program",
                short: "d",
                description: "eventProgram to pull ID",
            }),
            sheetId: option({
                type: optional(SpreadsheetId),
                long: "sheet-id",
                short: "s",
                description: "Google Spreadsheet ID",
            }),
            gCredentials: option({
                type: optional(string),
                long: "google-credentials",
            }),
            path: option({
                type: optional(DirPath),
                long: "path",
                short: "p",
                description: "CSV output path (directory)",
            }),
            output: option({
                type: optional(string),
                defaultValue: () => "spreadsheet",
                long: "output",
                description: "output for the document: spreadsheet or csv",
            }),
        },
        handler: async args => {
            try {
                const params = parseOutputValues(args.output, args);
                let sheetsRepository;
                if (args.output === "csv") {
                    sheetsRepository = new CsvRepository();
                } else {
                    const sheetsApi = await getGoogleSheetsApiByCredentials(params.gCredentials);
                    sheetsRepository = new GoogleSheetsRepository(sheetsApi);
                }

                log.info(`Getting metadata from server at ${args.url} ...`);
                const api = getD2Api(args.url);
                const MetadataRepository = new MetadataD2Repository(api);

                await new PullEventProgramUseCase(MetadataRepository, sheetsRepository).execute({
                    eventProgramId: args.eventProgramToPull,
                    spreadSheetId: params.sheetId,
                    csvPath: params.path,
                });

                process.exit(0);
            } catch (error: any) {
                log.error(error.stack);
                process.exit(1);
            }
        },
    });

    return subcommands({
        name: "metadata",
        cmds: {
            "build-metadata": buildMetadata,
            "download-ids": downloadIds,
            "pull-data-set": pullDataSet,
            "pull-ev-program": pullEvProgram,
        },
    });
}

function parseOutputValues(output: string | undefined, args: any) {
    if (output === "spreadsheet") {
        if (!args.gCredentials) throw Error("Invalid google credentials: --google-credentials");
        if (!args.sheetId) throw Error("Invalid google sheetId: --sheet-id");
        return {
            gCredentials: args.gCredentials,
            sheetId: args.sheetId,
            path: "",
        };
    } else if (output === "csv") {
        if (!args.path) throw Error("Invalid csv path: --path");
        return {
            path: args.path,
            gCredentials: "",
            sheetId: "",
        };
    } else {
        throw Error(`Invalid output parameter: spreadsheet or csv`);
    }
}

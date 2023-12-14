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
} from "../common";
import log from "utils/log";
import { GoogleSheetsRepository } from "data/GoogleSheetsRepository";
import { MetadataD2Repository } from "data/MetadataD2Repository";
import { BuildMetadataUseCase } from "domain/usecases/BuildMetadataUseCase";
import { DownloadIdsUseCase } from "domain/usecases/DownloadIdsUseCase";
import { makeUploadMetadataLog, writeToJSON } from "utils/utils";
import { PullDataSetUseCase } from "domain/usecases/PullDataSetUseCase";
import { PullEventProgramUseCase } from "domain/usecases/PullEventProgramUseCase";

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
        },
        handler: async args => {
            try {
                const sheetsApi = await getGoogleSheetsApi(args.gKey);
                const sheetsRepository = new GoogleSheetsRepository(sheetsApi);
                log.info(`Reading https://docs.google.com/spreadsheets/d/${args.sheetId} ...`);

                log.info("Converting to metadata...");
                const buildMetadata = new BuildMetadataUseCase(sheetsRepository);
                const metadata = await buildMetadata.execute(args.sheetId);

                log.info(`Writing metadata to ${args.path} ...`);
                writeToJSON(metadata, args.path);

                if (args.LocalRun === false) {
                    log.info(`Updating it on server at ${args.url} ...`);
                    const api = getD2Api(args.url);
                    const MetadataRepository = new MetadataD2Repository(api);
                    const result = await MetadataRepository.uploadMetadata(metadata);
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
                const sheetsApi = await getGoogleSheetsApi(args.gKey);
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
        description: "Gets the dataSet metadata from DHIS2 instance and exports to CSV file.",
        args: {
            ...dhis2UrlArg,
            sheetId: sheetIdArg,
            gKey: option({
                type: string,
                long: "google-key",
            }),
            dataSetToPull: option({
                type: IDString,
                long: "data-set",
                short: "d",
                description: "dataSet to pull ID",
            }),
        },
        handler: async args => {
            try {
                const sheetsApi = await getGoogleSheetsApi(args.gKey);
                const sheetsRepository = new GoogleSheetsRepository(sheetsApi);

                log.info(`Getting metadata from server at ${args.url} ...`);
                const api = getD2Api(args.url);
                const MetadataRepository = new MetadataD2Repository(api);

                log.info(`Updating Spreadsheet: ${args.sheetId}...`);
                const downloadIds = new PullDataSetUseCase(MetadataRepository, sheetsRepository);
                await downloadIds.execute({
                    dataSetId: args.dataSetToPull,
                    spreadSheetId: args.sheetId,
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
        description: "Gets the Event Program metadata from DHIS2 instance and exports to CSV file.",
        args: {
            ...dhis2UrlArg,
            eventProgramToPull: option({
                type: IDString,
                long: "event-program",
                short: "d",
                description: "eventProgram to pull ID",
            }),
            path: option({
                type: optional(DirPath),
                long: "path",
                short: "p",
                description: "CSV output path (directory)",
            }),
        },
        handler: async args => {
            try {
                log.info(`Getting metadata from server at ${args.url} ...`);
                const api = getD2Api(args.url);
                const MetadataRepository = new MetadataD2Repository(api);

                log.info("Writing CSVs...");
                const downloadIds = new PullEventProgramUseCase(MetadataRepository);
                await downloadIds.execute(args.eventProgramToPull, args.path);

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

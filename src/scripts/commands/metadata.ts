import _ from "lodash";
import { command, option, optional, subcommands, boolean, flag } from "cmd-ts";
import {
    getApiUrlOption,
    getD2Api,
    GoogleApiKey,
    SpreadsheetId,
    FilePath,
    getGoogleSheetsApi,
    DirPath,
} from "../common";
import log from "utils/log";
import { GoogleSheetsRepository } from "data/GoogleSheetsRepository";
import { MetadataD2Repository } from "data/MetadataD2Repository";
import { BuildMetadataUseCase } from "domain/usecases/BuildMetadataUseCase";
import { DownloadIdsUseCase } from "domain/usecases/DownloadIdsUseCase";
import { makeUploadMetadataLog, writeToJSON } from "utils/utils";

const defaultArgs = {
    url: getApiUrlOption({ long: "dhis-url" }),
    gKey: option({
        type: GoogleApiKey,
        long: "google-key",
        short: "g",
        description: "Google Api key",
    }),
    sheetId: option({
        type: SpreadsheetId,
        long: "sheet-id",
        short: "s",
        description: "Google Spreadsheet ID",
    }),
};

export function getCommand() {
    const buildMetadata = command({
        name: "build-metadata",
        description: "Build metadata JSON from a spreadsheet and upload it to DHIS2 instance",
        args: {
            ...defaultArgs,
            path: option({
                type: optional(FilePath),
                long: "path",
                short: "p",
                description: "JSON output path (file or directory)",
                defaultValue: () => "out.json",
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
                const sheetsApi = getGoogleSheetsApi(args.gKey);
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
                log.error(error);
                process.exit(1);
            }
        },
    });

    const downloadIds = command({
        name: "download-ids",
        description: "Gets the IDs of the sheet metadata from DHIS2 instance and exports to CSV file.",
        args: {
            ...defaultArgs,
            path: option({
                type: optional(DirPath),
                long: "path",
                short: "p",
                description: "CSV output path (file or directory)",
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
            } catch (error) {
                log.error(error);
                process.exit(1);
            }
        },
    });

    return subcommands({
        name: "metadata",
        cmds: { "build-metadata": buildMetadata, "download-ids": downloadIds },
    });
}

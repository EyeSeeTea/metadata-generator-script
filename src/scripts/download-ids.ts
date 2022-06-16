//download the UIDs form a spreadsheet

import fs from "fs";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { config } from "dotenv-flow";
import { google } from "googleapis";
import _ from "lodash";
import { MetadataItem } from "../domain/entities/MetadataItem";
import { Sheet } from "../domain/entities/Sheet";
import { getUid } from "../utils/uid";
import { buildMetadata } from "../utils/buildMetadata";
import { getMetadata } from "../utils/getMetadata";




// Connect to a server using the given D2Api and upload the given metadata.
async function uploadMetadata(api: D2Api, metadata: any) {
    const { response } = await api.metadata
        .postAsync(metadata, { importStrategy: "CREATE_AND_UPDATE", mergeMode: "MERGE" })
        .getData();

    const result = await api.system.waitFor(response.jobType, response.id).getData();

    const messages =
        result?.typeReports?.flatMap(({ klass, objectReports }) =>
            objectReports.flatMap(({ errorReports }) =>
                errorReports.flatMap(({ message, errorProperty }) => `${klass} ${errorProperty} ${message}`)
            )
        ) ?? [];

    console.log([result?.status, ...messages].join("\n"));
}

function pullMetadata(api: D2Api, sheets: Sheet[]) {
    const log = console.log, env = process.env;
    let uidOnly;
    if (env.PULL_UID_ONLY === "true") {
        log("Pulling UIDs ...");
        uidOnly = true;
    } else {
        log("Pulling metadata ...");
        uidOnly = false;
    }
    getMetadata(api, sheets, uidOnly);
}



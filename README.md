# GLASS-metadata

Script to generate dhis2 metadata from google sheets.

## Usage

To use this script we need to create a `.env.local` file in the root
directory of the project. This file will be ignored by git, but
**please be careful with your credentials**.

It should look like this:

```ini
GOOGLE_API_KEY=...
GOOGLE_SHEET_ID=...
DHIS2_BASE_URL=...
DHIS2_USERNAME=...
DHIS2_PASSWORD=...
BUILD_METADATA=false # true or false
PULL_METADATA=false # true or false
PULL_METADATA_CSV_PATH=/path/to/write/csv/files
PULL_UID_ONLY=false # true or false
UPDATE_SERVER=false # true or false
UPDATE_CATEGORY_OPTION_COMBOS=false # true or false
```

The first time, we have to run `yarn install` and `yarn build` to install all the dependencies.
After that, you can run `yarn build-metadata` to generate and update the metadata
, `yarn download-ids` to get the metadata IDs, `yarn pull-data-set` to pull a dataSet metadata or `yarn pull-ev-program` to pull a event program metadata.

In case of doubt use `yarn start metadata --help` or `yarn start metadata <subcommand> --help`.

### build-metadata:

Build metadata JSON from a spreadsheet and upload it to DHIS2 instance:

```console
OPTIONS:
  --dhis-url <str>         - http://USERNAME:PASSWORD@HOST:PORT
  --google-key, -g <value> - Google Api key
  --sheet-id, -s <value>   - Google Spreadsheet ID
  --path, -p <value>       - JSON output path (file or directory) [optional]

FLAGS:
  --local-run, -l  - Don't upload metadata to DHIS2 instance
  --update-coc, -c - Update category option combos
  --help, -h       - show help
```

Example:

```console
  shell:~$ yarn start metadata build-metadata --dhis-url='http://admin:district@localhost:8080' --google-key=.... --sheet-id=..... -l --path=./foo/metadata.json
```

### download-ids:

```console
Gets the IDs of the sheet metadata from DHIS2 instance and exports to CSV file.

The first time, we have to run `yarn install` to install all the dependencies.
After that, you can just run `yarn start` to generate and update the metadata.

OPTIONS:
  --dhis-url <str>         - http://USERNAME:PASSWORD@HOST:PORT
  --google-key, -g <value> - Google Api key
  --sheet-id, -s <value>   - Google Spreadsheet ID
  --path, -p <value>       - CSV output path (file or directory) [optional]

FLAGS:
  --help, -h - show help
```

Example:

```console
  shell:~$ yarn start metadata download-ids --dhis-url='http://admin:district@localhost:8080' --google-key=.... --sheet-id=..... -l --path=./foo/
```

### pull-data-set:

```console
Gets the dataSet metadata from DHIS2 instance and exports to google spreadsheet or CSV file.

OPTIONS:
  --dhis-url <str>       - http://USERNAME:PASSWORD@HOST:PORT
  --sheet-id, -s <value>   - Google Spreadsheet ID
  --google-credentials, -g <value> - Path to google service account credentials json file
  --data-set, -d <value> - dataSet to pull ID
  --output, -o <value>   - output mode: spreadsheet or csv
  --path, -p <value>     - CSV output path (directory) [optional]

FLAGS:
  --help, -h - show help
```

Example:

Export to csv

```bash
yarn start metadata pull-data-set \
  --dhis-url='http://admin:district@localhost:8080' \
  --data-set=lyLU2wR22tC \
  --path="./csvs/" \
  --output=csv
```

Export to spreadsheet

```bash
  yarn start metadata pull-data-set \
  --dhis-url='http://admin:district@localhost:8080' \
  --data-set=lyLU2wR22tC \
  --google-credentials="./path-to-credentials.json" \
  --sheet-id="google_spreadsheet_id" \
  --output=spreadsheet
```

### pull-ev-program:

```console
Gets the Event Program metadata from DHIS2 instance and exports to spreadsheet or CSV file.

OPTIONS:
  --dhis-url <str>            - http://USERNAME:PASSWORD@HOST:PORT
  --event-program, -d <value> - eventProgram to pull ID
  --sheet-id, -s <value>   - Google Spreadsheet ID
  --google-credentials, -g <value> - Path to google service account credentials json file
  --output, -o <value>   - output mode: spreadsheet or csv
  --path, -p <value>          - CSV output path (directory) [optional]

FLAGS:
  --help, -h - show help
```

Example:

Export to csv

```bash
yarn start metadata pull-ev-program \
  --dhis-url='http://admin:district@localhost:8080' \
  --event-program=lxAQ7Zs9VYR \
  --path=./programs/ \
  --output=csv
```

Export to spreadsheet

```bash
yarn start metadata pull-ev-program \
  --dhis-url='http://admin:district@localhost:8080' \
  --event-program=lxAQ7Zs9VYR \
  --google-credentials="./path-to-credentials.json" \
  --sheet-id="google_spreadsheet_id" \
  --output=spreadsheet
```

## Description

### build-metadata:

We can **create or modify metadata** in dhis2 by simply using the
official `Maintenance` app. But sometimes this is a slow process.

Instead, we can specify the metadata in a spreadsheet with a specific
format, so we can manipulate it quickly, and when we are happy with it
just run this script.

The script will generate a json file containing all the
information that dhis2 needs to update the metadata, and also
connect to a dhis2 server to update the metadata directly.

If you need to generate only the json set the `UPDATE_SERVER` option to `false`.

The `PULL_METADATA` and `PULL_UID_ONLY` flags allows to retrieve the metadata of the
metadata items referenced in the spreadsheet from a DHIS2 instance.
Setting both `PULL_METADATA` and `PULL_UID_ONLY` flag means the script only performs the UIDs retrieval
function.
The `PULL_METADATA_CSV_PATH` variable will store the path where the CSV files will be written. If empty, the current working directory will be used.
If you need to generate only the json use the `local-run` flag.

If you want to manually upload the generated json file to a dhis2 instance,
use its `Import/Export` app, go to `Metadata import` and use `Merge` as
the "import strategy".

If dhis2 fails to automatically update all the category option
combinations (which happens occassionally and is a dhis2 issue), you
can use the `Data Administration` app, go to `Maintenance`, select
`Update category option combinations` and click on the
`Perform Maintenance` button. Alternatively, you can just set in the
`.env.local` file the `UPDATE_CATEGORY_OPTION_COMBOS` option to `true`.

## Default category combo

-To get the default `categoryCombo` used at a dhis2 instance, go to the
-following endpoint: -`/api/categoryCombos.json?filter=name:eq:default&fields=id,name` .

### How the default category combo is used

-If you want to understand what is special about the default category-combination and how it works in dhis2, you can check [this talk by Jim-Grace](https://youtu.be/EcR9QwJvc7c?t=314) (and maybe [these -slides](https://drive.google.com/file/d/1MWq-Nx-AcSSuTfF9z7VPq0W9PXyl9IAn/view)).

-It is used at least in `dataElements`, `dataSets`, and `programs`.
+The `path` option will store the path where the CSV files will
+be written. If empty, the current working directory will be used.

### download-ids:

With this tool we can get the IDs of a spreadsheet's metadata from a DHIS2 instance.
For now, two elements can't have the same name, which is possible in DHIS2.

The `path` option will store the path where the CSV files will
be written. If empty, the current working directory will be used.

## Accessing google spreadsheets

To access the spreadsheets, you need a google _api key_. You can see
how to get one at the [google developers documentation
site](https://console.developers.google.com/apis/credentials).

The spreadsheet needs to have sharing permissions with, at least,
anyone that has the link to it (and not only anyone within your
organization).

## Writing to google spreadsheets

The `pull-data-set` script can write to an existing google spreadsheet using the json credentials of a **Service Account**.

In order to generate a service account you should:

-   Enable the [Google sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
-   On the [service account manager](https://console.cloud.google.com/iam-admin/serviceaccounts) click on "CREATE SERVICE ACCOUNT"
-   Enter a **service account name** and press **DONE**
-   In the service account manager copy the value from the **Email** column (that's the one you will add in the share permissions of the google spreadsheet)
-   In the service account manager click on the **Actions** icon and then click on **Manage permissions**
-   Go to the tab **Keys**, press **ADD KEY** -> **Create New Key**
-   In the modal select **JSON** and press **CREATE**. It should automatically download a json file. Use the path to this file as a parameter for the pull-data-set script.

```bash
  shell:~$ yarn start metadata pull-data-set \
  --dhis-url='http://user:password@localhost:8080' \
  --data-set=AAAAAAAAAAA \
  --google-credentials="./myfolder/path-to-credentials.json" \
  --sheet-id="..." \
  --output=spreadsheet
```

## Metadata spreadsheet template

You can find an example spreadsheet to use as a template for
introducing metadata at [Metadata
template](https://docs.google.com/spreadsheets/d/1Ij0X85_Q0wQQoxelB0VAWl5D0PjtGY_CbjYxQYGN4GE/).

The last sheet it has, called `DHIS2`, is used to created named ranges to use
as data validation (and thus also get drop-down menus in google spreadsheets).

## Extending the script

### Adding new metadata

This script understands only a limited amount of all the metadata that
exist in dhis2.

You can extend it to add other kinds of metadata. For that, you will
need to understand how dhis2 represents those new kind of metadata.

To see what fields will be necessary, you can inspect with your
browser the api calls made when you add new metadata from the
`Maintenance` app.

Another option is to go to one of the servers at
https://play.dhis2.org/ and export its metadata with the
`Import/Export` app. Then, you can for example use `jq` to learn about
it. A few examples follow.

To see the keys present in the top-level object:

```sh
cat metadata.json | jq 'keys_unsorted'
```

To see the first in the list of programRules:

```sh
cat metadata.json | jq '.programRules[0]'
```

To see the paths to all the elements where "programRuleActions" is an
existing field:

```sh
cat metadata.json | jq -c 'paths | select(.[-1] == "programRuleActions")'
```

To see in the programRuleActions for which programRuleActionTypes we can have
a key named "dataElement":

```sh
cat metadata.json \
    | jq -r '.programRuleActions[] | select(.dataElement != null) | .programRuleActionType' \
    | sort | uniq
```

### Comparing metadata files

Comparing metadata json files is useful to see what can be missing or
wrong in the files.

For example, you can compare the files created by this script to
others created by a previous version, or another script, or with the
`Metadata export` option of the `Import/Export` app, or from
the `/api/metadata.json` endpoint.

To compare them, it is useful to have them properly sorted. The
following command helps to make them easy to compare:

```sh
cat metadata.json \
    | jq --sort-keys \
    | jq 'walk(if type == "array" then sort_by(.name) else . end)' \
    > metadata_sorted.json
```

For more information on how to use `jq`, see
https://stedolan.github.io/jq/manual/ .

```
yarn start metadata build-metadata --dhis-url='http://admin:distrcit@localhost:8080' \
--google-key=AIzaSyA5N9tgblL0dP8nOtPKzJ8CwpwPHrddkkk \
--sheet-id="1-iGyeOkF4LO8j5gPXgwsXA_6gwOI9yBYM9NajiqAwEA" -l
```

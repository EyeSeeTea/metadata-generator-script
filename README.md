# GLASS-metadata

Create `.env.local` file in your project root directory. This file will be ignored by git, **please be careful with your credentials**.

```
GOOGLE_API_KEY=
GOOGLE_SHEET_ID=
DEFAULT_CATEGORY_COMBO_ID=
DHIS2_BASE_URL=
DHIS2_USERNAME=
DHIS2_PASSWORD=
UPDATE_CATEGORY_OPTION_COMBOS=false # true or false
```

How to get default `categoryCombo`: /api/categoryCombos.json?filter=name:eq:default&fields=id,name

How to get the Google API Key: https://console.developers.google.com/apis/credentials

export type fieldsType = Record<string, boolean>;

interface metadataFieldsType {
    dataSetFieds: fieldsType;
    dataElementFieds: fieldsType;
    categoryComboFields: fieldsType;
    categoriesFields: fieldsType;
    categoryOptionsFields: fieldsType;
}

const dataSetFieds = {
    id: true,
    name: true,
    code: true,
    shortName: true,
    description: true,
    validCompleteOnly: true,
    dataElementDecoration: true,
    notifyCompletingUser: true,
    noValueRequiresComment: true,
    skipOffline: true,
    compulsoryFieldsCompleteOnly: true,
    fieldCombinationRequired: true,
    renderHorizontally: true,
    renderAsTabs: true,
    mobile: true,
    openPeriodsAfterCoEndDate: true,
    timelyDays: true,
    periodType: true,
    openFuturePeriods: true,
    expiryDays: true,
    categoryCombo: true,
    workflow: true,
    dataSetElements: true,
    dataInputPeriods: true,
    indicators: true,
    legendSets: true,
    sections: true,
};
// attributeValues: true,
// userAccesses: true,
// userGroupAccesses: true,

const dataElementFieds = {
    id: true,
    name: true,
    shortName: true,
    formName: true,
    code: true,
    categoryCombo: true,
    valueType: true,
    aggregationType: true,
    domainType: true,
    description: true,
    optionSet: true,
    commentOptionSet: true,
    zeroIsSignificant: true,
    url: true,
    fieldMask: true,
};

const categoryComboFields = {
    id: true,
    name: true,
    code: true,
    dataDimensionType: true,
    description: true,
    categories: true,
};

const categoriesFields = {
    id: true,
    name: true,
    shortName: true,
    code: true,
    description: true,
    categoryOptions: true,
    dataDimensionType: true,
};

const categoryOptionsFields = {
    id: true,
    name: true,
    shortName: true,
    code: true,
    description: true,
};

export const metadataFields = {
    dataSetFieds: dataSetFieds,
    dataElementFieds: dataElementFieds,
    categoryComboFields: categoryComboFields,
    categoriesFields: categoriesFields,
    categoryOptionsFields: categoryOptionsFields,
};

export type fieldsType = Record<
    string,
    boolean | typeof sectionFields | typeof optionSetFields | typeof dataSetElementsFields
>;

const optionSetFields = {
    id: true,
    options: true,
    translations: true,
};

const dataSetElementsFields = {
    categoryCombo: true,
    dataSet: true,
    dataElement: {
        id: true,
        optionSet: optionSetFields,
        commentOptionSet: optionSetFields,
    },
};

const sectionFields = {
    id: true,
    name: true,
    code: true,
    showRowTotals: true,
    showColumnTotals: true,
    dataSet: true,
    description: true,
    translations: true,
    dataElements: true,
};

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
    dataSetElements: dataSetElementsFields,
    dataInputPeriods: true,
    indicators: true,
    legendSets: true,
    sections: sectionFields,
    translations: true,
};

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
    legendSets: true,
    translations: true,
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

const programsFields = {
    id: true,
    name: true,
    shortName: true,
    code: true,
    description: true,
    trackedEntityType: true,
    categoryCombo: true,
    version: true,
    expiryPeriodType: true,
    expiryDays: true,
    completeEventsExpiryDays: true,
    displayFrontPageList: true,
    useFirstStageDuringRegistration: true,
    accessLevel: true,
    minAttributesRequiredToSearch: true,
    maxTeiCountToReturn: true,
    selectIncidentDatesInFuture: true,
    selectEnrollmentDatesInFuture: true,
    onlyEnrollOnce: true,
    displayIncidentDate: true,
    incidentDateLabel: true,
    enrollmentDateLabel: true,
    ignoreOverdueEvents: true,
    featureType: true,
    relatedProgram: true,
    programStages: true,
    programRuleVariables: true,
};

const programStagesFields = {
    id: true,
    name: true,
    program: true,
    enableUserAssignment: true,
    blockEntryForm: true,
    featureType: true,
    preGenerateUID: true,
    executionDateLabel: true,
    validationStrategy: true,
    description: true,
    minDaysFromStart: true,
    repeatable: true,
    periodType: true,
    displayGenerateEventBox: true,
    standardInterval: true,
    autoGenerateEvent: true,
    openAfterEnrollment: true,
    reportDateToUse: true,
    remindCompleted: true,
    allowGenerateNextVisit: true,
    generatedByEnrollmentDate: true,
    hideDueDate: true,
    dueDateLabel: true,
    sortOrder: true,
    programStageSections: true,
    programStageDataElements: true,
};

const programStageSectionFields = {
    id: true,
    programStage: true,
    name: true,
    renderType: true,
    description: true,
    sortOrder: true,
    dataElements: true,
};

const programRulesFields = {
    id: true,
    name: true,
    program: true,
    condition: true,
    description: true,
    programRuleActions: true,
};

const programRuleActionsFields = {
    id: true,
    programRule: true,
    name: true,
    content: true,
    data: true,
    location: true,
    dataElement: true,
    trackedEntityAttribute: true,
    programStage: true,
    programStageSection: true,
};

const programRuleVariablesFields = {
    id: true,
    name: true,
    displayName: true,
    program: true,
    useCodeForOptionSet: true,
    programRuleVariableSourceType: true,
    dataElement: true,
    trackedEntityAttribute: true,
    programStage: true,
};

const LegendSetsFields = {
    id: true,
    name: true,
    code: true,
    legends: true,
};

const LegendsFields = {
    id: true,
    name: true,
    startValue: true,
    endValue: true,
};

export const metadataFields = {
    dataSetFieds: dataSetFieds,
    dataElementFieds: dataElementFieds,
    categoryComboFields: categoryComboFields,
    categoriesFields: categoriesFields,
    categoryOptionsFields: categoryOptionsFields,
    programsFields: programsFields,
    programStagesFields: programStagesFields,
    programStageSectionFields: programStageSectionFields,
    programRulesFields: programRulesFields,
    programRuleActionsFields: programRuleActionsFields,
    programRuleVariablesFields: programRuleVariablesFields,
    LegendSetsFields: LegendSetsFields,
    LegendsFields: LegendsFields,
};

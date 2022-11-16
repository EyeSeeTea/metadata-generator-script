const dataSetsHeaders = [
    { id: "id", title: "id" },
    { id: "name", title: "name" },
    { id: "code", title: "code" },
    { id: "shortName", title: "shortName" },
    { id: "description", title: "description" },
    { id: "expiryDays", title: "expiryDays" },
    { id: "openFuturePeriods", title: "openFuturePeriods" },
    { id: "timelyDays", title: "timelyDays" },
    { id: "periodType", title: "periodType" },
    { id: "categoryCombo", title: "categoryCombo" },
    { id: "notifyCompletingUser", title: "notifyCompletingUser" },
    { id: "workflow", title: "workflow" },
    { id: "mobile", title: "mobile" },
    { id: "fieldCombinationRequired", title: "fieldCombinationRequired" },
    { id: "validCompleteOnly", title: "validCompleteOnly" },
    { id: "noValueRequiresComment", title: "noValueRequiresComment" },
    { id: "skipOffline", title: "skipOffline" },
    { id: "dataElementDecoration", title: "dataElementDecoration" },
    { id: "renderAsTabs", title: "renderAsTabs" },
    { id: "renderHorizontally", title: "renderHorizontally" },
    { id: "compulsoryFieldsCompleteOnly", title: "compulsoryFieldsCompleteOnly" },
];

const dataSetElementsHeaders = [
    { id: "dataSet", title: "dataSet" },
    { id: "name", title: "name" },
    { id: "categoryCombo", title: "categoryCombo" },
];

const dataElementsHeaders = [
    { id: "id", title: "id" },
    { id: "name", title: "name" },
    { id: "shortName", title: "shortName" },
    { id: "formName", title: "formName" },
    { id: "code", title: "code" },
    { id: "categoryCombo", title: "categoryCombo" },
    { id: "valueType", title: "valueType" },
    { id: "aggregationType", title: "aggregationType" },
    { id: "domainType", title: "domainType" },
    { id: "description", title: "description" },
    { id: "optionSet", title: "optionSet" },
    { id: "commentOptionSet", title: "commentOptionSet" },
    { id: "zeroIsSignificant", title: "zeroIsSignificant" },
    { id: "url", title: "url" },
    { id: "fieldMask", title: "fieldMask" },
];

const dataElementLegendsHeaders = [
    { id: "dataElement", title: "dataElement" },
    { id: "name", title: "name" },
];

const categoryCombosHeaders = [
    { id: "id", title: "id" },
    { id: "name", title: "name" },
    { id: "code", title: "code" },
    { id: "dataDimensionType", title: "dataDimensionType" },
    { id: "description", title: "description" },
];

const categoriesHeaders = [
    { id: "id", title: "id" },
    { id: "name", title: "name" },
    { id: "shortName", title: "shortName" },
    { id: "code", title: "code" },
    { id: "categoryCombo", title: "categoryCombo" },
    { id: "dataDimensionType", title: "dataDimensionType" },
    { id: "description", title: "description" },
];

const categoryOptionsHeaders = [
    { id: "id", title: "id" },
    { id: "name", title: "name" },
    { id: "code", title: "code" },
    { id: "category", title: "category" },
    { id: "shortName", title: "shortName" },
    { id: "description", title: "description" },
];

const programsHeaders = [
    { id: "id", title: "id" },
    { id: "name", title: "name" },
    { id: "shortName", title: "shortName" },
    { id: "code", title: "code" },
    { id: "description", title: "description" },
    { id: "trackedEntityType", title: "trackedEntityType" },
    { id: "categoryCombo", title: "categoryCombo" },
    { id: "version", title: "version" },
    { id: "expiryPeriodType: PeriodTypeexpiryPeriodType" },
    { id: "expiryDays: numberexpiryDays" },
    { id: "completeEventsExpiryDays: numbercompleteEventsExpiryDays" },
    { id: "displayFrontPageList", title: "displayFrontPageList" },
    { id: "useFirstStageDuringRegistration", title: "useFirstStageDuringRegistration" },
    { id: "accessLevel: AccessLevelTypeaccessLevel" },
    { id: "minAttributesRequiredToSearch: numberminAttributesRequiredToSearch" },
    { id: "maxTeiCountToReturn: numbermaxTeiCountToReturn" },
    { id: "selectIncidentDatesInFuture", title: "selectIncidentDatesInFuture" },
    { id: "selectEnrollmentDatesInFuture", title: "selectEnrollmentDatesInFuture" },
    { id: "onlyEnrollOnce", title: "onlyEnrollOnce" },
    { id: "displayIncidentDate", title: "displayIncidentDate" },
    { id: "incidentDateLabel", title: "incidentDateLabel" },
    { id: "enrollmentDateLabel", title: "enrollmentDateLabel" },
    { id: "ignoreOverdueEvents", title: "ignoreOverdueEvents" },
    { id: "featureType: FeatureTypefeatureType" },
    { id: "relatedProgram", title: "relatedProgram" },
];

const programStagesHeaders = [
    { id: "id", title: "id" },
    { id: "name", title: "name" },
    { id: "program", title: "program" },
    { id: "enableUserAssignment", title: "enableUserAssignment" },
    { id: "blockEntryForm", title: "blockEntryForm" },
    { id: "featureType", title: "featureType" },
    { id: "preGenerateUID", title: "preGenerateUID" },
    { id: "executionDateLabel", title: "executionDateLabel" },
    { id: "validationStrategy", title: "validationStrategy" },
    { id: "description", title: "description" },
    { id: "minDaysFromStart", title: "minDaysFromStart" },
    { id: "repeatable", title: "repeatable" },
    { id: "periodType", title: "periodType" },
    { id: "displayGenerateEventBox", title: "displayGenerateEventBox" },
    { id: "standardInterval", title: "standardInterval" },
    { id: "autoGenerateEvent", title: "autoGenerateEvent" },
    { id: "openAfterEnrollment", title: "openAfterEnrollment" },
    { id: "reportDateToUse", title: "reportDateToUse" },
    { id: "remindCompleted", title: "remindCompleted" },
    { id: "allowGenerateNextVisit", title: "allowGenerateNextVisit" },
    { id: "generatedByEnrollmentDate", title: "generatedByEnrollmentDate" },
    { id: "hideDueDate", title: "hideDueDate" },
    { id: "dueDateLabel", title: "dueDateLabel" },
];

const programStageDataElementsHeaders = [
    { id: "id", title: "id" },
    { id: "program", title: "program" },
    { id: "programStage", title: "programStage" },
    { id: "name", title: "name" },
    { id: "compulsory", title: "compulsory" },
    { id: "allowProvidedElsewhere", title: "allowProvidedElsewhere" },
    { id: "displayInReports", title: "displayInReports" },
    { id: "allowFutureDate", title: "allowFutureDate" },
    { id: "skipSynchronization", title: "skipSynchronization" },
    { id: "renderTypeMobile", title: "renderTypeMobile" },
    { id: "renderTypeDesktop", title: "renderTypeDesktop" },
];

const programStageSectionsHeaders = [
    { id: "id", title: "id" },
    { id: "program", title: "program" },
    { id: "programStage", title: "programStage" },
    { id: "name", title: "name" },
    { id: "renderTypeMobile", title: "renderTypeMobile" },
    { id: "renderTypeDesktop", title: "renderTypeDesktop" },
    { id: "description", title: "description" },
];

const programStageSectionsDataElementsHeaders = [
    { id: "program", title: "program" },
    { id: "programStage", title: "programStage" },
    { id: "programStageSection", title: "programStageSection" },
    { id: "name", title: "name" },
];

const programRuleVariablesHeaders = [
    { id: "id", title: "id" },
    { id: "name", title: "name" },
    { id: "displayName", title: "displayName" },
    { id: "program", title: "program" },
    { id: "useCodeForOptionSet", title: "useCodeForOptionSet" },
    { id: "programRuleVariableSourceType", title: "programRuleVariableSourceType" },
    { id: "dataElement", title: "dataElement" },
    { id: "trackedEntityAttribute", title: "trackedEntityAttribute" },
    { id: "programStage", title: "programStage" },
];

const legendSetsHeaders = [
    { id: "id", title: "id" },
    { id: "name", title: "name" },
    { id: "code", title: "code" },
];

const legendsHeaders = [
    { id: "id", title: "id" },
    { id: "name", title: "name" },
    { id: "legendSet", title: "legendSet" },
    { id: "startValue", title: "startValue" },
    { id: "endValue", title: "endValue" },
];

export const headers = {
    dataSetsHeaders: dataSetsHeaders,
    dataSetElementsHeaders: dataSetElementsHeaders,
    dataElementsHeaders: dataElementsHeaders,
    dataElementLegendsHeaders: dataElementLegendsHeaders,
    categoryCombosHeaders: categoryCombosHeaders,
    categoriesHeaders: categoriesHeaders,
    categoryOptionsHeaders: categoryOptionsHeaders,
    programsHeaders: programsHeaders,
    programStagesHeaders: programStagesHeaders,
    programStageDataElementsHeaders: programStageDataElementsHeaders,
    programStageSectionsHeaders: programStageSectionsHeaders,
    programStageSectionsDataElementsHeaders: programStageSectionsDataElementsHeaders,
    programRuleVariablesHeaders: programRuleVariablesHeaders,
    legendSetsHeaders: legendSetsHeaders,
    legendsHeaders: legendsHeaders,
};

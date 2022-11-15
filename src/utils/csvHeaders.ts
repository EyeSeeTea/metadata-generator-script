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

const ProgramsHeaders = [
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

export const headers = {
    dataSetsHeaders: dataSetsHeaders,
    dataSetElementsHeaders: dataSetElementsHeaders,
    dataElementsHeaders: dataElementsHeaders,
    categoryCombosHeaders: categoryCombosHeaders,
    categoriesHeaders: categoriesHeaders,
    categoryOptionsHeaders: categoryOptionsHeaders,
    ProgramsHeaders: ProgramsHeaders,
};

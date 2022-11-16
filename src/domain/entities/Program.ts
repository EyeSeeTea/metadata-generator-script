import { PeriodType, Id, Ref, AccessLevelType, FeatureType } from "./Base";

export interface Program {
    id: Id;
    name: string;
    shortName: string;
    code?: string;
    description?: string;
    trackedEntityType?: Ref;
    categoryCombo: Ref;
    version?: string;
    expiryPeriodType?: PeriodType;
    expiryDays?: string;
    completeEventsExpiryDays?: string;
    displayFrontPageList?: boolean;
    useFirstStageDuringRegistration?: boolean;
    accessLevel?: AccessLevelType;
    minAttributesRequiredToSearch?: string;
    maxTeiCountToReturn?: string;
    selectIncidentDatesInFuture?: boolean;
    selectEnrollmentDatesInFuture?: boolean;
    onlyEnrollOnce?: boolean;
    displayIncidentDate?: boolean;
    incidentDateLabel?: string;
    enrollmentDateLabel?: string;
    ignoreOverdueEvents?: boolean;
    featureType?: FeatureType;
    relatedProgram?: Ref;
    programStages?: Ref[];
}

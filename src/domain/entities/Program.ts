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
    expiryDays?: number;
    completeEventsExpiryDays?: number;
    displayFrontPageList?: boolean;
    useFirstStageDuringRegistration?: boolean;
    accessLevel?: AccessLevelType;
    minAttributesRequiredToSearch?: number;
    maxTeiCountToReturn?: number;
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

import { Maybe } from "utils/ts-utils";
import { PeriodType, Id, Ref, AccessLevelType, FeatureType, RenderType } from "./Base";
import { CategoryCombo } from "./CategoryCombo";
import { TrackedEntityAttribute, TrackedEntityType } from "./TrackedEntityType";
import { Translation } from "./Translation";

export interface Program {
    id: Id;
    name: string;
    shortName: string;
    code?: string;
    description?: string;
    trackedEntityType?: TrackedEntityType;
    categoryCombo: CategoryCombo;
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
    programRuleVariables?: Ref[];
    translations: Translation[];
    programTrackedEntityAttributes: ProgramTrackedEntityAttribute[];
    programSections: ProgramSection[];
}

export type ProgramSection = {
    id: Id;
    name: string;
    description: string;
    renderType: RenderType;
    trackedEntityAttributes: ProgramTrackedEntityAttribute[];
};

export type ProgramTrackedEntityAttribute = {
    id: Id;
    name: string;
    displayInList: boolean;
    mandatory: boolean;
    allowFutureDate: boolean;
    searchable: boolean;
    renderType: Maybe<Record<"MOBILE" | "DESKTOP", { type: string }>>;
    trackedEntityAttribute: TrackedEntityAttribute;
};

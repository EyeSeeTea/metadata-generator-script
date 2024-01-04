import { PeriodType, Id, Ref, AccessLevelType, FeatureType, ValidationStrategyType, RenderType } from "./Base";
import { Translation } from "./Translation";

export interface ProgramStage {
    id: Id;
    name: string;
    program: Ref;
    enableUserAssignment?: string;
    blockEntryForm?: string;
    featureType?: FeatureType;
    preGenerateUID?: string;
    executionDateLabel?: string;
    validationStrategy: ValidationStrategyType;
    description?: string;
    minDaysFromStart?: string;
    repeatable?: string;
    periodType?: string;
    displayGenerateEventBox?: string;
    standardInterval?: string;
    autoGenerateEvent?: string;
    openAfterEnrollment?: string;
    reportDateToUse?: string;
    remindCompleted?: string;
    allowGenerateNextVisit?: string;
    generatedByEnrollmentDate?: string;
    hideDueDate?: string;
    dueDateLabel?: string;
    sortOrder: number;
    programStageDataElements: ProgramStageDataElement[];
    programStageSections: Ref[];
    translations: Translation[];
}

export interface ProgramStageDataElement {
    id: Id;
    programStage: Ref;
    compulsory?: string;
    allowProvidedElsewhere?: string;
    displayInReports?: string;
    allowFutureDate?: string;
    skipSynchronization?: string;
    renderType?: RenderType;
    sortOrder: number;
    dataElement: Ref;
}

import { NamedRef, Id, Ref, FeatureType, ValidationStrategyType, RenderType } from "./Base";
import { Translation } from "./Translation";

export interface ProgramStage {
    id: Id;
    name: string;
    program: NamedRef;
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
    programStageSections: ProgramStageSection[];
    translations: Translation[];
}

export type ProgramStageSection = {
    id: Id;
    name: string;
    renderType: RenderType;
    description: string;
};

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

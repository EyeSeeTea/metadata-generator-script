import { Id, ProgramRuleActionType, Ref } from "./Base";

export interface ProgramRule {
    id: Id;
    name: string;
    program: Ref;
    condition?: string;
    description?: string;
    programRuleActions?: Ref[];
}

export interface programRuleAction {
    id: Id;
    programRule: Ref;
    programRuleActionType: ProgramRuleActionType;
    content?: string;
    data?: string;
    location?: string;
    dataElement?: Ref;
    trackedEntityAttribute?: Ref;
    programStage?: Ref;
    programStageSection?: Ref;
}

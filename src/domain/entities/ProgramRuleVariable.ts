import { Id, ProgramRuleVariableSourceType, Ref } from "./Base";

export interface ProgramRuleVariable {
    id: Id;
    name: string;
    displayName: string;
    program: Ref;
    useCodeForOptionSet: string;
    programRuleVariableSourceType: ProgramRuleVariableSourceType;
    dataElement?: Ref;
    trackedEntityAttribute?: Ref;
    programStage?: Ref;
}

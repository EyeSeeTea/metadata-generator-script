import { Id, Ref, RenderType } from "./Base";

export interface ProgramStageSection {
    id: Id;
    programStage: Ref;
    name: string;
    renderType?: RenderType;
    description?: string;
    sortOrder: number;
    dataElements: Ref[];
}

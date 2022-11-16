import { Id, Ref } from "./Base";
export interface LegendSet {
    id: Id;
    name: string;
    code?: string;
    legends: Legend[];
}

export interface Legend {
    id: Id;
    name: string;
    startValue: string;
    endValue: string;
}

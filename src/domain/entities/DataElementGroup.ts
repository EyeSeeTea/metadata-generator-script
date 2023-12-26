import { Ref } from "@eyeseetea/d2-api";
import { Id } from "./Base";
import { Translation } from "./Translation";

export type DataElementGroup = {
    id: Id;
    name: string;
    shortName: string;
    code: string;
    description: string;
    translations: Translation[];
    dataElements: Ref[];
};

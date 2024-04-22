import { Id } from "./Base";
import { DataElementGroup } from "./DataElementGroup";
import { Translation } from "./Translation";

export type DataElementGroupSet = {
    id: Id;
    name: string;
    shortName: string;
    code: string;
    description: string;
    compulsory: boolean;
    dataDimension: boolean;
    dataElementGroups: DataElementGroup[];
    translations: Translation[];
};

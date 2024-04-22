import { DataDimensionType, Id, Ref } from "./Base";
import { Translation } from "./Translation";

export interface Category {
    id: Id;
    name: string;
    shortName: string;
    code: string;
    description: string;
    categoryOptions: Ref[];
    dataDimensionType: DataDimensionType;
    translations: Translation[];
}

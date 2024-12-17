import { DataDimensionType, Id, Ref } from "./Base";
import { Translation } from "./Translation";

export interface CategoryCombo {
    id: Id;
    name: string;
    code: string;
    description: string;
    dataDimensionType: DataDimensionType;
    categories: Ref[];
    translations: Translation[];
}

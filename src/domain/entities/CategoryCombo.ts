import { DataDimensionType, Id, Ref } from "./Base";

export interface CategoryCombo {
    id: Id;
    name: string;
    code: string;
    description: string;
    dataDimensionType: DataDimensionType;
    categories: Ref[];
}

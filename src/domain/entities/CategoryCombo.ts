import { dataDimensionType, Id, Ref } from "./Base";

export interface CategoryCombo {
    id: Id;
    name: string;
    code: string;
    description: string;
    dataDimensionType: dataDimensionType;
    categories: Ref[];
}

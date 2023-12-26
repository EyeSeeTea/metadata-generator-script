import { Id, Ref } from "./Base";
import { Translation } from "./Translation";

export interface CategoryOption {
    id: Id;
    name: string;
    shortName: string;
    code: string;
    description: string;
    translations: Translation[];
}

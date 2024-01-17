import { Id, Ref } from "./Base";
import { Translation } from "./Translation";

export type OptionSet = {
    id: Id;
    name: string;
    code: string;
    valueType: string;
    description: string;
    translations: Translation[];
    options: Ref[];
};

export type Option = {
    id: Id;
    name: string;
    code: string;
    optionSet: Ref;
    shortName: string;
    description: string;
    translations: Translation[];
};

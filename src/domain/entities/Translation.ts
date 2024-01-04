import logger from "utils/log";
import { Maybe } from "utils/ts-utils";
import { defaultLanguages, getValueOrEmpty } from "utils/utils";

export type Translation = {
    property?: string;
    value?: string;
    locale?: string;
};

export type TranslationRow = { name: Maybe<string>; locale: Maybe<string>; value: Maybe<string> };

export function buildTranslationsRows(translations: Translation[]): TranslationRow[] {
    return translations.map((translation: Translation): TranslationRow => {
        const localeDetails = defaultLanguages.find(language => language.id === translation.locale);
        if (!localeDetails) {
            logger.warn(`Locale ${translation.locale} not found for translation: ${translation.value}`);
        }
        return {
            name: getValueOrEmpty(translation.property),
            locale: localeDetails ? localeDetails.name : "",
            value: getValueOrEmpty(translation.value),
        };
    });
}

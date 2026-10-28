export const locales = [
  "en",
  "en-GB",
  "en-US",
  "en-AU",
  "en-NZ",
  "en-CA",
  "fr",
  "fr-CA",
  "de-DE",
  "de-AT",
  "de-CH",
  "es-ES",
  "es-MX",
  "it-IT",
  "pt-PT",
  "pt-BR",
  "zh-Hans",
  "zh-Hant",
] as const;

export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  "en-GB": "English (United Kingdom)",
  "en-US": "English (United States)",
  "en-AU": "English (Australia)",
  "en-NZ": "English (New Zealand)",
  "en-CA": "English (Canada)",
  fr: "Français",
  "fr-CA": "Français (Canada)",
  "de-DE": "Deutsch (Deutschland)",
  "de-AT": "Deutsch (Österreich)",
  "de-CH": "Deutsch (Schweiz)",
  "es-ES": "Español (España)",
  "es-MX": "Español (México)",
  "it-IT": "Italiano",
  "pt-PT": "Português (Portugal)",
  "pt-BR": "Português (Brasil)",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

/** Return the language-level catalog tag, preserving Chinese script variants. */
export function getLocaleCatalogLocale(locale: AppLocale): string {
  if (locale.startsWith("zh-")) return locale;
  return locale.split("-")[0];
}

/** Match an exact enabled locale first, then a locale with the same language. */
export function resolveLocale(
  value?: string | null,
  supportedLocales: AppLocale[] = [...locales],
): AppLocale {
  if (supportedLocales.includes(value as AppLocale)) return value as AppLocale;

  if (value) {
    const normalized = value.replaceAll("_", "-");
    const language = normalized.split("-")[0].toLowerCase();
    if (language === "zh") {
      const region = normalized.split("-")[1]?.toUpperCase();
      const scriptLocale: AppLocale | undefined =
        ["TW", "HK", "MO"].includes(region ?? "") ? "zh-Hant" :
        ["CN", "SG"].includes(region ?? "") || !region ? "zh-Hans" : undefined;
      if (scriptLocale && supportedLocales.includes(scriptLocale)) return scriptLocale;
      const availableChinese = supportedLocales.find((locale) => locale.startsWith("zh-"));
      if (availableChinese) return availableChinese;
    }
    const sameLanguage = supportedLocales.find(
      (locale) => getLocaleCatalogLocale(locale).toLowerCase() === language,
    );
    if (sameLanguage) return sameLanguage;
  }

  return supportedLocales.includes(defaultLocale)
    ? defaultLocale
    : supportedLocales[0] ?? defaultLocale;
}

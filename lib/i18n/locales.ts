export const locales = ["en", "fr", "fr-CA"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";
export const localeLabels: Record<AppLocale, string> = { en: "English", fr: "Français", "fr-CA": "Français (Canada)" };

export function resolveLocale(
  value?: string | null,
  supportedLocales: AppLocale[] = [...locales],
): AppLocale {
  if (supportedLocales.includes(value as AppLocale)) return value as AppLocale;
  if (value?.toLowerCase().startsWith("fr")) {
    if (supportedLocales.includes("fr")) return "fr";
    if (supportedLocales.includes("fr-CA")) return "fr-CA";
  }
  return supportedLocales.includes(defaultLocale)
    ? defaultLocale
    : supportedLocales[0] ?? defaultLocale;
}

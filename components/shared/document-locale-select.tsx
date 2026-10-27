"use client";

import { useTranslations } from "next-intl";
import { localeLabels, type AppLocale } from "@/lib/i18n/locales";

export function DocumentLocaleSelect({
  id,
  value,
  locales,
  onChange,
}: {
  id: string;
  value: AppLocale | "";
  locales: AppLocale[];
  onChange: (value: AppLocale | "") => void;
}) {
  const t = useTranslations("Common");
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as AppLocale | "")}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
    >
      <option value="">{t("organizationDefaultDocumentLanguage")}</option>
      {locales.map((locale) => (
        <option key={locale} value={locale}>{localeLabels[locale]}</option>
      ))}
    </select>
  );
}

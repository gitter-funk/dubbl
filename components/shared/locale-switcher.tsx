"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { localeLabels, locales, type AppLocale } from "@/lib/i18n/locales";

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const t = useTranslations("Locale");
  async function changeLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) return;
    await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: nextLocale }) });
    router.refresh();
  }
  return <label><span className="sr-only">{t("label")}</span><select aria-label={t("label")} className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={locale} onChange={(event) => changeLocale(event.target.value as AppLocale)}>{locales.map((value) => <option key={value} value={value}>{localeLabels[value]}</option>)}</select></label>;
}

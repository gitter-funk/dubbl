"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { localeLabels, locales, type AppLocale } from "@/lib/i18n/locales";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const t = useTranslations("Locale");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [enabledLocales, setEnabledLocales] = useState<AppLocale[]>([...locales]);
  useEffect(() => {
    const organizationId = localStorage.getItem("activeOrgId");
    const instanceRequest = fetch("/api/locale").then((response) => response.json());
    const organizationRequest = organizationId
      ? fetch("/api/v1/organization", { headers: { "x-organization-id": organizationId } }).then((response) => response.json())
      : Promise.resolve(null);
    Promise.all([instanceRequest, organizationRequest])
      .then(([instanceData, organizationData]) => {
        const instanceLocales = (instanceData.locales ?? locales) as AppLocale[];
        const organizationLocales = organizationData?.organization?.enabledLocales as AppLocale[] | undefined;
        setEnabledLocales(organizationLocales
          ? instanceLocales.filter((value) => organizationLocales.includes(value))
          : instanceLocales);
      })
      .catch(() => {});
  }, []);
  async function changeLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) return;
    setSaving(true);
    setError(false);
    try {
      const organizationId = localStorage.getItem("activeOrgId");
      const response = await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json", ...(organizationId ? { "x-organization-id": organizationId } : {}) }, body: JSON.stringify({ locale: nextLocale }) });
      if (!response.ok || response.redirected) throw new Error("Locale update failed");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div>
      <label>
        <span className="sr-only">{t("label")}</span>
        <select aria-label={t("label")} disabled={saving} className={`h-9 rounded-md border border-border bg-background px-2 text-sm ${className}`} value={locale} onChange={(event) => changeLocale(event.target.value as AppLocale)}>
          {enabledLocales.map((value) => <option key={value} value={value}>{localeLabels[value]}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="text-xs text-red-600">{t("saveError")}</p>}
    </div>
  );
}

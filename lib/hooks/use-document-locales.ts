"use client";

import { useEffect, useState } from "react";
import { locales, type AppLocale } from "@/lib/i18n/locales";

export function useDocumentLocales() {
  const [availableLocales, setAvailableLocales] = useState<AppLocale[]>([]);

  useEffect(() => {
    const organizationId = localStorage.getItem("activeOrgId");
    if (!organizationId) return;
    fetch("/api/v1/organization", {
      headers: { "x-organization-id": organizationId },
    })
      .then((response) => response.json())
      .then((data) => {
        const instanceLocales = (data.availableLocales ?? locales) as AppLocale[];
        const organizationLocales = (data.organization?.enabledLocales ?? instanceLocales) as AppLocale[];
        setAvailableLocales(organizationLocales.filter((locale) => instanceLocales.includes(locale)));
      })
      .catch(() => setAvailableLocales([]));
  }, []);

  return availableLocales;
}

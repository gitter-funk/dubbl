import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { getLocaleCatalogLocale, resolveLocale } from "@/lib/i18n/locales";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { mergeMessages } from "@/lib/i18n/merge-messages";
import { getInstanceLocales } from "@/lib/i18n/locale-policy";

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("dubbl_locale")?.value;
  const session = await auth();
  const user = session?.user?.id
    ? await db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { locale: true } })
    : undefined;
  const locale = resolveLocale(cookieLocale ?? user?.locale, await getInstanceLocales());
  const english = (await import("../messages/en.json")).default;
  const catalogLocale = getLocaleCatalogLocale(locale);
  const baseCatalog = catalogLocale === "fr"
    ? (await import("../messages/fr.json")).default
    : catalogLocale === "de"
      ? (await import("../messages/de.json")).default
      : catalogLocale === "es"
        ? (await import("../messages/es.json")).default
        : catalogLocale === "it"
          ? (await import("../messages/it.json")).default
          : catalogLocale === "pt"
            ? (await import("../messages/pt.json")).default
            : catalogLocale === "zh-Hans"
              ? (await import("../messages/zh-Hans.json")).default
              : catalogLocale === "zh-Hant"
                ? (await import("../messages/zh-Hant.json")).default
            : {};
  const regionalCatalog = locale === "fr-CA"
    ? (await import("../messages/fr-CA.json")).default
    : locale === "de-CH"
      ? (await import("../messages/de-CH.json")).default
      : locale === "pt-BR"
        ? (await import("../messages/pt-BR.json")).default
      : {};
  return {
    locale,
    messages: mergeMessages(mergeMessages(english, baseCatalog), regionalCatalog),
  };
});

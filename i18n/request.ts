import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { resolveLocale } from "@/lib/i18n/locales";
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
  const french = locale.startsWith("fr") ? (await import("../messages/fr.json")).default : {};
  const regional = locale === "fr-CA" ? (await import("../messages/fr-CA.json")).default : {};
  return { locale, messages: mergeMessages(mergeMessages(english, french), regional) };
});

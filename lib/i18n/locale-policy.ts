import { getSiteSetting } from "@/lib/site-settings";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { defaultLocale, locales, type AppLocale } from "./locales";

/** The site admin can limit locale choices to catalogs enabled on this instance. */
export async function getInstanceLocales(): Promise<AppLocale[]> {
  const configured = await getSiteSetting("enabled_locales");
  const requested = new Set(configured.split(",").map((locale) => locale.trim()));
  const enabled = locales.filter((locale) => requested.has(locale));
  if (!enabled.includes(defaultLocale)) enabled.unshift(defaultLocale);
  return enabled;
}

export function getOrganizationLocales(
  organizationLocales: string[] | null | undefined,
  instanceLocales: AppLocale[],
): AppLocale[] {
  const enabled = organizationLocales?.filter(
    (locale): locale is AppLocale =>
      locales.includes(locale as AppLocale) && instanceLocales.includes(locale as AppLocale),
  ) ?? [];
  return enabled.length > 0 ? enabled : [defaultLocale];
}

export function resolveDocumentLocale(
  recipientLocale: string | null | undefined,
  organizationLocale: string | null | undefined,
  organizationLocales: string[] | null | undefined,
  instanceLocales: AppLocale[],
): AppLocale {
  const allowed = getOrganizationLocales(organizationLocales, instanceLocales);
  if (allowed.includes(recipientLocale as AppLocale)) return recipientLocale as AppLocale;
  if (allowed.includes(organizationLocale as AppLocale)) return organizationLocale as AppLocale;
  return allowed[0] ?? defaultLocale;
}

export async function isLocaleEnabledForOrganization(
  organizationId: string,
  locale: string | null | undefined,
): Promise<boolean> {
  if (!locale) return true;
  const [org, instanceLocales] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { enabledLocales: true },
    }),
    getInstanceLocales(),
  ]);
  return getOrganizationLocales(org?.enabledLocales, instanceLocales).includes(locale as AppLocale);
}

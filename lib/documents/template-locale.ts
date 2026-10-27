import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documentTemplate, organization } from "@/lib/db/schema";
import { notDeleted } from "@/lib/db/soft-delete";
import { getInstanceLocales, getOrganizationLocales, resolveDocumentLocale } from "@/lib/i18n/locale-policy";
import { defaultLocale, type AppLocale } from "@/lib/i18n/locales";

type TemplateType = (typeof documentTemplate.type.enumValues)[number];

/** Select the best enabled template translation, falling back to the org default and English. */
export async function getDocumentTemplateForRecipient({
  organizationId,
  type,
  preferredLocale,
}: {
  organizationId: string;
  type: TemplateType;
  preferredLocale?: string | null;
}) {
  const [org, instanceLocales] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { documentLocale: true, enabledLocales: true },
    }),
    getInstanceLocales(),
  ]);
  const enabledLocales = getOrganizationLocales(org?.enabledLocales, instanceLocales);
  const resolvedLocale = resolveDocumentLocale(
    preferredLocale,
    org?.documentLocale,
    org?.enabledLocales,
    instanceLocales,
  );
  const candidateLocales: AppLocale[] = [
    resolvedLocale,
    ...(org?.documentLocale && enabledLocales.includes(org.documentLocale as AppLocale)
      ? [org.documentLocale as AppLocale]
      : []),
    defaultLocale,
  ].filter((locale, index, all) => all.indexOf(locale) === index);

  for (const locale of candidateLocales) {
    const template = await db.query.documentTemplate.findFirst({
      where: and(
        eq(documentTemplate.organizationId, organizationId),
        eq(documentTemplate.type, type),
        eq(documentTemplate.locale, locale),
        eq(documentTemplate.isDefault, true),
        notDeleted(documentTemplate.deletedAt),
      ),
    });
    if (template) return template;
  }
  return undefined;
}

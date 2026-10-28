import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization, users } from "@/lib/db/schema";
import type { AuthContext } from "@/lib/api/auth-context";
import { wrapTool } from "@/lib/mcp/errors";
import { locales } from "@/lib/i18n/locales";
import { getInstanceLocales, getOrganizationLocales } from "@/lib/i18n/locale-policy";

/** Locale preferences use BCP 47 tags and are restricted to shipped catalogs. */
export function registerLocalizationTools(server: McpServer, ctx: AuthContext) {
  server.tool(
    "get_locale_preferences",
    "Get the caller's UI language preference and the organization's customer-facing document language. Returns supported locale tags: en, fr, fr-CA.",
    {},
    () => wrapTool(ctx, async () => {
      const [user, org, instanceLocales] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, ctx.userId), columns: { locale: true } }),
        db.query.organization.findFirst({ where: eq(organization.id, ctx.organizationId), columns: { documentLocale: true, enabledLocales: true } }),
        getInstanceLocales(),
      ]);
      return {
        userLocale: user?.locale ?? "en",
        documentLocale: org?.documentLocale ?? "en",
        enabledLocales: getOrganizationLocales(org?.enabledLocales, instanceLocales),
      };
    })
  );

  server.tool(
    "update_locale_preferences",
    `Update the caller's UI language and/or the organization's customer-facing document language. Use one of these BCP 47 locale tags: ${locales.join(", ")}. Returns the resulting preferences.`,
    {
      userLocale: z.enum(locales).optional().describe(`UI locale for the authenticated user. Supported tags: ${locales.join(", ")}`),
      documentLocale: z.enum(locales).optional().describe(`Default locale for organization customer-facing documents. Supported tags: ${locales.join(", ")}`),
      enabledLocales: z.array(z.enum(locales)).min(1).optional().describe("Locales the organization allows for UI and customer-facing documents; must be supported by the hosted instance"),
    },
    (params) => wrapTool(ctx, async () => {
      const [instanceLocales, org] = await Promise.all([
        getInstanceLocales(),
        db.query.organization.findFirst({
          where: eq(organization.id, ctx.organizationId),
          columns: { enabledLocales: true, documentLocale: true },
        }),
      ]);
      const enabledLocales = (params.enabledLocales ?? org?.enabledLocales ?? ["en"]) as (typeof locales)[number][];
      if (enabledLocales.some((locale) => !instanceLocales.includes(locale))) {
        throw new Error("The organization can only enable locales supported by this instance");
      }
      if (params.documentLocale && !enabledLocales.includes(params.documentLocale)) {
        throw new Error("The default document language must be enabled for the organization");
      }
      if (params.enabledLocales && params.documentLocale === undefined && !enabledLocales.includes((org?.documentLocale ?? "en") as (typeof locales)[number])) {
        throw new Error("Enable the current default document language or choose a new default");
      }
      if (params.userLocale && !instanceLocales.includes(params.userLocale)) {
        throw new Error("This UI locale is disabled for this instance");
      }
      if (params.userLocale !== undefined) {
        await db.update(users).set({ locale: params.userLocale }).where(eq(users.id, ctx.userId));
      }
      if (params.documentLocale !== undefined || params.enabledLocales !== undefined) {
        await db.update(organization).set({
          ...(params.documentLocale !== undefined && { documentLocale: params.documentLocale }),
          ...(params.enabledLocales !== undefined && { enabledLocales: params.enabledLocales }),
          updatedAt: new Date(),
        }).where(eq(organization.id, ctx.organizationId));
      }
      const [user, updatedOrg] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, ctx.userId), columns: { locale: true } }),
        db.query.organization.findFirst({ where: eq(organization.id, ctx.organizationId), columns: { documentLocale: true, enabledLocales: true } }),
      ]);
      return {
        userLocale: user?.locale ?? "en",
        documentLocale: updatedOrg?.documentLocale ?? "en",
        enabledLocales: getOrganizationLocales(updatedOrg?.enabledLocales, instanceLocales),
      };
    })
  );
}

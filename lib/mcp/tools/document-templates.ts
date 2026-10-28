import { and, eq } from "drizzle-orm";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { documentTemplate } from "@/lib/db/schema";
import { requireRole } from "@/lib/api/require-role";
import type { AuthContext } from "@/lib/api/auth-context";
import { notDeleted } from "@/lib/db/soft-delete";
import { wrapTool } from "@/lib/mcp/errors";
import { locales } from "@/lib/i18n/locales";
import { isLocaleEnabledForOrganization } from "@/lib/i18n/locale-policy";

const templateTypes = ["invoice", "quote", "receipt", "payslip", "purchase_order"] as const;

export function registerDocumentTemplateTools(server: McpServer, ctx: AuthContext) {
  server.tool(
    "list_document_templates",
    "List active organization document templates, including each template's locale and whether it is the default for that document type and locale.",
    {},
    () => wrapTool(ctx, async () => {
      const templates = await db.query.documentTemplate.findMany({
        where: and(eq(documentTemplate.organizationId, ctx.organizationId), notDeleted(documentTemplate.deletedAt)),
        orderBy: documentTemplate.createdAt,
      });
      return { templates };
    }),
  );

  server.tool(
    "create_document_template",
    `Create an organization document template for a specific locale. Set isDefault to use it for documents of this type and locale. Supported locale tags: ${locales.join(", ")}.`,
    {
      name: z.string().min(1).describe("Display name of the template"),
      type: z.enum(templateTypes).describe("Document type rendered by this template"),
      locale: z.enum(locales).default("en").describe(`BCP 47 locale for this template. Supported tags: ${locales.join(", ")}`),
      isDefault: z.boolean().optional().describe("Whether this should be the default template for this document type and locale"),
      accentColor: z.string().optional().describe("Hex accent color used in the generated document"),
      notes: z.string().nullable().optional().describe("Optional localized notes shown on documents; null clears notes"),
      bankDetails: z.string().nullable().optional().describe("Optional payment details text; null clears it"),
      paymentInstructions: z.string().nullable().optional().describe("Optional payment instructions; null clears them"),
      showTaxBreakdown: z.boolean().optional().describe("Whether invoice-style documents show a tax breakdown"),
      showPaymentTerms: z.boolean().optional().describe("Whether invoice-style documents show payment terms"),
    },
    (params) => wrapTool(ctx, async () => {
      requireRole(ctx, "manage:invoices");
      if (!(await isLocaleEnabledForOrganization(ctx.organizationId, params.locale))) {
        throw new Error("This template locale is not enabled for the organization");
      }
      if (params.isDefault) {
        await db.update(documentTemplate).set({ isDefault: false }).where(and(
          eq(documentTemplate.organizationId, ctx.organizationId),
          eq(documentTemplate.type, params.type),
          eq(documentTemplate.locale, params.locale),
          eq(documentTemplate.isDefault, true),
          notDeleted(documentTemplate.deletedAt),
        ));
      }
      const [template] = await db.insert(documentTemplate).values({
        organizationId: ctx.organizationId,
        name: params.name,
        type: params.type,
        locale: params.locale,
        isDefault: params.isDefault ?? false,
        accentColor: params.accentColor,
        notes: params.notes,
        bankDetails: params.bankDetails,
        paymentInstructions: params.paymentInstructions,
        showTaxBreakdown: params.showTaxBreakdown,
        showPaymentTerms: params.showPaymentTerms,
      }).returning();
      return { template };
    }),
  );

  server.tool(
    "update_document_template",
    "Update an organization document template, including its locale. Default templates are unique by document type and locale; selecting one replaces that locale's previous default.",
    {
      templateId: z.string().uuid().describe("UUID of the organization document template to update"),
      name: z.string().min(1).optional().describe("New display name for the template"),
      locale: z.enum(locales).optional().describe(`New BCP 47 locale for this template. Supported tags: ${locales.join(", ")}`),
      isDefault: z.boolean().optional().describe("Whether this is the default template for this document type and locale"),
      accentColor: z.string().optional().describe("Hex accent color used in the generated document"),
      notes: z.string().nullable().optional().describe("Localized notes; null clears notes"),
      bankDetails: z.string().nullable().optional().describe("Payment details text; null clears it"),
      paymentInstructions: z.string().nullable().optional().describe("Payment instructions; null clears them"),
      showTaxBreakdown: z.boolean().optional().describe("Whether invoice-style documents show a tax breakdown"),
      showPaymentTerms: z.boolean().optional().describe("Whether invoice-style documents show payment terms"),
    },
    (params) => wrapTool(ctx, async () => {
      requireRole(ctx, "manage:invoices");
      if (params.locale && !(await isLocaleEnabledForOrganization(ctx.organizationId, params.locale))) {
        throw new Error("This template locale is not enabled for the organization");
      }
      const existing = await db.query.documentTemplate.findFirst({
        where: and(eq(documentTemplate.id, params.templateId), eq(documentTemplate.organizationId, ctx.organizationId), notDeleted(documentTemplate.deletedAt)),
      });
      if (!existing) throw new Error("Document template not found");
      const locale = params.locale ?? existing.locale as (typeof locales)[number];
      if (params.isDefault ?? existing.isDefault) {
        await db.update(documentTemplate).set({ isDefault: false }).where(and(
          eq(documentTemplate.organizationId, ctx.organizationId),
          eq(documentTemplate.type, existing.type),
          eq(documentTemplate.locale, locale),
          eq(documentTemplate.isDefault, true),
          notDeleted(documentTemplate.deletedAt),
        ));
      }
      const [template] = await db.update(documentTemplate).set({
        ...(params.name !== undefined && { name: params.name }),
        ...(params.locale !== undefined && { locale: params.locale }),
        ...(params.isDefault !== undefined && { isDefault: params.isDefault }),
        ...(params.accentColor !== undefined && { accentColor: params.accentColor }),
        ...(params.notes !== undefined && { notes: params.notes }),
        ...(params.bankDetails !== undefined && { bankDetails: params.bankDetails }),
        ...(params.paymentInstructions !== undefined && { paymentInstructions: params.paymentInstructions }),
        ...(params.showTaxBreakdown !== undefined && { showTaxBreakdown: params.showTaxBreakdown }),
        ...(params.showPaymentTerms !== undefined && { showPaymentTerms: params.showPaymentTerms }),
        updatedAt: new Date(),
      }).where(and(eq(documentTemplate.id, existing.id), eq(documentTemplate.organizationId, ctx.organizationId), notDeleted(documentTemplate.deletedAt))).returning();
      return { template };
    }),
  );
}

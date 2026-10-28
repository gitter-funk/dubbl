import { db } from "@/lib/db";
import { documentTemplate } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/api/auth-context";
import { requireRole } from "@/lib/api/require-role";
import { notDeleted, softDelete } from "@/lib/db/soft-delete";
import { ok, notFound, handleError } from "@/lib/api/response";
import { logAudit, diffChanges } from "@/lib/api/audit";
import { z } from "zod";
import { locales } from "@/lib/i18n/locales";
import { isLocaleEnabledForOrganization } from "@/lib/i18n/locale-policy";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(request);

    const template = await db.query.documentTemplate.findFirst({
      where: and(
        eq(documentTemplate.id, id),
        eq(documentTemplate.organizationId, ctx.organizationId),
        notDeleted(documentTemplate.deletedAt)
      ),
    });

    if (!template) return notFound("Template");
    return ok({ template });
  } catch (err) {
    return handleError(err);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  locale: z.enum(locales).optional(),
  headerHtml: z.string().nullable().optional(),
  footerHtml: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  accentColor: z.string().optional(),
  showTaxBreakdown: z.boolean().optional(),
  showPaymentTerms: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  bankDetails: z.string().nullable().optional(),
  paymentInstructions: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(request);
    requireRole(ctx, "manage:invoices");

    const body = await request.json();
    const parsed = updateSchema.parse(body);

    const existing = await db.query.documentTemplate.findFirst({
      where: and(
        eq(documentTemplate.id, id),
        eq(documentTemplate.organizationId, ctx.organizationId),
        notDeleted(documentTemplate.deletedAt)
      ),
    });

    if (!existing) return notFound("Template");

    if (parsed.locale && !(await isLocaleEnabledForOrganization(ctx.organizationId, parsed.locale))) {
      return NextResponse.json({ error: "This template locale is not enabled for the organization" }, { status: 400 });
    }

    if (parsed.isDefault ?? existing.isDefault) {
      await db.update(documentTemplate)
        .set({ isDefault: false })
        .where(and(
          eq(documentTemplate.organizationId, ctx.organizationId),
          eq(documentTemplate.type, existing.type),
          eq(documentTemplate.locale, parsed.locale ?? existing.locale),
          eq(documentTemplate.isDefault, true),
          notDeleted(documentTemplate.deletedAt),
        ));
    }

    const [updated] = await db
      .update(documentTemplate)
      .set({ ...parsed, updatedAt: new Date() })
      .where(
        and(
          eq(documentTemplate.id, id),
          eq(documentTemplate.organizationId, ctx.organizationId),
          notDeleted(documentTemplate.deletedAt)
        )
      )
      .returning();

    if (!updated) return notFound("Template");

    logAudit({ ctx, action: "update", entityType: "document_template", entityId: id, changes: diffChanges(existing as Record<string, unknown>, updated as Record<string, unknown>), request });

    return ok({ template: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(request);
    requireRole(ctx, "manage:invoices");

    const [deleted] = await db
      .update(documentTemplate)
      .set(softDelete())
      .where(
        and(
          eq(documentTemplate.id, id),
          eq(documentTemplate.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!deleted) return notFound("Template");

    logAudit({
      ctx,
      action: "delete",
      entityType: "document_template",
      entityId: id,
      changes: deleted as Record<string, unknown>,
      request,
    });

    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}

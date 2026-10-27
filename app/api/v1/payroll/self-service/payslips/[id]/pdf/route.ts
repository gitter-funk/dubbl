import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { member, organization, payslip, payrollEmployee, payrollRun } from "@/lib/db/schema";
import { getAuthContext } from "@/lib/api/auth-context";
import { requireRole } from "@/lib/api/require-role";
import { handleError, notFound } from "@/lib/api/response";
import { notDeleted } from "@/lib/db/soft-delete";
import { getInstanceLocales, resolveDocumentLocale } from "@/lib/i18n/locale-policy";
import { renderPayslipPdf } from "@/lib/documents/payslip-pdf-renderer";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(request);
    requireRole(ctx, "self-service:payroll");
    const memberRecord = await db.query.member.findFirst({
      where: and(eq(member.userId, ctx.userId), eq(member.organizationId, ctx.organizationId)),
      columns: { id: true },
    });
    if (!memberRecord) return notFound("Payslip");
    const employee = await db.query.payrollEmployee.findFirst({
      where: and(eq(payrollEmployee.organizationId, ctx.organizationId), eq(payrollEmployee.memberId, memberRecord.id), notDeleted(payrollEmployee.deletedAt)),
    });
    if (!employee) return notFound("Payslip");
    const slip = await db.query.payslip.findFirst({
      where: and(eq(payslip.id, id), eq(payslip.employeeId, employee.id)),
      with: { payrollItem: true },
    });
    if (!slip) return notFound("Payslip");
    const run = await db.query.payrollRun.findFirst({
      where: and(eq(payrollRun.id, slip.payrollRunId), eq(payrollRun.organizationId, ctx.organizationId)),
    });
    const org = await db.query.organization.findFirst({ where: eq(organization.id, ctx.organizationId) });
    if (!run || !org) return notFound("Payslip");
    const locale = resolveDocumentLocale(employee.preferredLocale, org.documentLocale, org.enabledLocales, await getInstanceLocales());
    const breakdown = Array.isArray(slip.deductionsBreakdown) ? slip.deductionsBreakdown as Array<{ name?: string; category?: string; amount?: number }> : [];
    const pdf = await renderPayslipPdf({
      employeeName: employee.name,
      employeeNumber: employee.employeeNumber,
      periodStart: run.payPeriodStart,
      periodEnd: run.payPeriodEnd,
      generatedAt: slip.generatedAt,
      currency: slip.payrollItem?.currency || employee.currency || "USD",
      gross: slip.grossAmount,
      tax: slip.taxAmount,
      deductions: Math.max(slip.grossAmount - slip.netAmount - slip.taxAmount, 0),
      net: slip.netAmount,
      ytdGross: slip.ytdGross,
      ytdTax: slip.ytdTax,
      ytdNet: slip.ytdNet,
      deductionLines: breakdown.map((item) => ({ name: item.name || item.category || "Deduction", amount: item.amount || 0 })),
    }, locale);
    return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="payslip-${employee.employeeNumber}-${run.payPeriodEnd}.pdf"` } });
  } catch (err) {
    return handleError(err);
  }
}

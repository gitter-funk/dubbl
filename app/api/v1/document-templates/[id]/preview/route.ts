import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documentTemplate } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthContext } from "@/lib/api/auth-context";
import { notDeleted } from "@/lib/db/soft-delete";
import { notFound, handleError } from "@/lib/api/response";
import { generateInvoiceHtml } from "@/lib/documents/pdf-generator";
import { renderPayslipPdf } from "@/lib/documents/payslip-pdf-renderer";
import { defaultLocale, locales } from "@/lib/i18n/locales";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(request);
    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    const template = await db.query.documentTemplate.findFirst({
      where: and(
        eq(documentTemplate.id, id),
        eq(documentTemplate.organizationId, ctx.organizationId),
        notDeleted(documentTemplate.deletedAt)
      ),
    });

    if (!template) return notFound("Template");

    if (template.type === "payslip") {
      const locale = locales.includes(template.locale as (typeof locales)[number])
        ? template.locale as (typeof locales)[number]
        : defaultLocale;
      const pdfBuffer = await renderPayslipPdf({
        employeeName: "Sample Employee",
        employeeNumber: "EMP-0001",
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        generatedAt: new Date("2026-04-01T12:00:00Z"),
        currency: "CAD",
        gross: 500000,
        tax: 85000,
        deductions: 15000,
        net: 400000,
        ytdGross: 1500000,
        ytdTax: 255000,
        ytdNet: 1200000,
        deductionLines: [{ name: locale === "en" ? "Health benefits" : "Assurance maladie", amount: 15000 }],
      }, locale, template);
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="sample-payslip-${locale}.pdf"`,
        },
      });
    }

    const { organization } = await import("@/lib/db/schema");
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, ctx.organizationId),
    });

    const orgAddress = [org?.addressStreet, org?.addressCity, org?.addressState, org?.addressPostalCode, org?.addressCountry]
      .filter(Boolean)
      .join(", ");

    const sampleData = {
      invoiceNumber: "INV-0001",
      issueDate: "2026-03-10",
      dueDate: "2026-04-09",
      status: "draft",
      contactName: "Sample Customer",
      contactEmail: "customer@example.com",
      contactAddress: "123 Main St, Suite 100, New York, NY 10001",
      contactTaxNumber: "US123456789",
      lines: [
        { description: "Web Development Services", quantity: 100, unitPrice: 15000, taxAmount: 1500, amount: 15000 },
        { description: "UI/UX Design", quantity: 200, unitPrice: 7500, taxAmount: 1500, amount: 15000 },
      ],
      subtotal: 30000,
      taxTotal: 3000,
      total: 33000,
      amountPaid: 0,
      amountDue: 33000,
      currencyCode: "USD",
      reference: "PO-123",
      notes: null,
    };

    const orgInfo = {
      name: org?.name || "Your Company",
      address: orgAddress || null,
      taxId: org?.taxId || null,
      registrationNumber: org?.businessRegistrationNumber || null,
      phone: org?.contactPhone || null,
      email: org?.contactEmail || null,
      countryCode: org?.countryCode || null,
      documentLocale: org?.documentLocale,
      enabledLocales: org?.enabledLocales,
    };

    if (format === "pdf") {
      const { renderInvoicePdf } = await import("@/lib/documents/pdf-renderer");
      const pdfBuffer = await renderInvoicePdf(
        {
          invoiceNumber: sampleData.invoiceNumber,
          issueDate: sampleData.issueDate,
          dueDate: sampleData.dueDate,
          lines: sampleData.lines,
          subtotal: sampleData.subtotal,
          taxTotal: sampleData.taxTotal,
          total: sampleData.total,
          amountPaid: 0,
          amountDue: sampleData.total,
          currencyCode: sampleData.currencyCode,
          reference: sampleData.reference,
          notes: sampleData.notes,
        },
        orgInfo,
        {
          name: sampleData.contactName,
          email: sampleData.contactEmail,
          address: sampleData.contactAddress,
          taxNumber: sampleData.contactTaxNumber,
          preferredLocale: template.locale,
        },
        template
      );

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="sample-invoice.pdf"`,
        },
      });
    }

    const html = generateInvoiceHtml(sampleData, orgInfo, template);

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return handleError(err);
  }
}

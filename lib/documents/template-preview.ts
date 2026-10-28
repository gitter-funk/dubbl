export type TemplatePreviewDocumentKind = "invoice" | "payslip";

/** Payslips have a dedicated renderer; other current template types share the invoice-style renderer. */
export function getTemplatePreviewDocumentKind(templateType: string): TemplatePreviewDocumentKind {
  return templateType === "payslip" ? "payslip" : "invoice";
}

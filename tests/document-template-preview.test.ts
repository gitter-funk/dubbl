import assert from "node:assert/strict";
import test from "node:test";
import { getTemplatePreviewDocumentKind } from "../lib/documents/template-preview";

test("payslip template previews use the payslip renderer path", () => {
  assert.equal(getTemplatePreviewDocumentKind("payslip"), "payslip");
});

test("invoice-style templates keep using the invoice renderer path", () => {
  for (const templateType of ["invoice", "quote", "receipt", "purchase_order"]) {
    assert.equal(getTemplatePreviewDocumentKind(templateType), "invoice", templateType);
  }
});

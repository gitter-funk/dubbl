import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { mergeMessages } from "../lib/i18n/merge-messages";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function message(locale: string, key: string): string {
  let catalog = JSON.parse(source("messages/en.json")) as Record<string, unknown>;
  if (locale.startsWith("fr")) {
    catalog = mergeMessages(
      catalog,
      JSON.parse(source("messages/fr.json")) as Record<string, unknown>,
    );
  }
  if (locale === "fr-CA") {
    catalog = mergeMessages(
      catalog,
      JSON.parse(source("messages/fr-CA.json")) as Record<string, unknown>,
    );
  }

  let value: unknown = catalog;
  for (const part of key.split(".")) {
    value = (value as Record<string, unknown> | undefined)?.[part];
  }
  assert.equal(typeof value, "string", `${locale}.${key} must be a string`);
  return value as string;
}

test("dashboard content can shrink beside the sidebar at tablet widths", () => {
  const layout = source("app/(dashboard)/layout.tsx");

  assert.match(
    layout,
    /<SidebarInset className="min-w-0 bg-content-bg">/,
    "allow the dashboard main region to shrink when translated header controls need more room",
  );
});

test("forecasting keeps long localized form labels in roomy responsive columns", () => {
  const page = source("app/(dashboard)/payroll/forecasting/page.tsx");
  const englishLabel = message("en", "Payroll.Forecasting.averageNewHireSalary");
  const frenchLabel = message("fr", "Payroll.Forecasting.averageNewHireSalary");
  const canadianFrenchLabel = message(
    "fr-CA",
    "Payroll.Forecasting.averageNewHireSalary",
  );

  assert.ok(frenchLabel.length > englishLabel.length);
  assert.ok(canadianFrenchLabel.length > englishLabel.length);
  assert.match(
    page,
    /grid-cols-1\s+gap-3\s+md:grid-cols-2\s+xl:grid-cols-4/,
    "keep the what-if form single-column on phones and use fewer columns until labels have room",
  );
});

test("translated tax form actions can wrap and long table headings can scroll", () => {
  const page = source("app/(dashboard)/payroll/tax-forms/page.tsx");
  const table = source("components/ui/table.tsx");
  const englishLabel = message("en", "Payroll.TaxForms.generate1099");
  const frenchLabel = message("fr", "Payroll.TaxForms.generate1099");
  const canadianFrenchLabel = message("fr-CA", "Payroll.TaxForms.generate1099");

  assert.ok(frenchLabel.length > englishLabel.length);
  assert.ok(canadianFrenchLabel.length > englishLabel.length);
  assert.match(page, /className="flex flex-wrap items-center gap-2"/);
  assert.match(table, /overflow-x-auto/);
  assert.match(table, /whitespace-nowrap/);
});

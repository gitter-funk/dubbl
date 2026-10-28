import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encode } from "next-auth/jwt";
import { expect, test, type Page } from "@playwright/test";

type Messages = Record<string, unknown>;

const root = fileURLToPath(new URL("../../", import.meta.url));
const locales = ["fr", "fr-CA"] as const;
const demoUserId = "00000000-0000-0000-0000-000000000001";
const demoOrganizationId = "00000000-0000-0000-0000-000000000002";
const missingRecordId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const authSecret = "dubbl-ui-test-only-secret";
const viewports = [375, 768, 1280];
const dashboardRoutes = [
  "/dashboard",
  "/settings",
  "/settings/notifications",
  "/settings/roles",
  "/settings/tags",
  "/settings/api-keys",
  "/settings/members",
  "/sales",
  "/sales/quotes",
  "/tax",
  "/tax/periods",
  "/purchases",
  "/purchases/expenses",
  "/purchases/orders",
  "/purchases/requisitions",
  "/purchases/goods-receipts",
  "/purchases/bills/recurring",
  "/purchases/debit-notes",
  "/purchases/landed-costs",
  "/payroll",
  "/payroll/analytics",
  "/payroll/reports",
  "/payroll/employees",
  "/payroll/runs",
  "/payroll/leave",
  "/payroll/timesheets",
  "/payroll/settings",
  "/payroll/contractors",
  "/payroll/compensation",
  "/payroll/tax-forms",
  "/payroll/tax-liabilities",
  "/payroll/forecasting",
  `/purchases/${missingRecordId}`,
  `/payroll/employees/${missingRecordId}`,
  `/payroll/runs/${missingRecordId}`,
  `/payroll/runs/${missingRecordId}/payslips`,
  `/payroll/contractors/${missingRecordId}`,
  `/payroll/compensation/reviews/${missingRecordId}`,
  `/payroll/tax-forms/${missingRecordId}`,
];

function catalog(locale: string): Messages {
  return JSON.parse(
    readFileSync(path.join(root, "messages", `${locale}.json`), "utf8"),
  ) as Messages;
}

function resolveMessage(locale: string, key: string): string {
  const parts = key.split(".");
  const lookUp = (messages: Messages): unknown => {
    let value: unknown = messages;
    for (const part of parts) {
      value = (value as Messages | undefined)?.[part];
    }
    return value;
  };

  const base = locale.split("-")[0];
  const value = lookUp(catalog(locale)) ?? (base !== locale ? lookUp(catalog(base)) : undefined);
  assert.equal(typeof value, "string", `${locale}.${key} must resolve to a message`);
  return value as string;
}

async function expectNoPageOverflow(
  page: Page,
  locale: string,
  route: string,
) {
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(
      documentWidth,
      `${locale} ${route} should not create horizontal page overflow at ${width}px`,
    ).toBeLessThanOrEqual(width);
  }
}

async function authenticateAsSeededDemo(page: Page) {
  const value = await encode({
    token: { sub: demoUserId, id: demoUserId },
    secret: authSecret,
    salt: "authjs.session-token",
  });
  await page.context().addCookies([{
    name: "authjs.session-token",
    value,
    url: "http://127.0.0.1:3100",
    httpOnly: true,
    sameSite: "Lax",
  }]);
  await page.addInitScript((organizationId) => {
    localStorage.setItem("activeOrgId", organizationId);
  }, demoOrganizationId);
}

for (const locale of locales) {
  test(`sign-in and sign-up render ${locale} copy without responsive overflow`, async ({ page }) => {
    for (const [route, messageKey] of [
      ["/sign-in", "Auth.welcomeBack"],
      ["/sign-up", "Auth.createYourAccount"],
    ] as const) {
      await page.goto(route);
      await page.getByRole("combobox").selectOption(locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        resolveMessage(locale, messageKey),
      );
      await expect(
        page.getByLabel(resolveMessage(locale, "Auth.email")),
      ).toHaveAttribute(
        "placeholder",
        resolveMessage(locale, "Auth.emailPlaceholder"),
      );
      await expectNoPageOverflow(page, locale, route);
    }
  });

  test(`signed-in dashboard routes render in ${locale} without responsive overflow`, async ({ page }) => {
    test.setTimeout(300_000);
    page.setDefaultNavigationTimeout(120_000);
    await authenticateAsSeededDemo(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);

    await page.getByRole("combobox").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("link", { name: "Tableau de bord" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Paramètres" })).toBeVisible();

    for (const route of dashboardRoutes) {
      const response = await page.goto(route);
      expect(response?.status(), `${locale} ${route} should render`).toBeLessThan(400);
      await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}$`));
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expectNoPageOverflow(page, locale, route);
    }
  });
}

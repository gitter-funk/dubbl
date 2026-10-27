import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { mergeMessages } from "../lib/i18n/merge-messages";
import { getLocaleCatalogLocale } from "../lib/i18n/locales";

type CatalogValue = string | { [key: string]: CatalogValue };
type Catalog = Record<string, CatalogValue>;

const messagesDir = fileURLToPath(new URL("../messages/", import.meta.url));

function loadCatalog(locale: string): Catalog {
  const filePath = path.join(messagesDir, `${locale}.json`);
  return JSON.parse(readFileSync(filePath, "utf8")) as Catalog;
}

function leafValues(value: CatalogValue, prefix = ""): Map<string, string> {
  const leaves = new Map<string, string>();

  for (const [key, child] of Object.entries(value)) {
    const messageKey = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") {
      leaves.set(messageKey, child);
    } else {
      for (const [nestedKey, message] of leafValues(child, messageKey)) {
        leaves.set(nestedKey, message);
      }
    }
  }

  return leaves;
}

function hasNonEmptyMessage(catalogs: Catalog[], key: string): boolean {
  return catalogs.some((catalog) => {
    const value = leafValues(catalog).get(key);
    return value !== undefined && value.trim().length > 0;
  });
}

function placeholders(message: string): string[] {
  return [...new Set([...message.matchAll(/\{\s*([A-Za-z0-9_]+)\s*(?:,|\})/g)].map((match) => match[1]))].sort();
}

test("every locale provides all English message keys through its fallback chain", () => {
  const catalogFiles = readdirSync(messagesDir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  const locales = catalogFiles.map((file) => file.slice(0, -".json".length));
  const english = loadCatalog("en");
  const englishKeys = [...leafValues(english).keys()].sort();

  assert.ok(locales.includes("en"), "messages/en.json must exist as the fallback catalog");

  const failures: string[] = [];
  for (const locale of locales) {
    if (locale === "en") continue;

    const regionalCatalog = loadCatalog(locale);
    const baseLanguage = locale.split("-")[0];
    const fallbackCatalogs = [
      ...(baseLanguage !== locale && locales.includes(baseLanguage)
        ? [loadCatalog(baseLanguage)]
        : []),
      regionalCatalog,
    ];

    const missingKeys = englishKeys.filter(
      (key) => !hasNonEmptyMessage(fallbackCatalogs, key)
    );

    if (missingKeys.length > 0) {
      failures.push(`${locale}:\n  ${missingKeys.join("\n  ")}`);
    }
  }

  assert.deepEqual(
    failures,
    [],
    `Missing translations (regional catalogs may inherit from their base language):\n${failures.join("\n")}`
  );
});

test("locale catalogs only contain keys present in the English source", () => {
  const englishKeys = new Set(leafValues(loadCatalog("en")).keys());
  const catalogFiles = readdirSync(messagesDir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  const failures: string[] = [];

  for (const file of catalogFiles) {
    if (file === "en.json") continue;
    const locale = file.slice(0, -".json".length);
    const extraKeys = [...leafValues(loadCatalog(locale)).keys()]
      .filter((key) => !englishKeys.has(key));
    if (extraKeys.length > 0) {
      failures.push(locale + ":\n  " + extraKeys.join("\n  "));
    }
  }

  assert.deepEqual(
    failures,
    [],
    "Locale catalogs must not contain unknown message keys:\n" + failures.join("\n"),
  );
});

test("regional catalogs contain only messages that differ from their base language", () => {
  const catalogFiles = readdirSync(messagesDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length));
  const catalogNames = new Set(catalogFiles);
  const failures: string[] = [];

  for (const locale of catalogNames) {
    const baseLanguage = locale.split("-")[0];
    if (baseLanguage === locale || !catalogNames.has(baseLanguage)) continue;

    const base = leafValues(loadCatalog(baseLanguage));
    const regional = leafValues(loadCatalog(locale));
    const duplicatedMessages = [...regional].filter(([key, value]) => base.get(key) === value);
    if (duplicatedMessages.length > 0) {
      failures.push(`${locale} duplicates ${duplicatedMessages.length} messages from ${baseLanguage}:\n  ${duplicatedMessages.map(([key]) => key).join("\n  ")}`);
    }
  }

  assert.deepEqual(failures, [], failures.join("\n"));
});

test("regional catalogs inherit French and English messages at runtime", () => {
  const resolved = mergeMessages(
    mergeMessages(loadCatalog("en"), loadCatalog("fr")),
    loadCatalog("fr-CA"),
  );
  const resolvedLeaves = leafValues(resolved as CatalogValue);

  assert.equal(
    resolvedLeaves.get("Sales.Quotes.newQuote"),
    "Nouvelle soumission",
    "Canadian French overrides its parent French message",
  );
  assert.equal(
    resolvedLeaves.get("Navigation.dashboard"),
    leafValues(loadCatalog("fr")).get("Navigation.dashboard"),
    "Canadian French inherits the parent French message when no override exists",
  );
});

test("German UI messages are translated and Swiss spelling overrides inherit", () => {
  const german = leafValues(loadCatalog("de"));
  const swiss = leafValues(loadCatalog("de-CH"));
  const resolved = leafValues(mergeMessages(loadCatalog("de"), loadCatalog("de-CH")) as CatalogValue);

  assert.equal(german.get("Navigation.payroll"), "Lohnabrechnung");
  assert.equal(german.get("Navigation.dashboard"), "Übersicht");
  assert.equal(
    german.get("Settings.Members.billingPastDueDescription"),
    "Aktualisieren Sie Ihre Zahlungsmethode, um weiterhin Mitglieder einzuladen.",
  );
  assert.equal(swiss.get("Settings.General.street"), "Strasse");
  assert.equal(resolved.get("Settings.ApiKeys.createdOn"), german.get("Settings.ApiKeys.createdOn"));
});

test("Spanish UI messages are translated and Mexico resolves to the Spanish catalog", () => {
  const spanish = leafValues(loadCatalog("es"));

  assert.equal(spanish.get("Navigation.dashboard"), "Panel de control");
  assert.equal(spanish.get("Navigation.payroll"), "Nóminas");
  assert.equal(spanish.get("Sales.Quotes.newQuote"), "Nuevo presupuesto");
  assert.equal(getLocaleCatalogLocale("es-MX"), "es");
});

test("Italian UI messages use Italian accounting terminology", () => {
  const italian = leafValues(loadCatalog("it"));

  assert.equal(italian.get("Navigation.dashboard"), "Pannello di controllo");
  assert.equal(italian.get("Navigation.payroll"), "Paghe");
  assert.equal(italian.get("Navigation.payslips"), "Buste paga");
  assert.equal(italian.get("Sales.Quotes.newQuote"), "Nuovo preventivo");
});

test("European Portuguese uses Portugal-specific payroll and quote terms", () => {
  const portuguese = leafValues(loadCatalog("pt"));

  assert.equal(portuguese.get("Navigation.payroll"), "Processamento salarial");
  assert.equal(portuguese.get("Navigation.quotes"), "Orçamentos");
  assert.equal(portuguese.get("Navigation.payslips"), "Recibos de vencimento");
  assert.equal(portuguese.get("Sales.Quotes.newQuote"), "Novo orçamento");
  assert.equal(getLocaleCatalogLocale("pt-PT"), "pt");
  assert.equal(getLocaleCatalogLocale("pt-BR"), "pt");
});

test("Brazilian Portuguese overrides inherit the European Portuguese base catalog", () => {
  const portuguese = leafValues(loadCatalog("pt"));
  const brazilianOverrides = leafValues(loadCatalog("pt-BR"));
  const resolved = leafValues(
    mergeMessages(
      mergeMessages(loadCatalog("en"), loadCatalog("pt")),
      loadCatalog("pt-BR"),
    ) as CatalogValue,
  );

  assert.equal(brazilianOverrides.get("Navigation.payroll"), "Folha de pagamento");
  assert.equal(resolved.get("Navigation.dashboard"), portuguese.get("Navigation.dashboard"));
  assert.equal(resolved.get("Navigation.payroll"), "Folha de pagamento");
});

test("nested locale fallback preserves English and French values under regional overrides", () => {
  const resolved = mergeMessages(
    mergeMessages(
      {
        englishOnly: "English fallback",
        nested: { parentLanguage: "English parent", regional: "English regional" },
      },
      { nested: { parentLanguage: "French parent" } },
    ),
    { nested: { regional: "French Canadian regional" } },
  );
  const nested = resolved.nested as Record<string, unknown>;

  assert.equal(resolved.englishOnly, "English fallback");
  assert.equal(nested.parentLanguage, "French parent");
  assert.equal(nested.regional, "French Canadian regional");
});

test("translations preserve the placeholders used by English messages", () => {
  const catalogFiles = readdirSync(messagesDir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  const locales = catalogFiles.map((file) => file.slice(0, -".json".length));
  const english = leafValues(loadCatalog("en"));
  const failures: string[] = [];

  for (const locale of locales) {
    if (locale === "en") continue;
    const baseLanguage = locale.split("-")[0];
    const resolved = new Map<string, string>();
    if (baseLanguage !== locale && locales.includes(baseLanguage)) {
      for (const [key, value] of leafValues(loadCatalog(baseLanguage))) resolved.set(key, value);
    }
    for (const [key, value] of leafValues(loadCatalog(locale))) resolved.set(key, value);

    for (const [key, sourceMessage] of english) {
      const translatedMessage = resolved.get(key);
      if (!translatedMessage) continue;
      const sourcePlaceholders = placeholders(sourceMessage);
      const translatedPlaceholders = placeholders(translatedMessage);
      if (sourcePlaceholders.join(",") !== translatedPlaceholders.join(",")) {
        failures.push(
          `${locale}.${key}: expected {${sourcePlaceholders.join(", ")}}, got {${translatedPlaceholders.join(", ")}}`
        );
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `Message placeholders must match English so interpolated data renders in every locale:\n${failures.join("\n")}`
  );
});

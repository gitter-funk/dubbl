import assert from "node:assert/strict";
import test from "node:test";
import {
  getLocaleCatalogLocale,
  localeLabels,
  locales,
  resolveLocale,
} from "../lib/i18n/locales";

test("supported locale tags cover the requested regional variants", () => {
  assert.deepEqual(locales, [
    "en", "en-GB", "en-US", "en-AU", "en-NZ", "en-CA",
    "fr", "fr-CA",
    "de-DE", "de-AT", "de-CH",
    "es-ES", "es-MX", "it-IT", "pt-PT", "pt-BR",
    "zh-Hans", "zh-Hant",
  ]);
  assert.deepEqual(Object.keys(localeLabels).sort(), [...locales].sort());
});

test("locale resolution prefers exact regional settings and matches language fallback", () => {
  assert.equal(resolveLocale("de-AT"), "de-AT");
  assert.equal(resolveLocale("de-CH", ["de-DE", "en"]), "de-DE");
  assert.equal(resolveLocale("fr-BE", ["fr", "en"]), "fr");
  assert.equal(resolveLocale("es-MX", ["es-ES", "en"]), "es-ES");
  assert.equal(resolveLocale("ja-JP", ["en-US", "fr"]), "en-US");
});

test("Chinese language fallback respects requested script and common regions", () => {
  assert.equal(resolveLocale("zh-TW", ["zh-Hans", "zh-Hant", "en"]), "zh-Hant");
  assert.equal(resolveLocale("zh-CN", ["zh-Hans", "zh-Hant", "en"]), "zh-Hans");
  assert.equal(resolveLocale("zh-Hant"), "zh-Hant");
  assert.equal(getLocaleCatalogLocale("zh-Hant"), "zh-Hant");
  assert.equal(getLocaleCatalogLocale("pt-BR"), "pt");
});

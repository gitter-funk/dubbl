import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { AppLocale } from "@/lib/i18n/locales";

export interface PayslipPdfData {
  employeeName: string;
  employeeNumber: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: Date;
  currency: string;
  gross: number;
  tax: number;
  deductions: number;
  net: number;
  ytdGross: number;
  ytdTax: number;
  ytdNet: number;
  deductionLines: Array<{ name: string; amount: number }>;
}

export interface PayslipPdfTemplate {
  accentColor?: string | null;
  showTaxBreakdown?: boolean;
  notes?: string | null;
  footerHtml?: string | null;
}

const copy = {
  en: { title: "Pay statement", employee: "Employee", number: "Employee number", period: "Pay period", generated: "Generated", earnings: "Gross pay", tax: "Tax withheld", deductions: "Other deductions", net: "Net pay", ytd: "Year to date", ytdGross: "Gross pay", ytdTax: "Tax withheld", ytdNet: "Net pay" },
  fr: { title: "Bulletin de paie", employee: "Employé", number: "Matricule", period: "Période de paie", generated: "Généré le", earnings: "Salaire brut", tax: "Impôt retenu", deductions: "Autres retenues", net: "Salaire net", ytd: "Cumul annuel", ytdGross: "Salaire brut", ytdTax: "Impôt retenu", ytdNet: "Salaire net" },
  "fr-CA": { title: "Relevé de paie", employee: "Employé", number: "Numéro d’employé", period: "Période de paie", generated: "Généré le", earnings: "Rémunération brute", tax: "Impôt retenu", deductions: "Autres retenues", net: "Rémunération nette", ytd: "Cumul annuel", ytdGross: "Rémunération brute", ytdTax: "Impôt retenu", ytdNet: "Rémunération nette" },
} as const;

const styles = StyleSheet.create({ page: { padding: 40, fontFamily: "Helvetica", color: "#111827", fontSize: 10 }, accentBar: { height: 4, marginBottom: 24 }, title: { fontSize: 20, marginBottom: 24, fontFamily: "Helvetica-Bold" }, section: { marginBottom: 18 }, row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" }, label: { color: "#6b7280" }, emphasis: { fontFamily: "Helvetica-Bold", fontSize: 12 }, heading: { fontSize: 11, marginBottom: 6, fontFamily: "Helvetica-Bold" }, note: { marginTop: 8, color: "#6b7280", lineHeight: 1.4 }, footer: { position: "absolute", bottom: 24, left: 40, right: 40, color: "#6b7280", fontSize: 8, borderTopWidth: 0.5, borderTopColor: "#e5e7eb", paddingTop: 6 } });

function money(cents: number, currency: string, locale: AppLocale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
function date(value: string | Date, locale: AppLocale) {
  const parsed = value instanceof Date ? value : new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
}
function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <View style={styles.row}><Text style={emphasis ? styles.emphasis : styles.label}>{label}</Text><Text style={emphasis ? styles.emphasis : undefined}>{value}</Text></View>;
}
function PayslipDocument({ data, locale, template }: { data: PayslipPdfData; locale: AppLocale; template?: PayslipPdfTemplate }) {
  const t = locale.startsWith("fr") ? copy[locale === "fr-CA" ? "fr-CA" : "fr"] : copy.en;
  const footerText = template?.footerHtml?.replace(/<[^>]*>/g, "").trim();
  return <Document><Page size="A4" style={styles.page}>
    <View style={[styles.accentBar, { backgroundColor: template?.accentColor || "#10b981" }]} />
    <Text style={styles.title}>{t.title}</Text>
    <View style={styles.section}>
      <Row label={t.employee} value={data.employeeName} />
      <Row label={t.number} value={data.employeeNumber} />
      <Row label={t.period} value={`${date(data.periodStart, locale)} – ${date(data.periodEnd, locale)}`} />
      <Row label={t.generated} value={date(data.generatedAt, locale)} />
    </View>
    <View style={styles.section}>
      <Text style={styles.heading}>{t.title}</Text>
      <Row label={t.earnings} value={money(data.gross, data.currency, locale)} />
      {template?.showTaxBreakdown !== false && <Row label={t.tax} value={money(data.tax, data.currency, locale)} />}
      <Row label={t.deductions} value={money(data.deductions, data.currency, locale)} />
      <Row label={t.net} value={money(data.net, data.currency, locale)} emphasis />
    </View>
    {data.deductionLines.length > 0 && <View style={styles.section}><Text style={styles.heading}>{t.deductions}</Text>{data.deductionLines.map((line, index) => <Row key={index} label={line.name} value={money(line.amount, data.currency, locale)} />)}</View>}
    <View style={styles.section}>
      <Text style={styles.heading}>{t.ytd}</Text>
      <Row label={t.ytdGross} value={money(data.ytdGross, data.currency, locale)} />
      <Row label={t.ytdTax} value={money(data.ytdTax, data.currency, locale)} />
      <Row label={t.ytdNet} value={money(data.ytdNet, data.currency, locale)} />
    </View>
    {template?.notes && <Text style={styles.note}>{template.notes}</Text>}
    {footerText && <Text style={styles.footer} fixed>{footerText}</Text>}
  </Page></Document>;
}

export async function renderPayslipPdf(data: PayslipPdfData, locale: AppLocale, template?: PayslipPdfTemplate): Promise<ArrayBuffer> {
  const buffer = await renderToBuffer(<PayslipDocument data={data} locale={locale} template={template} />);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

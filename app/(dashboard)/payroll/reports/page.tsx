"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { BarChart3, FileText, DollarSign, TrendingUp, Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { ContentReveal } from "@/components/ui/content-reveal";
import { BrandLoader } from "@/components/dashboard/brand-loader";
import { formatMoney } from "@/lib/money";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";

interface Summary {
  totalRuns: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  activeEmployees: number;
  avgCostPerRun: number;
}

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.3, delay } as const,
});

function getReportTypes(t: ReturnType<typeof useTranslations<"Payroll.Analytics">>) {
  return [
    { type: "summary", label: t("reports.payrollSummary"), description: t("reports.summaryHelp"), icon: BarChart3 },
    { type: "tax-liability", label: t("reports.taxLiability"), description: t("reports.taxLiabilityHelp"), icon: FileText },
    { type: "labor-cost", label: t("reports.laborCost"), description: t("reports.laborCostHelp"), icon: DollarSign },
    { type: "yoy", label: t("reports.yearOverYear"), description: t("reports.yearOverYearHelp"), icon: TrendingUp },
  ];
}

export default function ReportsPage() {
  const router = useRouter();
  const t = useTranslations("Payroll.Reports");
  const reportT = useTranslations("Payroll.Analytics");
  const locale = useLocale();
  const money = (amount: number) => formatMoney(amount, "USD", locale);
  const reportTypes = getReportTypes(reportT);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") : null;
  useDocumentTitle(t("pageTitle"));

  useEffect(() => {
    if (!orgId) return;
    fetch("/api/v1/payroll/reports/summary", {
      headers: { "x-organization-id": orgId },
    })
      .then((r) => r.json())
      .then((data) => { if (data.summary) setSummary(data.summary); })
      .finally(() => setLoading(false));
  }, [orgId]);

  function handleExport() {
    if (!orgId) return;
    window.open(`/api/v1/payroll/reports/export?x-organization-id=${orgId}`, "_blank");
  }

  if (loading) return <BrandLoader />;

  return (
    <ContentReveal className="space-y-6">
      <PageHeader title={t("title")} description={t("description")}>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleExport}>
          <Download className="mr-1.5 size-3" /> {t("exportCsv")}
        </Button>
      </PageHeader>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div {...anim(0)} className="rounded-xl border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("totalRuns")}</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums">{summary.totalRuns}</p>
          </motion.div>
          <motion.div {...anim(0.05)} className="rounded-xl border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("totalGross")}</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums">{money(summary.totalGross)}</p>
          </motion.div>
          <motion.div {...anim(0.1)} className="rounded-xl border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("totalNet")}</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{money(summary.totalNet)}</p>
          </motion.div>
          <motion.div {...anim(0.15)} className="rounded-xl border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("averageCostPerRun")}</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums">{money(summary.avgCostPerRun)}</p>
          </motion.div>
        </div>
      )}

      {/* Report type cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {reportTypes.map((report, i) => (
          <motion.button
            key={report.type}
            {...anim(0.2 + i * 0.05)}
            onClick={() => router.push(`/payroll/reports/${report.type}`)}
            className="flex items-start gap-4 rounded-xl border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <report.icon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{report.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </ContentReveal>
  );
}

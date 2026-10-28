"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContentReveal } from "@/components/ui/content-reveal";
import { BrandLoader } from "@/components/dashboard/brand-loader";
import { formatMoney } from "@/lib/money";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";

interface ReviewDetail {
  id: string;
  name: string;
  effectiveDate: string;
  status: string;
  totalBudget: number | null;
  entries: ReviewEntry[];
}

interface ReviewEntry {
  id: string;
  currentSalary: number;
  proposedSalary: number;
  adjustmentPercent: number | null;
  reason: string | null;
  approved: boolean | null;
  employee: { name: string; employeeNumber: string } | null;
}

const statusColors: Record<string, string> = {
  draft: "",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

export default function ReviewDetailPage() {
  const t = useTranslations("Payroll.ReviewDetails");
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  useDocumentTitle(t("pageTitle"));

  const orgId = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") : null;

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/v1/payroll/compensation/reviews/${id}`, {
      headers: { "x-organization-id": orgId },
    })
      .then((r) => r.json())
      .then((data) => { if (data.review) setReview(data.review); })
      .finally(() => setLoading(false));
  }, [id, orgId]);

  if (loading) return <BrandLoader />;
  if (!review) {
    return (
      <ContentReveal>
        <button onClick={() => router.push("/payroll/compensation")} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="size-3.5" /> {t("back")}
        </button>
        <p className="text-sm text-muted-foreground">{t("reviewNotFound")}</p>
      </ContentReveal>
    );
  }

  const totalCurrent = review.entries.reduce((s, e) => s + e.currentSalary, 0);
  const totalProposed = review.entries.reduce((s, e) => s + e.proposedSalary, 0);

  return (
    <ContentReveal className="space-y-6">
      <button onClick={() => router.push("/payroll/compensation")} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> {t("backToCompensation")}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <BarChart3 className="size-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{review.name}</h1>
            <Badge variant="outline" className={statusColors[review.status] || ""}>{t(`statuses.${review.status === "in_progress" ? "inProgress" : review.status}` as "statuses.draft" | "statuses.inProgress" | "statuses.completed" | "statuses.cancelled")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("effectiveDate", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${review.effectiveDate}T12:00:00Z`)) })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("currentTotal")}</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums truncate">{formatMoney(totalCurrent, "USD", locale)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("proposedTotal")}</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums truncate text-emerald-600 dark:text-emerald-400">{formatMoney(totalProposed, "USD", locale)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("totalIncrease")}</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums truncate">{formatMoney(totalProposed - totalCurrent, "USD", locale)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{t("entriesCount", { count: review.entries.length })}</h3>
        {review.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("noEntries")}</p>
        ) : (
          <div className="rounded-xl border bg-card divide-y">
            {review.entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{e.employee?.name || t("unknownEmployee")}</p>
                  <p className="text-xs text-muted-foreground font-mono">{e.employee?.employeeNumber}</p>
                  {e.reason && <p className="text-xs text-muted-foreground mt-0.5">{e.reason}</p>}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t("current")}</p>
                    <p className="text-sm font-mono tabular-nums">{formatMoney(e.currentSalary, "USD", locale)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t("proposed")}</p>
                    <p className="text-sm font-mono tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{formatMoney(e.proposedSalary, "USD", locale)}</p>
                  </div>
                  {e.adjustmentPercent !== null && (
                    <Badge variant="outline" className="text-[10px]">+{e.adjustmentPercent?.toFixed(1)}%</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ContentReveal>
  );
}

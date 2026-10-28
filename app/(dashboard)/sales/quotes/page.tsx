"use client";

import { useState, useEffect } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, FileText, ScrollText, ArrowRightLeft } from "lucide-react";
import { useCreateDrawer } from "@/components/dashboard/create-drawer";
import { Section } from "@/components/dashboard/section";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { formatMoney } from "@/lib/money";
import { BlurReveal } from "@/components/ui/blur-reveal";
import { BrandLoader } from "@/components/dashboard/brand-loader";

interface Quote {
  id: string;
  quoteNumber: string;
  issueDate: string;
  expiryDate: string;
  status: string;
  total: number;
  contact: { name: string } | null;
}

const statusColors: Record<string, string> = {
  draft: "",
  sent: "border-blue-200 bg-blue-50 text-blue-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  declined: "border-red-200 bg-red-50 text-red-700",
  expired: "border-gray-200 bg-gray-50 text-gray-700",
  converted: "border-purple-200 bg-purple-50 text-purple-700",
};

// Plain-language status labels (end users aren't accountants).
const statusLabels: Record<string, string> = {
  draft: "draft",
  sent: "sent",
  accepted: "accepted",
  declined: "declined",
  expired: "expired",
  converted: "converted",
};

function buildColumns(t: ReturnType<typeof useTranslations>, format: ReturnType<typeof useFormatter>, locale: string): Column<Quote>[] {
  return [
  {
    key: "number",
    header: t("number"),
    className: "w-32",
    render: (r) => <span className="font-mono text-sm">{r.quoteNumber}</span>,
  },
  {
    key: "contact",
    header: t("customer"),
    render: (r) => (
      <span className="text-sm font-medium">{r.contact?.name || "-"}</span>
    ),
  },
  {
    key: "date",
    header: t("date"),
    className: "w-28",
    render: (r) => <span className="text-sm">{format.dateTime(new Date(r.issueDate), { dateStyle: "medium" })}</span>,
  },
  {
    key: "expiry",
    header: t("expires"),
    className: "w-28",
    render: (r) => <span className="text-sm">{format.dateTime(new Date(r.expiryDate), { dateStyle: "medium" })}</span>,
  },
  {
    key: "status",
    header: t("status"),
    className: "w-24",
    render: (r) => (
      <Badge variant="outline" className={statusColors[r.status] || ""}>
        {statusLabels[r.status] ? t(`statuses.${statusLabels[r.status]}`) : r.status}
      </Badge>
    ),
  },
  {
    key: "total",
    header: t("total"),
    className: "w-28 text-right",
    render: (r) => (
      <span className="font-mono text-sm tabular-nums">
        {formatMoney(r.total, "USD", locale)}
      </span>
    ),
  },
  ];
}

export default function QuotesPage() {
  const t = useTranslations("Sales.Quotes");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const { open: openDrawer } = useCreateDrawer();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useDocumentTitle(t("pageTitle"));

  useEffect(() => {
    const orgId = localStorage.getItem("activeOrgId");
    if (!orgId) return;

    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/v1/quotes?${params}`, {
      headers: { "x-organization-id": orgId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setQuotes(data.data);
      })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const sent = quotes
    .filter((q) => q.status === "sent")
    .reduce((sum, q) => sum + q.total, 0);

  const accepted = quotes
    .filter((q) => q.status === "accepted")
    .reduce((sum, q) => sum + q.total, 0);

  const columns = buildColumns(t, format, locale);

  if (loading) {
    return <BrandLoader />;
  }

  if (quotes.length === 0 && statusFilter === "all") {
    return (
      <BlurReveal>
        <div className="flex items-start px-3 sm:px-6 pt-16 pb-12">
          <div className="grid w-full gap-10 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left: text + CTA */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                <ScrollText className="size-3.5 text-purple-500" />
                {t("quotesAndProposals")}
              </div>
              <h2 className="mt-4 text-lg sm:text-2xl font-semibold tracking-tight">{t("emptyHeading")}</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md">
                {t("emptyDescription")}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Button
                  onClick={() => openDrawer("quote")}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="mr-2 size-4" />
                  {t("newQuote")}
                </Button>
              </div>
              {/* Mini stats */}
              <div className="mt-8 flex gap-4 sm:gap-6 text-center">
                {[
                  { label: t("sent"), value: "0" },
                  { label: t("accepted"), value: "0" },
                  { label: t("converted"), value: "0" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xl font-bold font-mono tabular-nums text-muted-foreground/40">{value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: visual conversion flow */}
            <div className="relative hidden lg:block">
              {/* Quote card */}
              <div className="rounded-xl border bg-card p-5 shadow-sm max-w-xs ml-auto">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ScrollText className="size-4 text-purple-500" />
                    <span className="text-xs font-mono text-muted-foreground">{"QTE-0001"}</span>
                  </div>
                  <span className="rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">{t("statuses.accepted")}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("sampleWebsiteRedesign")}</span>
                    <span className="font-mono text-muted-foreground">{formatMoney(240000, "USD", locale)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("sampleSeoAudit")}</span>
                    <span className="font-mono text-muted-foreground">{formatMoney(80000, "USD", locale)}</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between text-xs font-medium">
                    <span>{t("total")}</span>
                    <span className="font-mono">{formatMoney(320000, "USD", locale)}</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center my-3">
                <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                  <div className="h-4 w-px bg-current" />
                  <ArrowRightLeft className="size-4 rotate-90" />
                  <span className="text-[10px] font-medium">{t("turnIntoInvoice")}</span>
                </div>
              </div>

              {/* Invoice card (faded) */}
              <div className="rounded-xl border border-dashed bg-card/50 p-5 max-w-xs ml-auto opacity-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-blue-500" />
                    <span className="text-xs font-mono text-muted-foreground">{"INV-0001"}</span>
                  </div>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{t("statuses.draft")}</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-28 rounded bg-muted" />
                  <div className="h-2 w-20 rounded bg-muted" />
                  <div className="h-px bg-border my-1" />
                  <div className="h-2.5 w-24 rounded bg-muted ml-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </BlurReveal>
    );
  }

  return (
    <BlurReveal className="space-y-10">
      <Section title={t("overview")} description={t("overviewDescription")}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title={t("sent")} value={formatMoney(sent, "USD", locale)} icon={FileText} />
            <StatCard title={t("accepted")} value={formatMoney(accepted, "USD", locale)} icon={FileText} changeType="positive" />
            <StatCard title={t("totalQuotes")} value={format.number(quotes.length)} icon={FileText} />
          </div>
          <div className="flex justify-end flex-wrap">
            <Button
              onClick={() => openDrawer("quote")}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="mr-2 size-4" />
              {t("newQuote")}
            </Button>
          </div>
        </div>
      </Section>

      <div className="h-px bg-border" />

      <Section title={t("quotes")} description={t("quotesDescription")}>
        <div className="space-y-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="overflow-x-auto">
              <TabsTrigger value="all" className="whitespace-nowrap">{t("all")}</TabsTrigger>
              <TabsTrigger value="draft" className="whitespace-nowrap">{t("statuses.draft")}</TabsTrigger>
              <TabsTrigger value="sent" className="whitespace-nowrap">{t("statuses.sent")}</TabsTrigger>
              <TabsTrigger value="accepted" className="whitespace-nowrap">{t("statuses.accepted")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <DataTable
            columns={columns}
            data={quotes}
            loading={loading}
            emptyMessage={t("noQuotesFound")}
            onRowClick={(r) => router.push(`/sales/quotes/${r.id}`)}
          />
        </div>
      </Section>
    </BlurReveal>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, Plus, Play, Trash2 } from "lucide-react";
import { Section } from "@/components/dashboard/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { ContentReveal } from "@/components/ui/content-reveal";
import { BrandLoader } from "@/components/dashboard/brand-loader";
import { formatMoney } from "@/lib/money";
import { CurrencySelect } from "@/components/ui/currency-select";
import { useConfirm } from "@/lib/hooks/use-confirm";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { cn } from "@/lib/utils";

interface ContractorDetail {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  taxId: string | null;
  hourlyRate: number | null;
  currency: string;
  bankAccountNumber: string | null;
  isActive: boolean;
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  description: string | null;
  invoiceNumber: string | null;
  status: string;
  paidAt: string | null;
}

const statusColors: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  void: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300",
};

export default function ContractorDetailPage() {
  const t = useTranslations("Payroll.ContractorDetails");
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contractor, setContractor] = useState<ContractorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Edit form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  // New payment
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDesc, setPaymentDesc] = useState("");
  const [paymentInvoice, setPaymentInvoice] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("");

  const orgId = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") : null;
  useDocumentTitle(t("pageTitle"));

  const fetchContractor = useCallback(() => {
    if (!orgId) return;
    fetch(`/api/v1/payroll/contractors/${id}`, {
      headers: { "x-organization-id": orgId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.contractor) {
          const c = data.contractor;
          setContractor(c);
          setName(c.name);
          setEmail(c.email || "");
          setCompany(c.company || "");
          setHourlyRate(c.hourlyRate ? (c.hourlyRate / 100).toFixed(2) : "");
          setBankAccount(c.bankAccountNumber || "");
          setPaymentCurrency(c.currency || "USD");
        }
      })
      .finally(() => setLoading(false));
  }, [orgId, id]);

  useEffect(() => { fetchContractor(); }, [fetchContractor]);

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/payroll/contractors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-organization-id": orgId },
        body: JSON.stringify({
          name,
          email: email || null,
          company: company || null,
          hourlyRate: hourlyRate ? Math.round(parseFloat(hourlyRate) * 100) : null,
          bankAccountNumber: bankAccount || null,
        }),
      });
      if (res.ok) toast.success(t("contractorUpdated"));
      else toast.error(t("updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPayment() {
    if (!orgId || !paymentAmount) return;
    const res = await fetch(`/api/v1/payroll/contractors/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-organization-id": orgId },
      body: JSON.stringify({
        amount: Math.round(parseFloat(paymentAmount) * 100),
        currency: paymentCurrency || contractor?.currency || "USD",
        description: paymentDesc || undefined,
        invoiceNumber: paymentInvoice || undefined,
      }),
    });
    if (res.ok) {
      toast.success(t("paymentAdded"));
      setPaymentAmount(""); setPaymentDesc(""); setPaymentInvoice("");
      fetchContractor();
    }
  }

  async function handleProcessPayment(paymentId: string) {
    if (!orgId) return;
    const confirmed = await confirm({
      title: t("processPaymentTitle"),
      description: t("processPaymentDescription"),
      confirmLabel: t("process"),
    });
    if (!confirmed) return;

    const res = await fetch(`/api/v1/payroll/contractors/${id}/payments/${paymentId}/process`, {
      method: "POST",
      headers: { "x-organization-id": orgId },
    });
    if (res.ok) {
      toast.success(t("paymentProcessed"));
      fetchContractor();
    } else {
      toast.error(t("processPaymentFailed"));
    }
  }

  async function handleDelete() {
    if (!orgId) return;
    const confirmed = await confirm({
      title: t("deleteConfirmTitle"),
      description: t("deleteConfirmDescription"),
      confirmLabel: t("delete"),
      destructive: true,
    });
    if (!confirmed) return;
    const res = await fetch(`/api/v1/payroll/contractors/${id}`, {
      method: "DELETE",
      headers: { "x-organization-id": orgId },
    });
    if (res.ok) {
      toast.success(t("contractorDeleted"));
      router.push("/payroll/contractors");
    }
  }

  if (loading) return <BrandLoader />;
  if (!contractor) {
    return (
      <ContentReveal>
        <button onClick={() => router.push("/payroll/contractors")} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="size-3.5" /> {t("backToContractors")}
        </button>
        <p className="text-sm text-muted-foreground">{t("contractorNotFound")}</p>
      </ContentReveal>
    );
  }

  return (
    <ContentReveal className="space-y-6">
      <button onClick={() => router.push("/payroll/contractors")} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> {t("backToContractors")}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Briefcase className="size-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{contractor.name}</h1>
            {contractor.currency && contractor.currency !== "USD" && (
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{contractor.currency}</code>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{contractor.company || contractor.email || "-"}</p>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        <Section title={t("details")} description={t("detailsDescription")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("company")}</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("hourlyRate")}</Label>
              <CurrencyInput prefix={new Intl.NumberFormat(locale, { style: "currency", currency: contractor.currency }).formatToParts(0).find((part) => part.type === "currency")?.value ?? contractor.currency} value={hourlyRate} onChange={setHourlyRate} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("bankAccount")}</Label>
              <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1.5 size-3.5" /> {t("delete")}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </Section>

        <div className="h-px bg-border" />

        <Section title={t("payments")} description={t("paymentsDescription")}>
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">{t("amount")}</Label>
                  <CurrencyInput prefix={new Intl.NumberFormat(locale, { style: "currency", currency: paymentCurrency || contractor.currency }).formatToParts(0).find((part) => part.type === "currency")?.value ?? (paymentCurrency || contractor.currency)} size="sm" value={paymentAmount} onChange={setPaymentAmount} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("currency")}</Label>
                  <CurrencySelect value={paymentCurrency} onValueChange={setPaymentCurrency} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("description")}</Label>
                  <Input value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("invoiceNumber")}</Label>
                  <Input value={paymentInvoice} onChange={(e) => setPaymentInvoice(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              <Button size="sm" onClick={handleAddPayment} disabled={!paymentAmount}>
                <Plus className="mr-1.5 size-3" /> {t("addPayment")}
              </Button>
            </div>

            {(contractor.payments || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t("noPayments")}</p>
            ) : (
              <div className="rounded-xl border bg-card divide-y">
                {(contractor.payments || []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium font-mono tabular-nums">{formatMoney(p.amount, contractor.currency || "USD", locale)}</p>
                      <p className="text-xs text-muted-foreground">{p.description || p.invoiceNumber || "-"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", statusColors[p.status] || "")}>
                        {t(`paymentStatuses.${p.status}` as "paymentStatuses.pending" | "paymentStatuses.paid" | "paymentStatuses.void")}
                      </Badge>
                      {p.status === "pending" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleProcessPayment(p.id)}>
                          <Play className="mr-1 size-3" /> {t("process")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      </div>

      {confirmDialog}
    </ContentReveal>
  );
}

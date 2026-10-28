"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Users, Power, PowerOff } from "lucide-react";
import { Section } from "@/components/dashboard/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentReveal } from "@/components/ui/content-reveal";
import { BrandLoader } from "@/components/dashboard/brand-loader";
import { formatMoney } from "@/lib/money";
import { useConfirm } from "@/lib/hooks/use-confirm";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { CurrencySelect } from "@/components/ui/currency-select";
import { cn } from "@/lib/utils";

interface EmployeeDetail {
  id: string;
  name: string;
  email: string | null;
  employeeNumber: string;
  position: string | null;
  salary: number;
  payFrequency: string;
  taxRate: number;
  bankAccountNumber: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  compensationType: string;
  hourlyRate: number | null;
  memberId: string | null;
  member: { user: { name: string | null; email: string } } | null;
  department: string | null;
  ptoBalanceHours: number | null;
  currency: string | null;
  compensationBandId: string | null;
}

interface EmployeeDeduction {
  id: string;
  deductionType: { name: string; category: string; timing: string };
  amount: number;
  isPercentage: boolean;
  isActive: boolean;
}

interface TaxConfig {
  id: string;
  filingStatus: string;
  federalAllowances: number;
  stateAllowances: number;
  additionalFederalWithholding: number;
  additionalStateWithholding: number;
}

interface LeaveBalance {
  id: string;
  balance: number;
  usedHours: number;
  policy: { name: string; leaveType: string } | null;
}

interface CompensationBand {
  id: string;
  name: string;
  minSalary: number;
  midSalary: number;
  maxSalary: number;
}

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.3, delay } as const,
});

function getPerPeriodPay(salary: number, frequency: string): number {
  switch (frequency) {
    case "weekly": return Math.round(salary / 52);
    case "biweekly": return Math.round(salary / 26);
    case "monthly": return Math.round(salary / 12);
    default: return Math.round(salary / 12);
  }
}

export default function EmployeeDetailPage() {
  const t = useTranslations("Payroll.EmployeeDetails");
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [emp, setEmp] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // New section state
  const [deductions, setDeductions] = useState<EmployeeDeduction[]>([]);
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [compensationBand, setCompensationBand] = useState<CompensationBand | null>(null);
  const [taxSaving, setTaxSaving] = useState(false);

  // Tax config form state
  const [tcFilingStatus, setTcFilingStatus] = useState("");
  const [tcFederalAllowances, setTcFederalAllowances] = useState("0");
  const [tcStateAllowances, setTcStateAllowances] = useState("0");
  const [tcAddlFederal, setTcAddlFederal] = useState("0");
  const [tcAddlState, setTcAddlState] = useState("0");

  // Edit form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [payFrequency, setPayFrequency] = useState("monthly");
  const [taxRate, setTaxRate] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [compensationType, setCompensationType] = useState("salary");
  const [hourlyRate, setHourlyRate] = useState("");
  const [currency, setCurrency] = useState("USD");
  useDocumentTitle(t("pageTitle"));

  const orgId =
    typeof window !== "undefined"
      ? localStorage.getItem("activeOrgId")
      : null;

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/v1/payroll/employees/${id}`, {
      headers: { "x-organization-id": orgId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.employee) {
          const e = data.employee;
          setEmp(e);
          setName(e.name);
          setEmail(e.email || "");
          setEmployeeNumber(e.employeeNumber);
          setPosition(e.position || "");
          setSalary((e.salary / 100).toFixed(2));
          setPayFrequency(e.payFrequency);
          setTaxRate((e.taxRate / 100).toFixed(2));
          setBankAccountNumber(e.bankAccountNumber || "");
          setStartDate(e.startDate || "");
          setEndDate(e.endDate || "");
          setIsActive(e.isActive);
          setCompensationType(e.compensationType || "salary");
          setHourlyRate(e.hourlyRate ? (e.hourlyRate / 100).toFixed(2) : "");
          setCurrency(e.currency || "USD");
        }
      })
      .finally(() => setLoading(false));
  }, [id, orgId]);

  // Fetch deductions, tax config, leave balances, compensation band
  useEffect(() => {
    if (!orgId) return;
    const headers = { "x-organization-id": orgId };

    fetch(`/api/v1/payroll/employees/${id}/deductions`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.deductions) setDeductions(data.deductions);
      })
      .catch(() => {});

    fetch(`/api/v1/payroll/employees/${id}/tax-config`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.taxConfig) {
          const tc = data.taxConfig;
          setTaxConfig(tc);
          setTcFilingStatus(tc.filingStatus || "");
          setTcFederalAllowances(String(tc.federalAllowances ?? 0));
          setTcStateAllowances(String(tc.stateAllowances ?? 0));
          setTcAddlFederal(String(tc.additionalFederalWithholding ?? 0));
          setTcAddlState(String(tc.additionalStateWithholding ?? 0));
        }
      })
      .catch(() => {});

    fetch(`/api/v1/payroll/employees/${id}/leave-balances`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.leaveBalances) setLeaveBalances(data.leaveBalances);
      })
      .catch(() => {});
  }, [id, orgId]);

  // Fetch compensation band when employee loads
  useEffect(() => {
    if (!orgId || !emp?.compensationBandId) return;
    fetch(`/api/v1/payroll/compensation-bands/${emp.compensationBandId}`, {
      headers: { "x-organization-id": orgId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.band) setCompensationBand(data.band);
      })
      .catch(() => {});
  }, [orgId, emp?.compensationBandId]);

  async function handleSaveTaxConfig() {
    if (!orgId) return;
    setTaxSaving(true);
    try {
      const res = await fetch(`/api/v1/payroll/employees/${id}/tax-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({
          filingStatus: tcFilingStatus,
          federalAllowances: parseInt(tcFederalAllowances) || 0,
          stateAllowances: parseInt(tcStateAllowances) || 0,
          additionalFederalWithholding: parseFloat(tcAddlFederal) || 0,
          additionalStateWithholding: parseFloat(tcAddlState) || 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.taxConfig) setTaxConfig(data.taxConfig);
        toast.success(t("taxConfigUpdated"));
      } else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : t("taxConfigUpdateFailed"));
      }
    } catch {
      toast.error(t("taxConfigUpdateFailed"));
    } finally {
      setTaxSaving(false);
    }
  }

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/payroll/employees/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({
          name,
          email: email || null,
          position: position || null,
          salary: Math.round(parseFloat(salary) * 100),
          payFrequency,
          taxRate: Math.round(parseFloat(taxRate) * 100),
          bankAccountNumber: bankAccountNumber || null,
          isActive,
          compensationType,
          hourlyRate: hourlyRate ? Math.round(parseFloat(hourlyRate) * 100) : null,
          currency,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmp(data.employee);
        toast.success(t("employeeUpdated"));
      } else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : t("updateFailed"));
      }
    } catch {
      toast.error(t("employeeUpdateFailed"));
    } finally {
      setSaving(false);
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
    const res = await fetch(`/api/v1/payroll/employees/${id}`, {
      method: "DELETE",
      headers: { "x-organization-id": orgId },
    });
    if (res.ok) {
      toast.success(t("employeeDeleted"));
      router.push("/payroll/employees");
    } else {
      toast.error(t("employeeDeleteFailed"));
    }
  }

  if (loading) return <BrandLoader />;

  if (!emp) {
    return (
      <ContentReveal>
        <button
          onClick={() => router.push("/payroll/employees")}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="size-3.5" />
          {t("backToEmployees")}
        </button>
        <p className="text-sm text-muted-foreground">{t("employeeNotFound")}</p>
      </ContentReveal>
    );
  }

  const salaryInCents = Math.round(parseFloat(salary || "0") * 100);
  const taxRateNum = parseFloat(taxRate || "0");

  return (
    <ContentReveal className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/payroll/employees")}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        {t("backToEmployees")}
      </button>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            isActive
              ? "bg-emerald-50 dark:bg-emerald-950/40"
              : "bg-muted"
          )}>
            <Users className={cn(
              "size-5",
              isActive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{emp.name}</h1>
              <Badge variant="outline" className={
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : ""
              }>
                {isActive ? t("active") : t("inactive")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {emp.employeeNumber}{emp.position ? ` · ${emp.position}` : ""}
            </p>
            {emp.member && (
              <p className="text-xs text-muted-foreground">
                {t("linkedTo", { name: emp.member.user.name || emp.member.user.email })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsActive(!isActive)}>
            {isActive ? (
              <><PowerOff className="mr-1.5 size-3.5" />{t("deactivate")}</>
            ) : (
              <><Power className="mr-1.5 size-3.5" />{t("activate")}</>
            )}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <motion.div {...anim(0)} className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {compensationType === "salary" ? t("annualSalary") : compensationType === "hourly" ? t("hourlyRate") : t("compensation")}
          </p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums truncate">
            {compensationType === "salary"
              ? formatMoney(salaryInCents, currency, locale)
              : compensationType === "hourly"
                ? formatMoney(Math.round(parseFloat(hourlyRate || "0") * 100), currency, locale)
                : "-"}
          </p>
        </motion.div>
        <motion.div {...anim(0.05)} className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("perPeriodPay")}</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums truncate">{formatMoney(getPerPeriodPay(salaryInCents, payFrequency), currency, locale)}</p>
        </motion.div>
        <motion.div {...anim(0.09)} className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("taxRate")}</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums truncate">{taxRateNum}%</p>
        </motion.div>
        <motion.div {...anim(0.12)} className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("compensationType")}</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums truncate">{t(`compensationTypes.${compensationType}` as "compensationTypes.salary" | "compensationTypes.hourly" | "compensationTypes.milestone" | "compensationTypes.commission")}</p>
        </motion.div>
      </div>

      {/* Edit form */}
      <div className="max-w-4xl space-y-6">
        {/* Personal Info */}
        <Section title={t("personalInfo")} description={t("personalInfoDescription")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("fullName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("employeeNumber")}</Label>
              <Input
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("position")}</Label>
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
          </div>
        </Section>

        <div className="h-px bg-border" />

        {/* Compensation */}
        <Section title={t("compensation")} description={t("compensationDescription")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("compensationType")}</Label>
              <Select value={compensationType} onValueChange={setCompensationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">{t("compensationTypes.salary")}</SelectItem>
                  <SelectItem value="hourly">{t("compensationTypes.hourly")}</SelectItem>
                  <SelectItem value="milestone">{t("compensationTypes.milestone")}</SelectItem>
                  <SelectItem value="commission">{t("compensationTypes.commission")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("annualSalary")}</Label>
              <CurrencyInput
                prefix="$"
                value={salary}
                onChange={setSalary}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("payFrequency")}</Label>
              <Select value={payFrequency} onValueChange={setPayFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t("frequencies.weekly")}</SelectItem>
                  <SelectItem value="biweekly">{t("frequencies.biweekly")}</SelectItem>
                  <SelectItem value="monthly">{t("frequencies.monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("taxRatePercent")}</Label>
              <Input
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
            {compensationType === "hourly" && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t("hourlyRate")}</Label>
                <CurrencyInput prefix="$" value={hourlyRate} onChange={setHourlyRate} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("currency")}</Label>
              <CurrencySelect value={currency} onValueChange={setCurrency} />
            </div>
          </div>
        </Section>

        <div className="h-px bg-border" />

        {/* Details */}
        <Section title={t("details")} description={t("detailsDescription")}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("bankAccountNumber")}</Label>
              <Input
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("endDate")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled
              />
            </div>
          </div>
        </Section>

        <div className="h-px bg-border" />

        {/* Deductions */}
        <Section title={t("deductions")} description={t("deductionsDescription")}>
          {deductions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noDeductions")}</p>
          ) : (
            <div className="space-y-2">
              {deductions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{d.deductionType.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[11px]">
                          {d.deductionType.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px]",
                            d.deductionType.timing === "pre_tax"
                              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          )}
                        >
                          {d.deductionType.timing === "pre_tax" ? t("preTax") : t("postTax")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono tabular-nums">
                      {d.isPercentage ? `${d.amount}%` : formatMoney(d.amount, currency, locale)}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px]",
                        d.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : ""
                      )}
                    >
                      {d.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <div className="h-px bg-border" />

        {/* Tax Configuration */}
        <Section title={t("taxConfiguration")} description={t("taxConfigurationDescription")}>
          {!taxConfig ? (
            <p className="text-sm text-muted-foreground">{t("noTaxConfiguration")}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("filingStatus")}</Label>
                  <Select value={tcFilingStatus} onValueChange={setTcFilingStatus}>
                    <SelectTrigger><SelectValue placeholder={t("selectStatus")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{t("filingStatuses.single")}</SelectItem>
                      <SelectItem value="married_filing_jointly">{t("filingStatuses.marriedFilingJointly")}</SelectItem>
                      <SelectItem value="married_filing_separately">{t("filingStatuses.marriedFilingSeparately")}</SelectItem>
                      <SelectItem value="head_of_household">{t("filingStatuses.headOfHousehold")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("federalAllowances")}</Label>
                  <Input
                    type="number"
                    value={tcFederalAllowances}
                    onChange={(e) => setTcFederalAllowances(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("stateAllowances")}</Label>
                  <Input
                    type="number"
                    value={tcStateAllowances}
                    onChange={(e) => setTcStateAllowances(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("additionalFederalWithholding")}</Label>
                  <CurrencyInput
                    prefix="$"
                    value={tcAddlFederal}
                    onChange={setTcAddlFederal}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("additionalStateWithholding")}</Label>
                  <CurrencyInput
                    prefix="$"
                    value={tcAddlState}
                    onChange={setTcAddlState}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveTaxConfig}
                  disabled={taxSaving}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="mr-1.5 size-3.5" />
                  {taxSaving ? t("saving") : t("saveTaxConfig")}
                </Button>
              </div>
            </div>
          )}
        </Section>

        <div className="h-px bg-border" />

        {/* Leave Balances */}
        <Section title={t("leaveBalances")} description={t("leaveBalancesDescription")}>
          {leaveBalances.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noLeaveBalances")}</p>
          ) : (
            <div className="space-y-2">
              {leaveBalances.map((lb) => (
                <div
                  key={lb.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{lb.policy?.name || "-"}</p>
                      {lb.policy?.leaveType && (
                        <Badge variant="outline" className="mt-0.5 text-[11px]">
                          {lb.policy.leaveType}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-mono tabular-nums">
                    <div className="text-right">
                      <p className="text-[11px] font-sans text-muted-foreground">{t("balance")}</p>
                      <p>{t("hours", { count: lb.balance })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-sans text-muted-foreground">{t("used")}</p>
                      <p>{t("hours", { count: lb.usedHours })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Compensation Band */}
        {emp.compensationBandId && compensationBand && (
          <>
            <div className="h-px bg-border" />

            <Section title={t("compensationBand")} description={t("compensationBandDescription")}>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("band")}</p>
                    <p className="text-sm font-medium">{compensationBand.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("minSalary")}</p>
                    <p className="text-sm font-mono tabular-nums">{formatMoney(compensationBand.minSalary, currency, locale)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("midSalary")}</p>
                    <p className="text-sm font-mono tabular-nums">{formatMoney(compensationBand.midSalary, currency, locale)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("maxSalary")}</p>
                    <p className="text-sm font-mono tabular-nums">{formatMoney(compensationBand.maxSalary, currency, locale)}</p>
                  </div>
                </div>
                {compensationBand.maxSalary > compensationBand.minSalary && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{t("rangePenetration")}</span>
                      <span className="font-mono tabular-nums">
                        {Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round(
                              ((salaryInCents - compensationBand.minSalary) /
                                (compensationBand.maxSalary - compensationBand.minSalary)) *
                                100
                            )
                          )
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              Math.round(
                                ((salaryInCents - compensationBand.minSalary) /
                                  (compensationBand.maxSalary - compensationBand.minSalary)) *
                                  100
                              )
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </>
        )}

        <div className="h-px bg-border" />

        {/* Save */}
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="mr-1.5 size-3.5" />
            {saving ? t("saving") : t("saveChanges")}
          </Button>
        </div>

        <div className="h-px bg-border" />

        {/* Danger zone */}
        <Section title={t("dangerZone")} description={t("dangerZoneDescription")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{t("deleteEmployee")}</p>
              <p className="text-[12px] text-muted-foreground">
                {t("deleteEmployeeDescription")}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              {t("delete")}
            </Button>
          </div>
        </Section>
      </div>

      {confirmDialog}
    </ContentReveal>
  );
}

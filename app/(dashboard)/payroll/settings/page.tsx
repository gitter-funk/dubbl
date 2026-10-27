"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { toast } from "sonner";
import Link from "next/link";
import { Save, Plus, Trash2, Shield, Clock, CalendarDays, DollarSign, Layers, ExternalLink } from "lucide-react";
import { Section } from "@/components/dashboard/section";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ContentReveal } from "@/components/ui/content-reveal";
import { BrandLoader } from "@/components/dashboard/brand-loader";
import { Switch } from "@/components/ui/switch";
import { CurrencySelect } from "@/components/ui/currency-select";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/lib/hooks/use-confirm";

interface PayrollSettingsData {
  defaultTaxRate: number;
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
  defaultCurrency: string;
  salaryExpenseAccountCode: string;
  taxPayableAccountCode: string;
  bankAccountCode: string;
  autoApprovalEnabled: boolean;
}

interface DeductionType {
  id: string;
  name: string;
  description: string | null;
  category: string;
  defaultAmount: number | null;
  defaultPercent: number | null;
  isActive: boolean;
}

interface TaxBracket {
  id: string;
  name: string;
  jurisdictionLevel: string;
  jurisdiction: string | null;
  minIncome: number;
  maxIncome: number | null;
  rate: number;
}

interface ShiftDef {
  id: string;
  name: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  premiumPercent: number | null;
  isActive: boolean;
}

interface LeavePolicy {
  id: string;
  name: string;
  leaveType: string;
  accrualMethod: string;
  accrualRate: number;
  maxBalance: number | null;
  isActive: boolean;
}

interface ApprovalChain {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  steps: { id: string; stepOrder: number; approverId: string }[];
}

interface CompensationBand {
  id: string;
  name: string;
  level: string;
  minSalary: number;
  midSalary: number;
  maxSalary: number;
}

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.3, delay } as const,
});

export default function PayrollSettingsPage() {
  const t = useTranslations("Payroll.Settings");
  const locale = useLocale();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings
  const [settings, setSettings] = useState<PayrollSettingsData>({
    defaultTaxRate: 2000,
    overtimeThresholdHours: 40,
    overtimeMultiplier: 1.5,
    defaultCurrency: "USD",
    salaryExpenseAccountCode: "5100",
    taxPayableAccountCode: "2200",
    bankAccountCode: "1100",
    autoApprovalEnabled: false,
  });
  const currencyPrefix = new Intl.NumberFormat(locale, { style: "currency", currency: settings.defaultCurrency }).formatToParts(0).find((part) => part.type === "currency")?.value ?? settings.defaultCurrency;

  // Deduction types
  const [deductionTypes, setDeductionTypes] = useState<DeductionType[]>([]);
  const [deductionDrawer, setDeductionDrawer] = useState(false);
  const [newDeduction, setNewDeduction] = useState({ name: "", category: "post_tax", defaultAmount: "", defaultPercent: "" });

  // Tax brackets
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [bracketDrawer, setBracketDrawer] = useState(false);
  const [newBracket, setNewBracket] = useState({ name: "", jurisdictionLevel: "federal", minIncome: "", maxIncome: "", rate: "" });

  // Shifts
  const [shifts, setShifts] = useState<ShiftDef[]>([]);
  const [shiftDrawer, setShiftDrawer] = useState(false);
  const [newShift, setNewShift] = useState({ name: "", shiftType: "regular", startTime: "09:00", endTime: "17:00", premiumPercent: "0" });

  // Leave policies
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
  const [leaveDrawer, setLeaveDrawer] = useState(false);
  const [newLeave, setNewLeave] = useState({ name: "", leaveType: "vacation", accrualMethod: "per_pay_period", accrualRate: "0", maxBalance: "" });

  // Approval chains
  const [approvalChains, setApprovalChains] = useState<ApprovalChain[]>([]);

  // Compensation bands
  const [compensationBands, setCompensationBands] = useState<CompensationBand[]>([]);
  const [bandDrawer, setBandDrawer] = useState(false);
  const [newBand, setNewBand] = useState({ name: "", level: "", minSalary: "", midSalary: "", maxSalary: "" });

  const orgId = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") : null;

  const fetchAll = useCallback(() => {
    if (!orgId) return;
    const headers = { "x-organization-id": orgId };

    Promise.all([
      fetch("/api/v1/payroll/settings", { headers }).then((r) => r.json()),
      fetch("/api/v1/payroll/deductions/types", { headers }).then((r) => r.json()),
      fetch("/api/v1/payroll/tax/brackets", { headers }).then((r) => r.json()),
      fetch("/api/v1/payroll/shifts", { headers }).then((r) => r.json()),
      fetch("/api/v1/payroll/leave/policies", { headers }).then((r) => r.json()),
      fetch("/api/v1/payroll/approval-chains", { headers }).then((r) => r.json()),
      fetch("/api/v1/payroll/compensation/bands", { headers }).then((r) => r.json()),
    ])
      .then(([settingsData, deductionsData, bracketsData, shiftsData, leaveData, chainsData, bandsData]) => {
        if (settingsData.settings) setSettings(settingsData.settings);
        if (deductionsData.data) setDeductionTypes(deductionsData.data);
        if (bracketsData.data) setTaxBrackets(bracketsData.data);
        if (shiftsData.data) setShifts(shiftsData.data);
        if (leaveData.data) setLeavePolicies(leaveData.data);
        if (chainsData.data) setApprovalChains(chainsData.data);
        if (bandsData.data) setCompensationBands(bandsData.data);
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleSaveSettings() {
    if (!orgId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/payroll/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-organization-id": orgId },
        body: JSON.stringify(settings),
      });
      if (res.ok) toast.success(t("settingsSaved"));
      else toast.error(t("settingsSaveFailed"));
    } catch {
      toast.error(t("settingsSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDeduction() {
    if (!orgId || !newDeduction.name) return;
    try {
      const res = await fetch("/api/v1/payroll/deductions/types", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-organization-id": orgId },
        body: JSON.stringify({
          name: newDeduction.name,
          category: newDeduction.category,
          defaultAmount: newDeduction.defaultAmount ? Math.round(parseFloat(newDeduction.defaultAmount) * 100) : undefined,
          defaultPercent: newDeduction.defaultPercent ? parseFloat(newDeduction.defaultPercent) : undefined,
        }),
      });
      if (res.ok) {
        toast.success(t("deductionTypeAdded"));
        setDeductionDrawer(false);
        setNewDeduction({ name: "", category: "post_tax", defaultAmount: "", defaultPercent: "" });
        fetchAll();
      }
    } catch {
      toast.error(t("deductionTypeAddFailed"));
    }
  }

  async function handleDeleteDeduction(id: string) {
    if (!orgId) return;
    const confirmed = await confirm({
      title: t("deleteDeductionTitle"),
      description: t("deleteDeductionDescription"),
      confirmLabel: t("delete"),
      destructive: true,
    });
    if (!confirmed) return;
    await fetch(`/api/v1/payroll/deductions/types/${id}`, {
      method: "DELETE",
      headers: { "x-organization-id": orgId },
    });
    fetchAll();
  }

  async function handleAddBracket() {
    if (!orgId || !newBracket.name) return;
    try {
      const res = await fetch("/api/v1/payroll/tax/brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-organization-id": orgId },
        body: JSON.stringify({
          name: newBracket.name,
          jurisdictionLevel: newBracket.jurisdictionLevel,
          minIncome: Math.round(parseFloat(newBracket.minIncome || "0") * 100),
          maxIncome: newBracket.maxIncome ? Math.round(parseFloat(newBracket.maxIncome) * 100) : null,
          rate: Math.round(parseFloat(newBracket.rate || "0") * 100),
        }),
      });
      if (res.ok) {
        toast.success(t("taxBracketAdded"));
        setBracketDrawer(false);
        setNewBracket({ name: "", jurisdictionLevel: "federal", minIncome: "", maxIncome: "", rate: "" });
        fetchAll();
      }
    } catch {
      toast.error(t("taxBracketAddFailed"));
    }
  }

  async function handleAddShift() {
    if (!orgId || !newShift.name) return;
    try {
      const res = await fetch("/api/v1/payroll/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-organization-id": orgId },
        body: JSON.stringify({
          name: newShift.name,
          shiftType: newShift.shiftType,
          startTime: newShift.startTime,
          endTime: newShift.endTime,
          premiumPercent: parseFloat(newShift.premiumPercent || "0"),
        }),
      });
      if (res.ok) {
        toast.success(t("shiftAdded"));
        setShiftDrawer(false);
        setNewShift({ name: "", shiftType: "regular", startTime: "09:00", endTime: "17:00", premiumPercent: "0" });
        fetchAll();
      }
    } catch {
      toast.error(t("shiftAddFailed"));
    }
  }

  async function handleAddLeavePolicy() {
    if (!orgId || !newLeave.name) return;
    try {
      const res = await fetch("/api/v1/payroll/leave/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-organization-id": orgId },
        body: JSON.stringify({
          name: newLeave.name,
          leaveType: newLeave.leaveType,
          accrualMethod: newLeave.accrualMethod,
          accrualRate: parseFloat(newLeave.accrualRate || "0"),
          maxBalance: newLeave.maxBalance ? parseFloat(newLeave.maxBalance) : null,
        }),
      });
      if (res.ok) {
        toast.success(t("leavePolicyAdded"));
        setLeaveDrawer(false);
        setNewLeave({ name: "", leaveType: "vacation", accrualMethod: "per_pay_period", accrualRate: "0", maxBalance: "" });
        fetchAll();
      }
    } catch {
      toast.error(t("leavePolicyAddFailed"));
    }
  }

  async function handleAddBand() {
    if (!orgId || !newBand.name) return;
    try {
      const res = await fetch("/api/v1/payroll/compensation/bands", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-organization-id": orgId },
        body: JSON.stringify({
          name: newBand.name,
          level: newBand.level,
          minSalary: Math.round(parseFloat(newBand.minSalary || "0") * 100),
          midSalary: Math.round(parseFloat(newBand.midSalary || "0") * 100),
          maxSalary: Math.round(parseFloat(newBand.maxSalary || "0") * 100),
        }),
      });
      if (res.ok) {
        toast.success(t("compensationBandAdded"));
        setBandDrawer(false);
        setNewBand({ name: "", level: "", minSalary: "", midSalary: "", maxSalary: "" });
        fetchAll();
      }
    } catch {
      toast.error(t("compensationBandAddFailed"));
    }
  }

  async function handleDeleteBand(id: string) {
    if (!orgId) return;
    const confirmed = await confirm({
      title: t("deleteBandTitle"),
      description: t("deleteConfirmDescription"),
      confirmLabel: t("delete"),
      destructive: true,
    });
    if (!confirmed) return;
    await fetch(`/api/v1/payroll/compensation/bands/${id}`, {
      method: "DELETE",
      headers: { "x-organization-id": orgId },
    });
    fetchAll();
  }

  if (loading) return <BrandLoader />;

  return (
    <ContentReveal className="space-y-6">
      <div className="space-y-8">
        {/* General Settings */}
        <motion.div {...anim(0)}>
          <Section title={t("general")} description={t("generalDescription")}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("defaultTaxRate")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(settings.defaultTaxRate / 100).toFixed(2)}
                  onChange={(e) => setSettings({ ...settings, defaultTaxRate: Math.round(parseFloat(e.target.value || "0") * 100) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("overtimeThreshold")}</Label>
                <Input
                  type="number"
                  value={settings.overtimeThresholdHours}
                  onChange={(e) => setSettings({ ...settings, overtimeThresholdHours: parseFloat(e.target.value || "40") })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("overtimeMultiplier")}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.overtimeMultiplier}
                  onChange={(e) => setSettings({ ...settings, overtimeMultiplier: parseFloat(e.target.value || "1.5") })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("defaultCurrency")}</Label>
                <CurrencySelect
                  value={settings.defaultCurrency}
                  onValueChange={(v) => setSettings({ ...settings, defaultCurrency: v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("salaryExpenseAccount")}</Label>
                <Input
                  value={settings.salaryExpenseAccountCode}
                  onChange={(e) => setSettings({ ...settings, salaryExpenseAccountCode: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("taxPayableAccount")}</Label>
                <Input
                  value={settings.taxPayableAccountCode}
                  onChange={(e) => setSettings({ ...settings, taxPayableAccountCode: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("bankAccount")}</Label>
                <Input
                  value={settings.bankAccountCode}
                  onChange={(e) => setSettings({ ...settings, bankAccountCode: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch
                  checked={settings.autoApprovalEnabled}
                  onCheckedChange={(v: boolean) => setSettings({ ...settings, autoApprovalEnabled: v })}
                />
                <Label className="text-xs">{t("autoApproveRuns")}</Label>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="mr-1.5 size-3.5" />
                {saving ? t("saving") : t("saveSettings")}
              </Button>
            </div>
          </Section>
        </motion.div>

        <div className="h-px bg-border" />

        {/* Deduction Types */}
        <motion.div {...anim(0.05)}>
          <Section title={t("deductionTypes")} description={t("deductionTypesDescription")}>
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setDeductionDrawer(true)}>
                  <Plus className="mr-1.5 size-3" />
                  {t("addType")}
                </Button>
              </div>
              {deductionTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("noDeductionTypes")}</p>
              ) : (
                <div className="rounded-lg border divide-y">
                  {deductionTypes.map((dt) => (
                    <div key={dt.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{dt.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{dt.category === "pre_tax" ? t("preTax") : t("postTax")}</Badge>
                          {dt.defaultAmount && <span className="text-xs text-muted-foreground">{new Intl.NumberFormat(locale, { style: "currency", currency: settings.defaultCurrency }).format(dt.defaultAmount / 100)}</span>}
                          {dt.defaultPercent && <span className="text-xs text-muted-foreground">{dt.defaultPercent}%</span>}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => handleDeleteDeduction(dt.id)}>
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </motion.div>

        <div className="h-px bg-border" />

        {/* Tax Brackets */}
        <motion.div {...anim(0.1)}>
          <Section title={t("taxBrackets")} description={t("taxBracketsDescription")}>
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setBracketDrawer(true)}>
                  <Plus className="mr-1.5 size-3" />
                  {t("addBracket")}
                </Button>
              </div>
              {taxBrackets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("noTaxBrackets")}</p>
              ) : (
                <div className="rounded-lg border divide-y">
                  {taxBrackets.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(`jurisdictions.${b.jurisdictionLevel}` as "jurisdictions.federal" | "jurisdictions.state" | "jurisdictions.local")}{b.jurisdiction ? ` · ${b.jurisdiction}` : ""} · {new Intl.NumberFormat(locale, { style: "currency", currency: settings.defaultCurrency, maximumFractionDigits: 0 }).format(b.minIncome / 100)} {t("to")} {b.maxIncome ? new Intl.NumberFormat(locale, { style: "currency", currency: settings.defaultCurrency, maximumFractionDigits: 0 }).format(b.maxIncome / 100) : t("unlimited")} · {(b.rate / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </motion.div>

        <div className="h-px bg-border" />

        {/* Shift Definitions */}
        <motion.div {...anim(0.15)}>
          <Section title={t("shifts")} description={t("shiftsDescription")}>
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setShiftDrawer(true)}>
                  <Plus className="mr-1.5 size-3" />
                  {t("addShift")}
                </Button>
              </div>
              {shifts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("noShifts")}</p>
              ) : (
                <div className="rounded-lg border divide-y">
                  {shifts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.startTime} - {s.endTime} · {t(`shiftTypes.${s.shiftType}` as "shiftTypes.regular" | "shiftTypes.overtime" | "shiftTypes.night" | "shiftTypes.weekend" | "shiftTypes.holiday")}{s.premiumPercent ? ` · +${s.premiumPercent}%` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", s.isActive ? "text-emerald-600" : "text-muted-foreground")}>
                        {s.isActive ? t("active") : t("inactive")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </motion.div>

        <div className="h-px bg-border" />

        {/* Leave Policies */}
        <motion.div {...anim(0.2)}>
          <Section title={t("leavePolicies")} description={t("leavePoliciesDescription")}>
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setLeaveDrawer(true)}>
                  <Plus className="mr-1.5 size-3" />
                  {t("addPolicy")}
                </Button>
              </div>
              {leavePolicies.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("noLeavePolicies")}</p>
              ) : (
                <div className="rounded-lg border divide-y">
                  {leavePolicies.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(`leaveTypes.${p.leaveType}` as "leaveTypes.vacation" | "leaveTypes.sick" | "leaveTypes.personal" | "leaveTypes.parental" | "leaveTypes.bereavement" | "leaveTypes.unpaid" | "leaveTypes.other")} · {t("accrualSummary", { rate: new Intl.NumberFormat(locale).format(p.accrualRate), method: t(`accrualMethods.${p.accrualMethod}` as "accrualMethods.perPayPeriod" | "accrualMethods.monthly" | "accrualMethods.annually" | "accrualMethods.frontLoaded") })}{p.maxBalance ? ` · ${t("maxBalance", { count: p.maxBalance })}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </motion.div>

        <div className="h-px bg-border" />

        {/* Approval Chains */}
        <motion.div {...anim(0.25)}>
          <Section title={t("approvalChains")} description={t("approvalChainsDescription")}>
            {approvalChains.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t("noApprovalChains")}</p>
            ) : (
              <div className="rounded-lg border divide-y">
                {approvalChains.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{t("stepsCount", { count: c.steps.length })}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", c.isActive ? "text-emerald-600" : "text-muted-foreground")}>
                      {c.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </motion.div>

        <div className="h-px bg-border" />

        {/* Compensation Bands */}
        <motion.div {...anim(0.3)}>
          <Section title={t("compensationBands")} description={t("compensationBandsDescription")}>
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setBandDrawer(true)}>
                  <Plus className="mr-1.5 size-3" />
                  {t("addBand")}
                </Button>
              </div>
              {compensationBands.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("noCompensationBands")}</p>
              ) : (
                <div className="rounded-lg border divide-y">
                  {compensationBands.map((band) => (
                    <div key={band.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{band.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("level", { level: band.level })} · {new Intl.NumberFormat(locale, { style: "currency", currency: settings.defaultCurrency, maximumFractionDigits: 0 }).format(band.minSalary / 100)} - {new Intl.NumberFormat(locale, { style: "currency", currency: settings.defaultCurrency, maximumFractionDigits: 0 }).format(band.midSalary / 100)} - {new Intl.NumberFormat(locale, { style: "currency", currency: settings.defaultCurrency, maximumFractionDigits: 0 }).format(band.maxSalary / 100)}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => handleDeleteBand(band.id)}>
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </motion.div>

        <div className="h-px bg-border" />

        {/* Self-Service Link */}
        <motion.div {...anim(0.35)}>
          <Section title={t("selfServicePortal")} description={t("selfServiceDescription")}>
            <div className="flex items-center gap-3">
              <Button asChild size="sm" variant="outline">
                <Link href="/payroll/self-service">
                  <ExternalLink className="mr-1.5 size-3" />
                  {t("openSelfService")}
                </Link>
              </Button>
            </div>
          </Section>
        </motion.div>
      </div>

      {/* Deduction Drawer */}
      <Sheet open={deductionDrawer} onOpenChange={setDeductionDrawer}>
        <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <DollarSign className="size-5" />
              </div>
              <div>
                <SheetTitle>{t("addDeductionType")}</SheetTitle>
                <SheetDescription>{t("addDeductionTypeDescription")}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddDeduction(); }}>
            <div className="flex-1 overflow-y-auto space-y-6 px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-2">
                <Label>{t("name")}</Label>
                <Input value={newDeduction.name} onChange={(e) => setNewDeduction({ ...newDeduction, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("category")}</Label>
                <Select value={newDeduction.category} onValueChange={(v) => setNewDeduction({ ...newDeduction, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_tax">{t("preTax")}</SelectItem>
                    <SelectItem value="post_tax">{t("postTax")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("defaultAmount", { currency: currencyPrefix })}</Label>
                  <CurrencyInput prefix={currencyPrefix} value={newDeduction.defaultAmount} onChange={(v) => setNewDeduction({ ...newDeduction, defaultAmount: v })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("defaultPercent")}</Label>
                  <Input type="number" step="0.01" value={newDeduction.defaultPercent} onChange={(e) => setNewDeduction({ ...newDeduction, defaultPercent: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="border-t px-4 py-3 sm:px-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeductionDrawer(false)}>{t("cancel")}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{t("create")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Tax Bracket Drawer */}
      <Sheet open={bracketDrawer} onOpenChange={setBracketDrawer}>
        <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Shield className="size-5" />
              </div>
              <div>
                <SheetTitle>{t("addTaxBracket")}</SheetTitle>
                <SheetDescription>{t("addTaxBracketDescription")}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddBracket(); }}>
            <div className="flex-1 overflow-y-auto space-y-6 px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-2">
                <Label>{t("name")}</Label>
                <Input value={newBracket.name} onChange={(e) => setNewBracket({ ...newBracket, name: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("jurisdictionLevel")}</Label>
                  <Select value={newBracket.jurisdictionLevel} onValueChange={(v) => setNewBracket({ ...newBracket, jurisdictionLevel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="federal">{t("jurisdictions.federal")}</SelectItem>
                      <SelectItem value="state">{t("jurisdictions.state")}</SelectItem>
                      <SelectItem value="local">{t("jurisdictions.local")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("rate")}</Label>
                  <Input type="number" step="0.01" value={newBracket.rate} onChange={(e) => setNewBracket({ ...newBracket, rate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("minIncome")}</Label>
                  <CurrencyInput prefix={currencyPrefix} value={newBracket.minIncome} onChange={(v) => setNewBracket({ ...newBracket, minIncome: v })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("maxIncome")}</Label>
                  <CurrencyInput prefix={currencyPrefix} value={newBracket.maxIncome} onChange={(v) => setNewBracket({ ...newBracket, maxIncome: v })} placeholder={t("unlimited")} />
                </div>
              </div>
            </div>
            <div className="border-t px-4 py-3 sm:px-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBracketDrawer(false)}>{t("cancel")}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{t("create")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Shift Drawer */}
      <Sheet open={shiftDrawer} onOpenChange={setShiftDrawer}>
        <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Clock className="size-5" />
              </div>
              <div>
                <SheetTitle>{t("addShiftTitle")}</SheetTitle>
                <SheetDescription>{t("addShiftDescription")}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddShift(); }}>
            <div className="flex-1 overflow-y-auto space-y-6 px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-2">
                <Label>{t("name")}</Label>
                <Input value={newShift.name} onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("type")}</Label>
                  <Select value={newShift.shiftType} onValueChange={(v) => setNewShift({ ...newShift, shiftType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">{t("shiftTypes.regular")}</SelectItem>
                      <SelectItem value="overtime">{t("shiftTypes.overtime")}</SelectItem>
                      <SelectItem value="night">{t("shiftTypes.night")}</SelectItem>
                      <SelectItem value="weekend">{t("shiftTypes.weekend")}</SelectItem>
                      <SelectItem value="holiday">{t("shiftTypes.holiday")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("premium")}</Label>
                  <Input type="number" step="0.1" value={newShift.premiumPercent} onChange={(e) => setNewShift({ ...newShift, premiumPercent: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("startTime")}</Label>
                  <Input type="time" value={newShift.startTime} onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("endTime")}</Label>
                  <Input type="time" value={newShift.endTime} onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="border-t px-4 py-3 sm:px-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShiftDrawer(false)}>{t("cancel")}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{t("create")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Leave Policy Drawer */}
      <Sheet open={leaveDrawer} onOpenChange={setLeaveDrawer}>
        <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <SheetTitle>{t("addLeavePolicy")}</SheetTitle>
                <SheetDescription>{t("addLeavePolicyDescription")}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddLeavePolicy(); }}>
            <div className="flex-1 overflow-y-auto space-y-6 px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-2">
                <Label>{t("name")}</Label>
                <Input value={newLeave.name} onChange={(e) => setNewLeave({ ...newLeave, name: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("leaveType")}</Label>
                  <Select value={newLeave.leaveType} onValueChange={(v) => setNewLeave({ ...newLeave, leaveType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">{t("leaveTypes.vacation")}</SelectItem>
                      <SelectItem value="sick">{t("leaveTypes.sick")}</SelectItem>
                      <SelectItem value="personal">{t("leaveTypes.personal")}</SelectItem>
                      <SelectItem value="parental">{t("leaveTypes.parental")}</SelectItem>
                      <SelectItem value="bereavement">{t("leaveTypes.bereavement")}</SelectItem>
                      <SelectItem value="unpaid">{t("leaveTypes.unpaid")}</SelectItem>
                      <SelectItem value="other">{t("leaveTypes.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("accrualMethod")}</Label>
                  <Select value={newLeave.accrualMethod} onValueChange={(v) => setNewLeave({ ...newLeave, accrualMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_pay_period">{t("accrualMethods.perPayPeriod")}</SelectItem>
                      <SelectItem value="monthly">{t("accrualMethods.monthly")}</SelectItem>
                      <SelectItem value="annually">{t("accrualMethods.annually")}</SelectItem>
                      <SelectItem value="front_loaded">{t("accrualMethods.frontLoaded")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("hoursEarned")}</Label>
                  <Input type="number" step="0.5" value={newLeave.accrualRate} onChange={(e) => setNewLeave({ ...newLeave, accrualRate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("maxBalanceLabel")}</Label>
                  <Input type="number" value={newLeave.maxBalance} onChange={(e) => setNewLeave({ ...newLeave, maxBalance: e.target.value })} placeholder={t("unlimited")} />
                </div>
              </div>
            </div>
            <div className="border-t px-4 py-3 sm:px-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLeaveDrawer(false)}>{t("cancel")}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{t("create")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Compensation Band Drawer */}
      <Sheet open={bandDrawer} onOpenChange={setBandDrawer}>
        <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Layers className="size-5" />
              </div>
              <div>
                <SheetTitle>{t("addCompensationBand")}</SheetTitle>
                <SheetDescription>{t("addCompensationBandDescription")}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddBand(); }}>
            <div className="flex-1 overflow-y-auto space-y-6 px-4 py-4 sm:px-6 sm:py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("name")}</Label>
                  <Input value={newBand.name} onChange={(e) => setNewBand({ ...newBand, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("levelLabel")}</Label>
                  <Input value={newBand.level} onChange={(e) => setNewBand({ ...newBand, level: e.target.value })} placeholder={t("levelPlaceholder")} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("minSalary")}</Label>
                  <CurrencyInput prefix={currencyPrefix} value={newBand.minSalary} onChange={(v) => setNewBand({ ...newBand, minSalary: v })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("midSalary")}</Label>
                  <CurrencyInput prefix={currencyPrefix} value={newBand.midSalary} onChange={(v) => setNewBand({ ...newBand, midSalary: v })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("maxSalary")}</Label>
                  <CurrencyInput prefix={currencyPrefix} value={newBand.maxSalary} onChange={(v) => setNewBand({ ...newBand, maxSalary: v })} />
                </div>
              </div>
            </div>
            <div className="border-t px-4 py-3 sm:px-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBandDrawer(false)}>{t("cancel")}</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{t("create")}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      {confirmDialog}
    </ContentReveal>
  );
}

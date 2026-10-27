"use client";

import { useState, useEffect, useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/sheet";
import { Plus, Trash2 } from "lucide-react";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { ContactPicker } from "@/components/dashboard/contact-picker";
import { AccountPicker } from "@/components/dashboard/account-picker";

interface RecurringTemplate {
  id: string;
  name: string;
  frequency: string;
  status: string;
  nextRunDate: string | null;
  reference: string | null;
  contact: { name: string } | null;
}

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  accountId: string | null;
}

const statusColors: Record<string, string> = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  paused:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  completed:
    "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300",
};

const emptyLine = (): LineItem => ({
  description: "",
  quantity: "1",
  unitPrice: "",
  accountId: null,
});

export default function RecurringBillsPage() {
  const t = useTranslations("Purchases.RecurringBills");
  const format = useFormatter();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentTitle(t("pageTitle"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [contactId, setContactId] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxOccurrences, setMaxOccurrences] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const orgHeaders = useCallback(
    () => ({
      "x-organization-id": localStorage.getItem("activeOrgId") || "",
    }),
    []
  );

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    fetch("/api/v1/recurring?type=bill", {
      headers: orgHeaders(),
    })
      .then((r) => r.json())
      .then((data) => setTemplates(data.data || []))
      .finally(() => setLoading(false));
  }, [orgHeaders]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const resetForm = () => {
    setName("");
    setContactId("");
    setFrequency("monthly");
    setStartDate("");
    setEndDate("");
    setMaxOccurrences("");
    setReference("");
    setLines([emptyLine()]);
  };

  const handleSubmit = async () => {
    if (!name || !contactId || !startDate || lines.length === 0) return;

    const validLines = lines.filter((l) => l.description && l.unitPrice);
    if (validLines.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/recurring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...orgHeaders(),
        },
        body: JSON.stringify({
          name,
          type: "bill",
          contactId,
          frequency,
          startDate,
          endDate: endDate || null,
          maxOccurrences: maxOccurrences ? parseInt(maxOccurrences, 10) : null,
          reference: reference || null,
          lines: validLines.map((l) => ({
            description: l.description,
            quantity: parseFloat(l.quantity) || 1,
            unitPrice: parseFloat(l.unitPrice) || 0,
            accountId: l.accountId || null,
          })),
        }),
      });

      if (res.ok) {
        setDrawerOpen(false);
        resetForm();
        fetchTemplates();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateLine = (
    index: number,
    field: keyof LineItem,
    value: string | null
  ) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button
          onClick={() => setDrawerOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 size-4" />
          {t("newRecurringBill")}
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("supplier")}</TableHead>
              <TableHead>{t("frequency")}</TableHead>
              <TableHead>{t("nextBill")}</TableHead>
              <TableHead>{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-sm text-muted-foreground"
                >
                  {t("loading")}
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-sm text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="text-sm font-medium">
                    {template.name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {template.contact?.name || "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {t(`frequencies.${template.frequency}`)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {template.nextRunDate ? format.dateTime(new Date(`${template.nextRunDate}T12:00:00`), { dateStyle: "medium" }) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[template.status] || ""}
                    >
                      {t(`statuses.${template.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col overflow-y-auto">
          <SheetHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b">
            <SheetTitle>{t("newRecurringBill")}</SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-6 pt-4 sm:px-6 space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("name")}</label>
              <Input
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("supplier")}</label>
              <ContactPicker
                value={contactId}
                onChange={setContactId}
                type="supplier"
                placeholder={t("selectSupplier")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("reference")}</label>
              <Input
                placeholder={t("billReference")}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("frequency")}</label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t("frequencies.weekly")}</SelectItem>
                  <SelectItem value="fortnightly">{t("frequencies.fortnightly")}</SelectItem>
                  <SelectItem value="monthly">{t("frequencies.monthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("frequencies.quarterly")}</SelectItem>
                  <SelectItem value="semi_annual">{t("frequencies.semiAnnual")}</SelectItem>
                  <SelectItem value="annual">{t("frequencies.annual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("startDate")}</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("endDate")}</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("maxOccurrences")}</label>
              <Input
                type="number"
                min="1"
                placeholder={t("unlimited")}
                value={maxOccurrences}
                onChange={(e) => setMaxOccurrences(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t("lineItems")}</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLines((prev) => [...prev, emptyLine()])}
                >
                  <Plus className="mr-1 size-3" />
                  {t("addLine")}
                </Button>
              </div>

              {lines.map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder={t("descriptionField")}
                      value={line.description}
                      onChange={(e) =>
                        updateLine(i, "description", e.target.value)
                      }
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={t("quantity")}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(i, "quantity", e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={t("unitPrice")}
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(i, "unitPrice", e.target.value)
                        }
                      />
                      <AccountPicker
                        value={line.accountId || ""}
                        onChange={(v) => updateLine(i, "accountId", v)}
                        typeFilter={["expense"]}
                        placeholder={t("account")}
                      />
                    </div>
                  </div>
                  {lines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-1 shrink-0"
                      onClick={() => removeLine(i)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSubmit}
              disabled={submitting || !name || !contactId || !startDate}
            >
              {submitting ? t("creating") : t("createRecurringBill")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

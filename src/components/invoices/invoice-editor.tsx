"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  addLineItem,
  deleteLineItem,
  reorderLineItems,
  bulkAddFromSuggestions,
  fetchSuggestions,
} from "@/app/[locale]/app/invoices/[id]/line-item-actions";
import {
  issueInvoice,
  markPaid,
  voidInvoice,
} from "@/app/[locale]/app/invoices/[id]/actions";
import type { SuggestedLineItem } from "@/lib/invoices/suggest-line-items";

// ─── Types ───────────────────────────────────────────────────────────────────

type InvoiceRow = {
  id: string;
  project_id: string;
  workspace_id: string;
  status: string;
  invoice_number: string | null;
  supply_date: string;
  due_date: string | null;
  issue_date: string | null;
  paid_at: string | null;
  void_at: string | null;
  void_reason: string | null;
  subtotal_krw: number;
  vat_krw: number;
  total_krw: number;
  is_mock: boolean;
  filed_at: string | null;
  nts_approval_number: string | null;
  memo: string | null;
};

type LineItemRow = {
  id: string;
  item_name: string;
  specification: string | null;
  quantity: number;
  unit_price_krw: number;
  supply_krw: number;
  vat_krw: number;
  display_order: number;
  source_type: string | null;
  source_id: string | null;
};

export type BuyerInfo = {
  id: string;
  name: string;
  business_registration_number: string | null;
  representative_name: string | null;
  business_address: string | null;
  tax_invoice_email: string | null;
};

export type SupplierInfo = {
  corporate_name: string;
  business_registration_number: string;
  representative_name: string;
  address: string;
  contact_email: string;
  business_type: string | null;
  business_item: string | null;
};

type PopbillMode = "mock" | "test" | "production";

interface InvoiceEditorProps {
  invoice: InvoiceRow;
  lineItems: LineItemRow[];
  supplier: SupplierInfo | null;
  buyer: BuyerInfo;
  projectTitle: string;
  isYagiAdmin: boolean;
  locale: string;
  popbillMode: PopbillMode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const krwFmt = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
});

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function todayInSeoul(): string {
  return dateFmt.format(new Date());
}

function monthAgoInSeoul(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 1);
  return dateFmt.format(d);
}

// ─── Line item add form ──────────────────────────────────────────────────────

const lineItemSchema = z.object({
  item_name: z.string().min(1, "required").max(300),
  specification: z.string().max(300).optional().or(z.literal("")),
  quantity: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
      message: "invalid_number",
    }),
  unit_price_krw: z
    .string()
    .min(1)
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number.isInteger(Number(v)),
      { message: "invalid_number" }
    ),
});

type LineItemFormData = z.infer<typeof lineItemSchema>;

interface AddLineItemPopoverProps {
  invoiceId: string;
  onAdded: () => void;
}

function AddLineItemPopover({ invoiceId, onAdded }: AddLineItemPopoverProps) {
  const t = useTranslations("invoices");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      item_name: "",
      specification: "",
      quantity: "1",
      unit_price_krw: "0",
    },
  });

  function onSubmit(data: LineItemFormData) {
    startTransition(async () => {
      const result = await addLineItem(invoiceId, {
        item_name: data.item_name,
        specification:
          data.specification && data.specification.length > 0
            ? data.specification
            : null,
        quantity: Number(data.quantity),
        unit_price_krw: Number(data.unit_price_krw),
      });
      if (!result.ok) {
        toast.error(t("line_item_failed"), { description: result.error });
        return;
      }
      toast.success(t("line_item_saved"));
      reset();
      setOpen(false);
      onAdded();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          {t("add_line_item")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="item_name" className="text-xs keep-all">
              {t("item_name_label")}
            </Label>
            <Input
              id="item_name"
              placeholder={t("item_name_ph")}
              {...register("item_name")}
            />
            {errors.item_name && (
              <p className="text-[11px] text-destructive">
                {errors.item_name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="specification" className="text-xs keep-all">
              {t("specification_label")}
            </Label>
            <Input
              id="specification"
              placeholder={t("specification_ph")}
              {...register("specification")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-xs keep-all">
                {t("quantity_label")}
              </Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                placeholder={t("quantity_ph")}
                {...register("quantity")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit_price_krw" className="text-xs keep-all">
                {t("unit_price_label")}
              </Label>
              <Input
                id="unit_price_krw"
                type="number"
                step="1"
                min="0"
                placeholder={t("unit_price_ph")}
                {...register("unit_price_krw")}
              />
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="w-full rounded-full text-xs"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {t("add_line_item")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// ─── Suggest dialog ──────────────────────────────────────────────────────────

interface SuggestDialogProps {
  invoiceId: string;
  projectId: string;
  onApplied: () => void;
}

function SuggestDialog({ invoiceId, projectId, onApplied }: SuggestDialogProps) {
  const t = useTranslations("invoices");
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(monthAgoInSeoul());
  const [to, setTo] = useState(todayInSeoul());
  const [suggestions, setSuggestions] = useState<SuggestedLineItem[] | null>(
    null
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, startApply] = useTransition();

  async function loadSuggestions() {
    setIsLoading(true);
    setSuggestions(null);
    setSelected(new Set());
    try {
      const result = await fetchSuggestions({ projectId, from, to });
      if (!result.ok) {
        toast.error(t("line_item_failed"), { description: result.error });
        return;
      }
      setSuggestions(result.items);
    } catch (err) {
      console.error("[invoices] suggest fetch failed", err);
      toast.error(t("line_item_failed"));
    } finally {
      setIsLoading(false);
    }
  }

  function keyFor(s: SuggestedLineItem): string {
    return `${s.source_type}:${s.source_id}`;
  }

  function toggleSelected(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function applySelected() {
    if (!suggestions) return;
    const items = suggestions.filter((s) => selected.has(keyFor(s)));
    if (items.length === 0) return;
    startApply(async () => {
      const result = await bulkAddFromSuggestions(invoiceId, items);
      if (!result.ok) {
        toast.error(t("line_item_failed"), { description: result.error });
        return;
      }
      toast.success(t("line_item_saved"));
      setOpen(false);
      setSuggestions(null);
      setSelected(new Set());
      onApplied();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          {t("suggestions_title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {t("suggestions_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="suggest-from" className="text-xs">
              {t("suggest_range_from")}
            </Label>
            <Input
              id="suggest-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="suggest-to" className="text-xs">
              {t("suggest_range_to")}
            </Label>
            <Input
              id="suggest-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full text-xs"
            disabled={isLoading}
            onClick={loadSuggestions}
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {t("suggest_load_button")}
          </Button>
        </div>

        <div className="max-h-[300px] overflow-y-auto border border-border rounded-md">
          {suggestions === null ? (
            <p className="text-xs text-muted-foreground p-4 keep-all">
              {t("reorder_hint")}
            </p>
          ) : suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 keep-all">
              {t("no_suggestions")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {suggestions.map((s) => {
                const k = keyFor(s);
                const isSelected = selected.has(k);
                return (
                  <li
                    key={k}
                    className={cn(
                      "flex items-start gap-2 px-3 py-2 text-xs",
                      s.already_billed && "opacity-70"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(k)}
                      className="mt-0.5"
                      aria-label={s.item_name}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate keep-all">
                        {s.item_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {s.quantity} × {krwFmt.format(s.unit_price_krw)}
                      </p>
                    </div>
                    {s.already_billed && (
                      <Badge
                        variant="outline"
                        className="rounded-full text-[10px] px-2 border-amber-300 text-amber-700 bg-amber-50"
                      >
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        {t("already_billed_warning")}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            size="sm"
            className="rounded-full text-xs"
            disabled={isApplying || selected.size === 0}
            onClick={applySelected}
          >
            {isApplying && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {t("suggest_apply_button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Line item row (read-only + editable variants) ──────────────────────────

interface LineItemRowViewProps {
  item: LineItemRow;
  index: number;
  total: number;
  editable: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDeleted: () => void;
}

function LineItemRowView({
  item,
  index,
  total,
  editable,
  onMoveUp,
  onMoveDown,
  onDeleted,
}: LineItemRowViewProps) {
  const t = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLineItem(item.id);
      if (!result.ok) {
        toast.error(t("line_item_failed"), { description: result.error });
        return;
      }
      toast.success(t("line_item_deleted"));
      onDeleted();
    });
  }

  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="font-medium keep-all">{item.item_name}</div>
        {item.specification && (
          <div className="text-[11px] text-muted-foreground keep-all">
            {item.specification}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums align-top">
        {item.quantity}
      </TableCell>
      <TableCell className="text-right tabular-nums align-top">
        {krwFmt.format(item.unit_price_krw)}
      </TableCell>
      <TableCell className="text-right tabular-nums align-top">
        {krwFmt.format(item.supply_krw)}
      </TableCell>
      <TableCell className="text-right tabular-nums align-top">
        {krwFmt.format(item.vat_krw)}
      </TableCell>
      {editable && (
        <TableCell className="w-[120px] align-top">
          <div className="flex items-center gap-0.5 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={index === 0}
              onClick={onMoveUp}
              aria-label="move up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={index === total - 1}
              onClick={onMoveDown}
              aria-label="move down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  aria-label={t("delete_line_item")}
                  disabled={isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("delete_confirm_title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="keep-all">
                    {item.item_name}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">
                    {tCommon("cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-full bg-destructive hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    {t("delete_line_item")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

// ─── Action footer (issue / markPaid / void) ─────────────────────────────────

interface ActionFooterProps {
  invoice: InvoiceRow;
  buyerRegistrationMissing: boolean;
}

function ActionFooter({ invoice, buyerRegistrationMissing }: ActionFooterProps) {
  const t = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [voidReason, setVoidReason] = useState("");

  function handleIssue() {
    startTransition(async () => {
      const result = await issueInvoice(invoice.id);
      if (!result.ok) {
        const missing =
          "missing_fields" in result && result.missing_fields
            ? result.missing_fields.join(", ")
            : undefined;
        // Phase 2.1 G4 — i18n-render known error codes; fall back to
        // the raw code string for unknown ones so ops can still diagnose.
        let description: string;
        if (missing) {
          description = `${t("missing_fields_title")}: ${missing}`;
        } else if (result.error === "popbill_not_implemented") {
          description = t("error_popbill_not_implemented");
        } else {
          description = result.error;
        }
        toast.error(t("issue_failed"), { description });
        return;
      }
      toast.success(t("issue_success"));
      router.refresh();
    });
  }

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markPaid(invoice.id);
      if (!result.ok) {
        toast.error(t("mark_paid_failed"), { description: result.error });
        return;
      }
      toast.success(t("mark_paid_success"));
      router.refresh();
    });
  }

  function handleVoid() {
    startTransition(async () => {
      const result = await voidInvoice(
        invoice.id,
        voidReason.length > 0 ? voidReason : undefined
      );
      if (!result.ok) {
        toast.error(t("void_failed"), { description: result.error });
        return;
      }
      toast.success(t("void_success"));
      setVoidReason("");
      router.refresh();
    });
  }

  if (invoice.status === "void") return null;

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur px-6 py-4 flex items-center justify-between gap-3 z-10">
      <div className="text-xs text-muted-foreground keep-all">
        {t("action_footer_title")}
      </div>
      <div className="flex items-center gap-2">
        {/* Draft → Issue */}
        {invoice.status === "draft" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                disabled={isPending || buyerRegistrationMissing}
                className="rounded-full uppercase tracking-[0.12em] px-6 py-2.5 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {t("issue_button")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("issue_confirm_title")}</AlertDialogTitle>
                <AlertDialogDescription className="keep-all">
                  {t("issue_confirm_body")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">
                  {tCommon("cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-full"
                  onClick={handleIssue}
                >
                  {t("issue_button")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Issued → Mark paid */}
        {invoice.status === "issued" && (
          <Button
            type="button"
            disabled={isPending}
            onClick={handleMarkPaid}
            className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {t("mark_paid")}
          </Button>
        )}

        {/* Issued | Paid → Void */}
        {(invoice.status === "issued" || invoice.status === "paid") && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                className="rounded-full text-sm border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                {t("void_button")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("void_confirm_title")}</AlertDialogTitle>
                <AlertDialogDescription className="keep-all">
                  {t("void_reason_label")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder={t("void_reason_ph")}
                rows={3}
                className="text-sm"
              />
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">
                  {tCommon("cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-full bg-destructive hover:bg-destructive/90"
                  onClick={handleVoid}
                >
                  {t("void_button")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// ─── Main editor ─────────────────────────────────────────────────────────────

export function InvoiceEditor({
  invoice,
  lineItems: initialLineItems,
  supplier,
  buyer,
  isYagiAdmin,
  popbillMode,
}: InvoiceEditorProps) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const [lineItems, setLineItems] = useState<LineItemRow[]>(initialLineItems);
  const [isReordering, startReorder] = useTransition();

  const isDraft = invoice.status === "draft";
  const editable = isDraft && isYagiAdmin;

  const buyerRegistrationMissing = useMemo(
    () => !buyer.business_registration_number,
    [buyer]
  );

  function refreshFromServer() {
    router.refresh();
  }

  function moveItem(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= lineItems.length) return;
    const next = [...lineItems];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setLineItems(next);
    startReorder(async () => {
      const result = await reorderLineItems(
        invoice.id,
        next.map((it) => it.id)
      );
      if (!result.ok) {
        toast.error(t("line_item_failed"), { description: result.error });
        // revert
        setLineItems(initialLineItems);
        return;
      }
      refreshFromServer();
    });
  }

  const subtotal = lineItems.reduce((acc, it) => acc + it.supply_krw, 0);
  const vatSum = lineItems.reduce((acc, it) => acc + it.vat_krw, 0);
  const total = subtotal + vatSum;

  return (
    <div className="flex flex-col gap-8">
      {/* Mock banner — already-issued mock invoice */}
      {invoice.is_mock && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 px-4 py-3">
          <p className="font-semibold text-sm keep-all">
            {t("mock_banner_title")}
          </p>
          <p className="text-xs mt-1 keep-all">{t("mock_banner_body")}</p>
          {popbillMode !== "mock" && (
            <p className="text-[11px] mt-1 opacity-70">
              (current mode: {popbillMode})
            </p>
          )}
        </div>
      )}

      {/* Pre-issue mock warning — visible while editing a DRAFT under POPBILL_MODE=mock */}
      {isDraft && popbillMode === "mock" && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 px-4 py-3">
          <p className="font-semibold text-sm keep-all">
            {t("mock_pre_issue_warning_title")}
          </p>
          <p className="text-xs mt-1 keep-all">
            {t("mock_pre_issue_warning_body")}
          </p>
        </div>
      )}

      {/* Buyer registration warning */}
      {isDraft && buyerRegistrationMissing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm keep-all flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {t("buyer_registration_missing")}{" "}
            <Link
              href="/app/settings/workspace"
              className="underline font-medium"
            >
              /app/settings/workspace
            </Link>
          </span>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — line items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold tracking-display-ko text-lg tracking-tight">
              {t("line_items_title")}
            </h2>
            {editable && (
              <div className="flex items-center gap-2">
                <AddLineItemPopover
                  invoiceId={invoice.id}
                  onAdded={refreshFromServer}
                />
                <SuggestDialog
                  invoiceId={invoice.id}
                  projectId={invoice.project_id}
                  onApplied={refreshFromServer}
                />
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("item_name_label")}</TableHead>
                  <TableHead className="text-right">
                    {t("quantity_label")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("unit_price_label")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("subtotal_label")}
                  </TableHead>
                  <TableHead className="text-right">{t("vat_label")}</TableHead>
                  {editable && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={editable ? 6 : 5}
                      className="text-center text-muted-foreground py-6 keep-all text-xs"
                    >
                      {t("list_empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item, idx) => (
                    <LineItemRowView
                      key={item.id}
                      item={item}
                      index={idx}
                      total={lineItems.length}
                      editable={editable}
                      onMoveUp={() => moveItem(idx, idx - 1)}
                      onMoveDown={() => moveItem(idx, idx + 1)}
                      onDeleted={refreshFromServer}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {editable && isReordering && (
            <p className="text-[11px] text-muted-foreground">{t("reorder_hint")}</p>
          )}

          {/* Issued info */}
          {(invoice.status === "issued" || invoice.status === "paid") && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs space-y-1">
              {invoice.nts_approval_number && (
                <div className="flex items-baseline gap-2">
                  <span className="font-medium keep-all">
                    {t("nts_approval_number_label")}:
                  </span>
                  <span className="tabular-nums">
                    {invoice.nts_approval_number}
                  </span>
                </div>
              )}
              {invoice.filed_at && (
                <div className="flex items-baseline gap-2">
                  <span className="font-medium keep-all">
                    {t("filed_at_label")}:
                  </span>
                  <span className="tabular-nums">
                    {new Date(invoice.filed_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </span>
                </div>
              )}
              {invoice.paid_at && (
                <div className="flex items-baseline gap-2">
                  <span className="font-medium keep-all">
                    {t("paid_at_label")}:
                  </span>
                  <span className="tabular-nums">
                    {new Date(invoice.paid_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Void info */}
          {invoice.status === "void" && (
            <div className="rounded-lg border border-border bg-muted/60 px-4 py-3 text-xs space-y-1 text-muted-foreground">
              <div className="flex items-baseline gap-2">
                <span className="font-medium keep-all">
                  {t("status_void")}:
                </span>
                {invoice.void_at && (
                  <span className="tabular-nums">
                    {new Date(invoice.void_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </span>
                )}
              </div>
              {invoice.void_reason && (
                <p className="keep-all">{invoice.void_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Right column — supplier/buyer + totals */}
        <div className="space-y-4">
          {/* Totals */}
          <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground keep-all">
                {t("subtotal_label")}
              </span>
              <span className="tabular-nums">{krwFmt.format(subtotal)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground keep-all">
                {t("vat_label")}
              </span>
              <span className="tabular-nums">{krwFmt.format(vatSum)}</span>
            </div>
            <div className="border-t border-border pt-2 flex items-baseline justify-between">
              <span className="font-semibold keep-all">{t("total_label")}</span>
              <span className="tabular-nums font-semibold">
                {krwFmt.format(total)}
              </span>
            </div>
          </div>

          {/* Supplier */}
          {supplier && (
            <div className="rounded-lg border border-border p-4 text-xs space-y-1">
              <p className="font-semibold text-sm mb-2 keep-all">
                {t("supplier_block_title")}
              </p>
              <p className="font-medium">{supplier.corporate_name}</p>
              <p className="text-muted-foreground tabular-nums">
                {supplier.business_registration_number}
              </p>
              <p className="text-muted-foreground keep-all">
                {supplier.representative_name}
              </p>
              <p className="text-muted-foreground keep-all">
                {supplier.address}
              </p>
              {(supplier.business_type || supplier.business_item) && (
                <p className="text-muted-foreground keep-all">
                  {supplier.business_type}
                  {supplier.business_type && supplier.business_item ? " · " : ""}
                  {supplier.business_item}
                </p>
              )}
              <p className="text-muted-foreground">{supplier.contact_email}</p>
            </div>
          )}

          {/* Buyer */}
          <div className="rounded-lg border border-border p-4 text-xs space-y-1">
            <p className="font-semibold text-sm mb-2 keep-all">
              {t("buyer_block_title")}
            </p>
            <p className="font-medium keep-all">{buyer.name}</p>
            {buyer.business_registration_number ? (
              <p className="text-muted-foreground tabular-nums">
                {buyer.business_registration_number}
              </p>
            ) : (
              <p className="text-amber-700 keep-all">
                {t("buyer_registration_missing")}
              </p>
            )}
            {buyer.representative_name && (
              <p className="text-muted-foreground keep-all">
                {buyer.representative_name}
              </p>
            )}
            {buyer.business_address && (
              <p className="text-muted-foreground keep-all">
                {buyer.business_address}
              </p>
            )}
            {buyer.tax_invoice_email && (
              <p className="text-muted-foreground">
                {buyer.tax_invoice_email}
              </p>
            )}
          </div>

          {/* Memo */}
          {invoice.memo && (
            <div className="rounded-lg border border-border p-4 text-xs space-y-1">
              <p className="font-semibold text-sm mb-2 keep-all">
                {t("memo_label")}
              </p>
              <p className="text-muted-foreground keep-all whitespace-pre-wrap">
                {invoice.memo}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky action footer (yagi admin only) */}
      {isYagiAdmin && (
        <ActionFooter
          invoice={invoice}
          buyerRegistrationMissing={buyerRegistrationMissing}
        />
      )}
    </div>
  );
}

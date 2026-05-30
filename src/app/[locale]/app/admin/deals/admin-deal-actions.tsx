"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Check, CreditCard, RotateCcw, X } from "lucide-react";
import {
  cancelDealAction,
  offerDealAction,
  recordDealPaymentAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DealRow } from "../../deals/data";

type Props = {
  deal: DealRow;
  compact?: boolean;
};

export function AdminDealActions({ deal, compact = false }: Props) {
  const t = useTranslations("admin_deals.actions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function offer(formData: FormData) {
    setError(null);
    const brandAmount = readNumber(formData, "brandAmount");
    const yagiCommissionAmount = readNumber(formData, "yagiCommissionAmount");
    const artistPayoutAmount = readNumber(formData, "artistPayoutAmount");
    if (brandAmount !== yagiCommissionAmount + artistPayoutAmount) {
      setError(t("error_balance"));
      return;
    }

    startTransition(async () => {
      const result = await offerDealAction({
        dealId: deal.id,
        brandAmount,
        yagiCommissionAmount,
        artistPayoutAmount,
        commissionRate: readOptionalNumber(formData, "commissionRate"),
        currency: String(formData.get("currency") ?? "KRW"),
        comment: String(formData.get("comment") ?? ""),
      });
      handleResult(result, "offer");
    });
  }

  function cancel(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await cancelDealAction({
        dealId: deal.id,
        comment: String(formData.get("comment") ?? ""),
      });
      handleResult(result, "cancel");
    });
  }

  function recordPayment(eventType: "brand_paid" | "paid_out", formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await recordDealPaymentAction({
        dealId: deal.id,
        eventType,
        amount: readOptionalNumber(formData, "amount"),
        invoiceRef: String(formData.get("invoiceRef") ?? ""),
        note: String(formData.get("note") ?? ""),
      });
      handleResult(result, eventType);
    });
  }

  function handleResult(
    result: Awaited<ReturnType<typeof offerDealAction>>,
    key: string,
  ) {
    if (!result.ok) {
      setError(t(`server_error.${result.error}`));
      return;
    }
    toast.success(t(`success.${key}`));
    router.refresh();
  }

  const canOffer = deal.status === "submitted" || deal.status === "negotiating";
  const canCancel = ["submitted", "offered", "negotiating"].includes(deal.status);
  const canBrandPaid = deal.status === "delivered" && deal.payment_status === "pending";
  const canPaidOut =
    deal.status === "delivered" && deal.payment_status === "brand_paid";

  if (!canOffer && !canCancel && !canBrandPaid && !canPaidOut) {
    return null;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive keep-all">
          {error}
        </p>
      )}

      {canOffer && (
        <form
          action={offer}
          className="rounded-lg border border-border/70 bg-surface-card p-4"
        >
          <h3 className="text-sm font-semibold text-foreground keep-all">
            {deal.status === "negotiating" ? t("revise_title") : t("offer_title")}
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MoneyInput
              name="brandAmount"
              label={t("brand_amount")}
              defaultValue={deal.brand_amount}
            />
            <MoneyInput
              name="yagiCommissionAmount"
              label={t("commission")}
              defaultValue={deal.yagi_commission_amount}
            />
            <MoneyInput
              name="artistPayoutAmount"
              label={t("artist_payout")}
              defaultValue={deal.artist_payout_amount}
            />
            <Field label={t("commission_rate")}>
              <Input
                name="commissionRate"
                inputMode="decimal"
                defaultValue={deal.commission_rate ?? ""}
                className="h-10 bg-surface-card"
              />
            </Field>
            <Field label={t("currency")}>
              <Input
                name="currency"
                defaultValue={deal.currency || "KRW"}
                className="h-10 bg-surface-card"
              />
            </Field>
          </div>
          <Textarea
            name="comment"
            placeholder={t("comment_placeholder")}
            maxLength={1000}
            className="mt-3 min-h-20 bg-surface-card"
          />
          <Button
            type="submit"
            disabled={isPending}
            className="mt-4 rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            {deal.status === "negotiating" ? (
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? t("submitting") : t("offer_submit")}
          </Button>
        </form>
      )}

      {canCancel && !compact && (
        <form action={cancel} className="rounded-lg border border-border/70 bg-surface-card p-4">
          <h3 className="text-sm font-semibold text-foreground keep-all">
            {t("cancel_title")}
          </h3>
          <Textarea
            name="comment"
            placeholder={t("cancel_placeholder")}
            maxLength={1000}
            className="mt-3 min-h-20 bg-surface-card"
          />
          <Button
            type="submit"
            disabled={isPending}
            variant="outline"
            className="mt-4 rounded-full border-brand/50 text-brand hover:bg-brand-soft"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t("cancel_submit")}
          </Button>
        </form>
      )}

      {(canBrandPaid || canPaidOut) && (
        <form
          action={(formData) =>
            recordPayment(canBrandPaid ? "brand_paid" : "paid_out", formData)
          }
          className="rounded-lg border border-border/70 bg-surface-card p-4"
        >
          <h3 className="text-sm font-semibold text-foreground keep-all">
            {canBrandPaid ? t("brand_paid_title") : t("paid_out_title")}
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MoneyInput name="amount" label={t("payment_amount")} />
            <Field label={t("invoice_ref")}>
              <Input name="invoiceRef" className="h-10 bg-surface-card" />
            </Field>
          </div>
          <Textarea
            name="note"
            placeholder={t("payment_note")}
            maxLength={1000}
            className="mt-3 min-h-20 bg-surface-card"
          />
          <Button
            type="submit"
            disabled={isPending}
            className="mt-4 rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            {isPending ? t("submitting") : t("payment_submit")}
          </Button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function MoneyInput({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          ₩
        </span>
        <Input
          name={name}
          inputMode="numeric"
          min={0}
          step={10000}
          defaultValue={defaultValue ?? ""}
          className="h-10 bg-surface-card pl-8"
        />
      </div>
    </Field>
  );
}

function readNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function readOptionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { respondToCommissionIntakeAction } from "@/lib/commission/actions";

export function CommissionAdminResponseForm({
  intakeId,
}: {
  intakeId: string;
}) {
  const t = useTranslations("admin_commission");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 20) {
      toast.error(t("response_too_short"));
      return;
    }
    setSubmitting(true);
    const res = await respondToCommissionIntakeAction({
      intake_id: intakeId,
      response_md: body,
    });
    setSubmitting(false);

    if (!res.ok) {
      toast.error(t("response_error"));
      return;
    }
    toast.success(t("response_success"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea
        rows={10}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("response_placeholder")}
        className="font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        {t("response_help")} ({body.trim().length}/20+)
      </p>
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("response_submitting") : t("response_submit")}
        </Button>
      </div>
    </form>
  );
}

"use client";

// Phase 2.8.1 G_B1-H — Workshop 생성 button on the admin commission detail.
// Calls convertCommissionToProject server action and redirects to the
// resulting Brief Board on success. Shown only when state is in
// {submitted, admin_responded} — already-converted intakes show a link to
// the existing project instead.

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { convertCommissionToProject } from "./actions";

interface ConvertButtonProps {
  commissionId: string;
  label: string;
  successText: string;
  errorText: string;
}

export function CommissionConvertButton({
  commissionId,
  label,
  successText,
  errorText,
}: ConvertButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function onClick() {
    if (busy || pending) return;
    setBusy(true);
    startTransition(async () => {
      try {
        const res = await convertCommissionToProject({ commissionId });
        if ("error" in res) {
          toast.error(errorText);
          console.error("[CommissionConvertButton] error", res);
          return;
        }
        toast.success(successText);
        router.push(
          `/app/projects/${res.projectId}?tab=brief` as `/app/projects/${string}`,
        );
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={busy || pending}
      className="rounded-full uppercase tracking-[0.12em]"
    >
      {label}
    </Button>
  );
}

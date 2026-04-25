"use client";

// =============================================================================
// Phase 2.8 G_B-6 — Lock / Unlock button (yagi_admin-only)
// =============================================================================
// SPEC §5.4 — lock action freezes the brief at production handoff,
// rejecting all UPDATE attempts via the validate_project_brief_change
// trigger. Server actions lockBrief / unlockBrief enforce yagi_admin via
// (a) explicit user_roles check at the top of the action and (b) the
// project_briefs_update_yagi RLS policy + trigger column-guard. Defense
// in depth.
//
// UI rendering rule: parent caller decides whether to show the button at
// all by passing isYagiAdmin. Non-admin users never see lock controls.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import {
  lockBrief,
  unlockBrief,
} from "@/app/[locale]/app/projects/[id]/brief/actions";
import { Button } from "@/components/ui/button";

export function LockBriefButton({
  projectId,
  status,
  isYagiAdmin,
}: {
  projectId: string;
  status: "editing" | "locked";
  isYagiAdmin: boolean;
}) {
  const t = useTranslations("brief_board");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  if (!isYagiAdmin) return null;

  const isLocked = status === "locked";

  async function handleClick() {
    setPending(true);
    const r = isLocked
      ? await unlockBrief({ projectId })
      : await lockBrief({ projectId });
    setPending(false);
    if ("ok" in r && r.ok) {
      toast.success(isLocked ? t("unlock_success") : t("lock_success"));
      startTransition(() => router.refresh());
    } else {
      toast.error(t("save_db_error"));
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="rounded-full text-xs uppercase tracking-[0.08em]"
    >
      {isLocked ? (
        <>
          <Unlock className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          {t("unlock_button")}
        </>
      ) : (
        <>
          <Lock className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          {t("lock_button")}
        </>
      )}
    </Button>
  );
}

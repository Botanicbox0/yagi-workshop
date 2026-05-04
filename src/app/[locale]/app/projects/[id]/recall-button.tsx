"use client";

// =============================================================================
// Phase 5 Wave B.5 — RecallButton
//
// Outline button + AlertDialog confirm. On confirm, calls
// recallProjectAction (which delegates to transition_project_status RPC
// with p_to_status='draft'). On success, redirects to the Briefing
// Canvas commit step so the user can edit + resubmit. On error, shows
// a sonner toast with the matching projectDetail.recall.error.* copy.
//
// Conditional render lives in the parent (page.tsx); this component
// assumes the caller has already gated on (status === 'submitted' ||
// status === 'in_review') AND viewer.id === project.created_by.
// =============================================================================

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { recallProjectAction } from "./recall-actions";

export function RecallButton({
  projectId,
}: {
  projectId: string;
  // status + locale props are documented by SPEC for future-proofing
  // (Wave C may key UI variants on them) but are not used by the
  // current minimal-patch render — the action layer + RPC re-validate
  // status, and locale is read from the next-intl context. Keeping
  // them off the prop surface for now avoids dead-code warnings.
}) {
  const t = useTranslations("project_detail.recall");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setOpen(false);
    startTransition(async () => {
      const result = await recallProjectAction({ projectId });
      if (!result.ok) {
        const key =
          result.error === "invalid_transition"
            ? "error.invalid_transition"
            : result.error === "forbidden"
              ? "error.forbidden"
              : "error.unknown";
        toast.error(t(key));
        return;
      }
      // Briefing Canvas commit step (Wave B Step 3). The route uses the
      // existing /projects/new entry; Wave B's wipe-then-INSERT path
      // resumes the recalled draft via session-storage hydration of
      // projectId (sub_5 hotfix).
      router.push(`/app/projects/new?project=${projectId}&step=commit`);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          className="text-sm"
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("cta")
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirm.title")}</AlertDialogTitle>
          <AlertDialogDescription className="keep-all leading-relaxed">
            {t("confirm.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("confirm.cancel")}</AlertDialogCancel>
          {/* Sage accent on the destructive-ish confirm. yagi-design-system
              v1.0: #71D083 is the only accent color. */}
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-[#71D083] text-black hover:bg-[#71D083]/90 focus-visible:ring-[#71D083]/40"
          >
            {t("confirm.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

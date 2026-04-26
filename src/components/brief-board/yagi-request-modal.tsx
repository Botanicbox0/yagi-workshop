"use client";

// =============================================================================
// Phase 2.8 G_B-6 — "YAGI에게 제안 요청" modal
// =============================================================================
// Source: SPEC §2 surface B + §6. This is the empty-state CTA for clients
// who want YAGI to seed the brief direction. Submit fans out a
// `project_brief_yagi_request` notification to every yagi_admin via the
// requestYagiProposal server action. Confirmation toast tells the user to
// expect a 1-2 business day response.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestYagiProposal } from "@/app/[locale]/app/projects/[id]/brief/actions";

export function YagiRequestModal({
  projectId,
  trigger,
}: {
  projectId: string;
  trigger: React.ReactNode;
}) {
  const t = useTranslations("brief_board");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");

  async function handleSubmit() {
    if (!goal.trim()) {
      toast.error(t("yagi_request_goal_required"));
      return;
    }
    setPending(true);
    const r = await requestYagiProposal({
      projectId,
      goal: goal.trim(),
      audience: audience.trim() || undefined,
      budget: budget.trim() || undefined,
      timeline: timeline.trim() || undefined,
    });
    setPending(false);
    if ("ok" in r && r.ok) {
      toast.success(t("yagi_request_sent"));
      setOpen(false);
      setGoal("");
      setAudience("");
      setBudget("");
      setTimeline("");
    } else {
      toast.error(t("save_db_error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("yagi_request_modal_title")}</DialogTitle>
          {/* Phase 2.8.1 G_B1-J (F-PUX-016): the description used the
              post-submit success copy by mistake. Split into a dedicated
              explainer so the user reads "what happens next" BEFORE
              submitting; yagi_request_sent stays reserved for the toast
              after a successful send. */}
          <DialogDescription>{t("yagi_request_explainer")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="yr-goal">
              {t("yagi_request_goal_label")} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="yr-goal"
              required
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="yr-audience">{t("yagi_request_audience_label")}</Label>
            <Input
              id="yr-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              maxLength={500}
            />
          </div>
          <div>
            <Label htmlFor="yr-budget">{t("yagi_request_budget_label")}</Label>
            <Input
              id="yr-budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="yr-timeline">{t("yagi_request_timeline_label")}</Label>
            <Input
              id="yr-timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {t("save_modal_cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !goal.trim()}
          >
            {t("yagi_request_submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

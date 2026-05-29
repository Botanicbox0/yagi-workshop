"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCuratedProject } from "@/app/[locale]/app/projects/_actions/create-curated-project";

type WorkspaceOption = {
  id: string;
  name: string;
};

const ERROR_KEYS = new Set([
  "validation",
  "unauthenticated",
  "forbidden",
  "db",
]);

export function CuratedProjectCreateForm({
  workspaces,
}: {
  workspaces: WorkspaceOption[];
}) {
  const t = useTranslations("admin.projects.curated_new");
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [isPending, startTransition] = useTransition();

  function errorMessage(code: string) {
    const key = ERROR_KEYS.has(code) ? `error_${code}` : "error_db";
    return t(key as Parameters<typeof t>[0]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCuratedProject({
        workspaceId,
        title: title.trim(),
        brief: brief.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(errorMessage(result.error));
        return;
      }
      toast.success(t("success"));
      router.push(`/app/projects/${result.projectId}`);
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6"
    >
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" />
        <h2 className="text-base font-semibold text-foreground">
          {t("form_title")}
        </h2>
      </div>

      <div className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="curated-workspace">{t("workspace_label")}</Label>
          <Select
            value={workspaceId}
            onValueChange={setWorkspaceId}
            disabled={isPending || workspaces.length === 0}
          >
            <SelectTrigger id="curated-workspace">
              <SelectValue placeholder={t("workspace_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="curated-title">{t("title_label")}</Label>
          <Input
            id="curated-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("title_placeholder")}
            maxLength={200}
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="curated-brief">{t("brief_label")}</Label>
          <Textarea
            id="curated-brief"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder={t("brief_placeholder")}
            rows={8}
            maxLength={5000}
            disabled={isPending}
            className="resize-none"
          />
        </div>

        <Button
          type="submit"
          disabled={isPending || !workspaceId}
          className="w-fit gap-2 bg-brand text-brand-on hover:bg-brand/90"
        >
          {isPending ? t("submitting") : t("submit")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}

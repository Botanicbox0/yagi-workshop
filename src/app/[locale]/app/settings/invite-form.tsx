"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteMember } from "./actions";

interface InviteFormProps {
  workspaceId: string;
}

export function InviteForm({ workspaceId }: InviteFormProps) {
  const t = useTranslations("settings");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setPending(true);
    try {
      const res = await inviteMember(formData);
      if ("error" in res) {
        // not_implemented is expected for Phase 1.2
        toast.info(t("team_invite"));
      } else if ("ok" in res) {
        toast.success(t("team_invite"));
        form.reset();
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-6">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      <div className="flex-1 space-y-1">
        <Label htmlFor="invite_email" className="sr-only">
          {t("team_invite")}
        </Label>
        <Input
          id="invite_email"
          name="email"
          type="email"
          placeholder={t("team_invite")}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="invite_role" className="sr-only">
          {t("team_role_admin")} / {t("team_role_member")}
        </Label>
        <select
          id="invite_role"
          name="role"
          defaultValue="workspace_member"
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-auto"
        >
          <option value="workspace_member">{t("team_role_member")}</option>
          <option value="workspace_admin">{t("team_role_admin")}</option>
        </select>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="rounded-full uppercase tracking-[0.12em] text-xs shrink-0"
      >
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("team_invite")}
      </Button>
    </form>
  );
}

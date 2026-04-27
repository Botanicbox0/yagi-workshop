"use client";

import { useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendInvitationsAction } from "@/lib/onboarding/actions";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingInvitePage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const workspaceId = search.get("ws");

  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addEmail() {
    const v = draft.trim();
    if (!v) return;
    if (!emailRe.test(v)) {
      toast.error("invalid_email");
      return;
    }
    if (!emails.includes(v)) setEmails([...emails, v]);
    setDraft("");
  }

  function removeEmail(e: string) {
    setEmails(emails.filter((x) => x !== e));
  }

  async function onSend() {
    if (!workspaceId) {
      toast.error("missing_workspace");
      return;
    }
    setSubmitting(true);
    const res = await sendInvitationsAction({ workspaceId, emails, role: "member" });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.push(`/${locale}/app`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">{t("invite_title")}</h1>
        <p className="text-sm text-muted-foreground keep-all">{t("invite_sub")}</p>
      </div>
      <div className="space-y-3">
        <Label htmlFor="emailInput">{t("invite_email")}</Label>
        <div className="flex gap-2">
          <Input
            id="emailInput"
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEmail();
              }
            }}
            placeholder="name@company.com"
          />
          <Button type="button" size="lg" variant="outline" onClick={addEmail}>
            {t("invite_add")}
          </Button>
        </div>
        {emails.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-2">
            {emails.map((e) => (
              <li
                key={e}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs"
              >
                {e}
                <button
                  type="button"
                  onClick={() => removeEmail(e)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={onSend} disabled={submitting || emails.length === 0}>
          {submitting ? "..." : t("invite_send")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => router.push(`/${locale}/app`)}
        >
          {t("done")}
        </Button>
      </div>
    </div>
  );
}

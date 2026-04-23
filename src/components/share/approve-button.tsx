"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LS_KEY_PREFIX = "yagi-share-";

type StoredIdentity = { email?: string };

function readEmail(token: string): string {
  try {
    const raw = localStorage.getItem(`${LS_KEY_PREFIX}${token}`);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as StoredIdentity;
    return parsed.email ?? "";
  } catch {
    return "";
  }
}

type Props = {
  token: string;
};

export function ApproveButton({ token }: Props) {
  const t = useTranslations("share");
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleApproveClick = () => {
    const stored = readEmail(token);
    setClientEmail(stored);
    setConfirmOpen(true);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_email: clientEmail.trim() }),
      });

      if (!res.ok) {
        const msg =
          res.status === 409 ? "Already approved or not available." : "Something went wrong.";
        toast.error(msg);
        return;
      }

      toast.success(t("approved_thanks"));
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button size="pill" onClick={handleApproveClick}>
        {t("approve_button")}
      </Button>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <form
            onSubmit={handleConfirm}
            className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold">
              {t("approve_confirm_title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("approve_confirm_body")}</p>

            <div className="space-y-1.5">
              <Label htmlFor="approve-client-email">
                {/* reuse comment_email_ph for the email label */}
                {t("comment_email_ph")}
              </Label>
              <Input
                id="approve-client-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="pill" disabled={submitting} className="flex-1">
                {t("approve_button")}
              </Button>
              <Button
                type="button"
                size="pill"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="flex-1"
              >
                ✕
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

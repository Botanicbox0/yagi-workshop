"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

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
      <button
        onClick={handleApproveClick}
        className="rounded-full bg-black px-8 py-3 text-base font-semibold text-white hover:bg-gray-900 transition-colors"
      >
        {t("approve_button")}
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleConfirm}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold text-black">
              {t("approve_confirm_title")}
            </h2>
            <p className="text-sm text-gray-600">{t("approve_confirm_body")}</p>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                {/* reuse comment_email_ph for the email label */}
                {t("comment_email_ph")}
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-40"
              >
                {t("approve_button")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-black hover:border-black"
              >
                ✕
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const LS_KEY_PREFIX = "yagi-share-";

type StoredIdentity = { name?: string; email?: string };

function readIdentity(token: string): StoredIdentity {
  try {
    const raw = localStorage.getItem(`${LS_KEY_PREFIX}${token}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredIdentity;
    return { name: parsed.name, email: parsed.email };
  } catch {
    return {};
  }
}

function writeIdentity(token: string, name: string, email: string) {
  try {
    const raw = localStorage.getItem(`${LS_KEY_PREFIX}${token}`);
    const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem(
      `${LS_KEY_PREFIX}${token}`,
      JSON.stringify({ ...existing, name, email }),
    );
  } catch {
    // ignore
  }
}

type Props = {
  frameId: string;
  token: string;
};

export function CommentForm({ frameId, token }: Props) {
  const t = useTranslations("share");
  const router = useRouter();

  const [body, setBody] = useState("");
  const [name, setName] = useState(() => readIdentity(token).name ?? "");
  const [email, setEmail] = useState(() => readIdentity(token).email ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !name.trim() || !email.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frame_id: frameId,
          body: body.trim(),
          author_name: name.trim(),
          author_email: email.trim(),
        }),
      });

      if (res.status === 429) {
        toast.error(t("rate_limit_comments"));
        return;
      }

      if (!res.ok) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      writeIdentity(token, name.trim(), email.trim());
      setBody("");
      toast.success(t("comment_submit"));
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <Textarea
        placeholder={t("comment_ph")}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="resize-none"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="text"
          placeholder={t("comment_name_ph")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="flex-1"
        />
        <Input
          type="email"
          placeholder={t("comment_email_ph")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button
          type="submit"
          size="pill"
          disabled={submitting || !body.trim() || !name.trim() || !email.trim()}
          className="whitespace-nowrap"
        >
          {t("comment_submit")}
        </Button>
      </div>
    </form>
  );
}

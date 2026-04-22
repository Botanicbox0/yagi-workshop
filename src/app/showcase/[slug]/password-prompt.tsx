"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unlockShowcase } from "./actions";

type Props = {
  showcaseId: string;
  slug: string;
};

/**
 * Phase 1.9 Wave C subtask 04 — password prompt UI.
 *
 * Single input + submit. On success calls `router.refresh()` so the cookie
 * set by the Server Action is picked up on the next render. On failure,
 * surfaces a Sonner error toast.
 */
export function ShowcasePasswordPrompt({ showcaseId, slug }: Props) {
  const t = useTranslations("showcase");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length === 0) return;
    startTransition(async () => {
      const result = await unlockShowcase(showcaseId, password, slug);
      if (result.ok) {
        router.refresh();
        return;
      }
      if (result.error === "invalid_password") {
        toast.error(t("viewer_password_error"));
      } else {
        toast.error(t("viewer_password_error"));
      }
    });
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-12 bg-white text-black">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl italic font-semibold keep-all">
            {t("viewer_password_prompt_title")}
          </h1>
          <p className="text-sm text-neutral-600 keep-all">
            {t("viewer_password_prompt_intro")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-[0.14em] text-neutral-500">
            {t("viewer_password_field_label")}
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            disabled={isPending}
            className="rounded-md"
          />
          <Button
            type="submit"
            disabled={isPending || password.length === 0}
            className="rounded-full uppercase tracking-[0.12em] text-sm w-full mt-2"
          >
            {t("viewer_password_submit")}
          </Button>
        </form>
      </div>
    </main>
  );
}

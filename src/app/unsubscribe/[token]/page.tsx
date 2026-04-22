import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { confirmUnsubscribe } from "./actions";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const prefix = local.slice(0, Math.min(2, local.length - 1));
  return `${prefix}${"*".repeat(Math.max(local.length - prefix.length, 1))}@${domain}`;
}

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmed?: string; error?: string }>;
};

export default async function UnsubscribePage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const sp = await searchParams;
  const t = await getTranslations("notifications");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("[unsubscribe/page] missing supabase env");
    return <InvalidView message={t("unsub_invalid_token")} />;
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: tokenRow } = await admin
    .from("notification_unsubscribe_tokens")
    .select("user_id, used_at")
    .eq("token", token)
    .maybeSingle();

  // Token invalid or already used (but not during the current success redirect).
  if (!tokenRow || (tokenRow.used_at && sp.confirmed !== "1")) {
    return <InvalidView message={t("unsub_invalid_token")} />;
  }

  // Look up locale so we can build a locale-preserving settings link.
  const { data: profile } = await admin
    .from("profiles")
    .select("locale")
    .eq("id", tokenRow.user_id)
    .maybeSingle();
  const settingsLocale: "ko" | "en" = profile?.locale === "en" ? "en" : "ko";
  const settingsHref = `/${settingsLocale}/app/settings/notifications`;

  // Success view after confirmation.
  if (sp.confirmed === "1") {
    return (
      <Shell>
        <h1 className="text-2xl font-serif italic keep-all">
          {t("unsub_success_title")}
        </h1>
        <p className="text-sm text-muted-foreground keep-all">
          {t("unsub_success_body")}
        </p>
        <Link
          href={settingsHref}
          className="inline-flex items-center text-sm underline underline-offset-4"
        >
          {t("unsub_settings_link")}
        </Link>
      </Shell>
    );
  }

  // Otherwise fetch the user's email for the confirmation copy.
  let email = "";
  try {
    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(
      tokenRow.user_id,
    );
    if (userErr) {
      console.error("[unsubscribe/page] admin.getUserById failed:", userErr);
    }
    email = userRes?.user?.email ?? "";
  } catch (err) {
    console.error("[unsubscribe/page] admin.getUserById threw:", err);
  }

  return (
    <Shell>
      <h1 className="text-2xl font-serif italic keep-all">
        {t("unsub_page_title")}
      </h1>
      <p className="text-sm keep-all">
        {t("unsub_intro", { email: email ? maskEmail(email) : "" })}
      </p>
      <p className="text-xs text-muted-foreground keep-all">
        {t("unsub_what_changes")}
      </p>

      {sp.error === "1" && (
        <p className="text-xs text-destructive keep-all">
          {t("prefs_save_error")}
        </p>
      )}

      <form action={confirmUnsubscribe} className="flex flex-col gap-3 pt-2">
        <input type="hidden" name="token" value={token} />
        <Button
          type="submit"
          className="rounded-full uppercase tracking-[0.12em] text-sm w-full"
        >
          {t("unsub_confirm_button")}
        </Button>
        <Link
          href={settingsHref}
          className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("unsub_cancel_link")}
        </Link>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6 py-12 bg-background text-foreground">
      <div className="w-full max-w-md space-y-4">{children}</div>
    </div>
  );
}

function InvalidView({ message }: { message: string }) {
  return (
    <Shell>
      <h1 className="text-2xl font-serif italic keep-all">{message}</h1>
      <Link
        href="/"
        className="inline-flex items-center text-sm underline underline-offset-4"
      >
        YAGI Workshop
      </Link>
    </Shell>
  );
}

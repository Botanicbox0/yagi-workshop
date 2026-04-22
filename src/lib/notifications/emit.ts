"use server";

// Phase 1.8 — central notification emit helper.
//
// Uses the service-role Supabase client so that Server Actions can emit
// notifications for arbitrary recipients (the caller is usually a different
// user than the recipient). Pre-renders title + body using the recipient's
// locale so the in-app bell and digest emails stay cheap to render.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { severityOf, type NotificationKind } from "./kinds";

type EmitArgs = {
  user_id: string; // recipient
  kind: NotificationKind;
  project_id?: string;
  workspace_id?: string;
  payload?: Record<string, unknown>;
  url_path?: string;
};

type MessagesJson = Record<string, unknown>;

export async function emitNotification(args: EmitArgs): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[notif/emit] missing supabase env");
    return;
  }
  const sb = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Look up recipient locale from profiles to pre-render title/body.
  let locale: "ko" | "en" = "ko";
  try {
    const { data: profile } = await sb
      .from("profiles")
      .select("locale")
      .eq("id", args.user_id)
      .maybeSingle();
    if (profile?.locale === "en") locale = "en";
  } catch (err) {
    console.error("[notif/emit] profile fetch failed:", err);
  }

  // Load the appropriate messages bundle. Dynamic import keeps the Server
  // Action bundle small and lazy.
  let messages: MessagesJson;
  try {
    messages =
      locale === "en"
        ? ((await import("../../../messages/en.json")).default as MessagesJson)
        : ((await import("../../../messages/ko.json")).default as MessagesJson);
  } catch (err) {
    console.error("[notif/emit] messages import failed:", err);
    messages = {};
  }

  // Use next-intl's createTranslator to interpolate ICU placeholders from the
  // caller-supplied payload. If a template is missing or the payload is
  // malformed, fall back to the kind string so we still record the event.
  //
  // We intentionally cast to the untyped translator form: the namespace and
  // key names are data-driven, so the stricter compile-time typing provided
  // by next-intl can't statically resolve them to their literal keys.
  let title = String(args.kind);
  let body = "";
  try {
    const { createTranslator } = await import("next-intl");
    const t = createTranslator({
      locale,
      messages,
      namespace: "notifications.events." + args.kind,
      // biome-ignore lint/suspicious/noExplicitAny: dynamic namespace — see comment above.
    }) as unknown as (
      key: string,
      values?: Record<string, string | number>
    ) => string;
    const values = (args.payload ?? {}) as Record<string, string | number>;
    title = t("title", values);
    body = t("body", values);
  } catch (err) {
    console.error("[notif/emit] template render failed:", args.kind, err);
  }

  const severity = severityOf(args.kind);

  const { error } = await sb.from("notification_events").insert({
    user_id: args.user_id,
    kind: args.kind,
    severity,
    title,
    body,
    url_path: args.url_path ?? null,
    project_id: args.project_id ?? null,
    workspace_id: args.workspace_id ?? null,
    payload: (args.payload ?? null) as never,
  });
  if (error) console.error("[notif/emit] insert failed:", args.kind, error);
}

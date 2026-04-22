"use server";

// Phase 1.8 — debounced notification emit helper.
//
// For kinds that fire in rapid bursts (frame_uploaded_batch, feedback_received)
// we aggregate events per (user_id, kind, project_id?) within a short rolling
// window. If a pending (not-yet-emailed, not-yet-seen-in-app) event exists in
// that window we UPDATE its payload + re-render title/body instead of inserting
// a new row — this prevents the bell + email digest from being spammed when a
// viewer reacts to 8 frames in a minute.
//
// Concurrency: a partial unique index on
// (user_id, kind, project_id) WHERE pending AND project_id IS NOT NULL
// AND kind IN ('feedback_received','frame_uploaded_batch')
// guarantees at most one pending debounced row per key. If two emits race and
// both SELECT "no existing row", the INSERT loser hits unique_violation (23505);
// we retry once by re-reading and UPDATING the winner's row.
//
// Mirrors src/lib/notifications/emit.ts: same service-role env pathway, same
// createTranslator pattern. Do not introduce a new supabase client shape here.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { severityOf, type NotificationKind } from "./kinds";

type DebouncedKind = Extract<
  NotificationKind,
  "frame_uploaded_batch" | "feedback_received"
>;

type EmitDebouncedArgs = {
  user_id: string; // recipient
  kind: DebouncedKind;
  project_id?: string;
  workspace_id?: string;
  url_path?: string;
  // Per-event item to add to the aggregated payload. Its named fields are
  // ALSO spread onto the top-level payload for the ICU template to read
  // (e.g. { board_title } for feedback_received).
  item: Record<string, unknown>;
  // Aggregation window (default 10 min per spec).
  windowMinutes?: number;
  // Locale fallback if profile lookup fails (default 'ko').
  fallbackLocale?: "ko" | "en";
};

type MessagesJson = Record<string, unknown>;

type AggregatedPayload = {
  items: unknown[];
  count: number;
  [k: string]: unknown;
};

type ExistingRow = {
  id: string;
  payload: unknown;
};

type SupaClient = SupabaseClient<Database>;

export async function emitDebouncedNotification(
  args: EmitDebouncedArgs
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[notif/debounce] missing supabase env");
    return;
  }
  const sb = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const windowMinutes = args.windowMinutes ?? 10;
  const fallbackLocale = args.fallbackLocale ?? "ko";

  // Resolve recipient locale (matches emit.ts behaviour).
  let locale: "ko" | "en" = fallbackLocale;
  try {
    const { data: profile } = await sb
      .from("profiles")
      .select("locale")
      .eq("id", args.user_id)
      .maybeSingle();
    if (profile?.locale === "en") locale = "en";
    else if (profile?.locale === "ko") locale = "ko";
  } catch (err) {
    console.error("[notif/debounce] profile fetch failed:", err);
  }

  // Load messages bundle lazily, same as emit.ts.
  let messages: MessagesJson;
  try {
    messages =
      locale === "en"
        ? ((await import("../../../messages/en.json"))
            .default as MessagesJson)
        : ((await import("../../../messages/ko.json"))
            .default as MessagesJson);
  } catch (err) {
    console.error("[notif/debounce] messages import failed:", err);
    messages = {};
  }

  // First attempt: SELECT existing pending row in window, then INSERT or UPDATE.
  const attemptOnce = async (): Promise<
    "done" | "retry_unique_violation" | "failed"
  > => {
    const existing = await findExistingPending(sb, args, windowMinutes);
    if (existing === "select_failed") {
      // Per spec (Forbidden line 283) we MUST NOT insert a possible duplicate
      // when the select fails. Drop and log.
      console.error(
        "[notif/debounce] select failed — dropping event to avoid duplicate:",
        args.kind
      );
      return "failed";
    }

    const nextPayload = buildAggregatedPayload(existing, args);
    const { title, body } = await renderTitleBody(
      locale,
      messages,
      args.kind,
      nextPayload
    );

    if (existing) {
      const { error: updateError } = await sb
        .from("notification_events")
        .update({
          payload: nextPayload as never,
          title,
          body,
        })
        .eq("id", existing.id);
      if (updateError) {
        console.error(
          "[notif/debounce] update failed:",
          args.kind,
          updateError
        );
        return "failed";
      }
      return "done";
    }

    const severity = severityOf(args.kind);
    const { error: insertError } = await sb
      .from("notification_events")
      .insert({
        user_id: args.user_id,
        kind: args.kind,
        severity,
        title,
        body,
        url_path: args.url_path ?? null,
        project_id: args.project_id ?? null,
        workspace_id: args.workspace_id ?? null,
        payload: nextPayload as never,
      });
    if (insertError) {
      // Postgres unique_violation = 23505. Signals that a concurrent emit
      // beat us to inserting the pending row; retry by re-reading and
      // updating it instead.
      if (insertError.code === "23505") {
        return "retry_unique_violation";
      }
      console.error("[notif/debounce] insert failed:", args.kind, insertError);
      return "failed";
    }
    return "done";
  };

  const result = await attemptOnce();
  if (result === "retry_unique_violation") {
    // Single retry — at this point the concurrent insertion committed, so
    // findExistingPending() should see it and we'll UPDATE the row.
    const retry = await attemptOnce();
    if (retry !== "done") {
      console.error(
        "[notif/debounce] retry after 23505 did not succeed:",
        args.kind,
        retry
      );
      // Do NOT insert a duplicate. Drop. (spec Forbidden line 283)
    }
  }
}

async function findExistingPending(
  sb: SupaClient,
  args: EmitDebouncedArgs,
  windowMinutes: number
): Promise<ExistingRow | null | "select_failed"> {
  const sinceIso = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  let query = sb
    .from("notification_events")
    .select("id, payload")
    .eq("user_id", args.user_id)
    .eq("kind", args.kind)
    .is("email_sent_at", null)
    .is("in_app_seen_at", null)
    .gt("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1);

  if (args.project_id) {
    query = query.eq("project_id", args.project_id);
  }

  const { data: existingRows, error: selectError } = await query;
  if (selectError) {
    console.error("[notif/debounce] select failed:", args.kind, selectError);
    return "select_failed";
  }
  return existingRows && existingRows.length > 0 ? existingRows[0] : null;
}

function buildAggregatedPayload(
  existing: ExistingRow | null,
  args: EmitDebouncedArgs
): AggregatedPayload {
  if (existing) {
    const prev = (existing.payload ?? {}) as Partial<AggregatedPayload> &
      Record<string, unknown>;
    const prevItems = Array.isArray(prev.items) ? prev.items : [];
    const prevCount =
      typeof prev.count === "number" ? prev.count : prevItems.length;
    return {
      // Preserve top-level fields from the first event (e.g. board_title) so
      // the template keeps rendering a stable context line.
      ...prev,
      // Also merge in any new top-level fields from the incoming item so
      // newly-relevant context (e.g. latest reactor_name) is available.
      ...args.item,
      items: [...prevItems, args.item],
      count: prevCount + 1,
    };
  }
  return {
    ...args.item,
    items: [args.item],
    count: 1,
  };
}

async function renderTitleBody(
  locale: "ko" | "en",
  messages: MessagesJson,
  kind: DebouncedKind,
  nextPayload: AggregatedPayload
): Promise<{ title: string; body: string }> {
  let title = String(kind);
  let body = "";
  try {
    const { createTranslator } = await import("next-intl");
    const t = createTranslator({
      locale,
      messages,
      namespace: "notifications.events." + kind,
      // biome-ignore lint/suspicious/noExplicitAny: dynamic namespace — keys
      // are data-driven at the kind level, same rationale as emit.ts.
    }) as unknown as (
      key: string,
      values?: Record<string, string | number>
    ) => string;
    // ICU templates only accept primitive values; coerce/filter accordingly.
    const values: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(nextPayload)) {
      if (typeof v === "string" || typeof v === "number") values[k] = v;
    }
    title = t("title", values);
    body = t("body", values);
  } catch (err) {
    console.error("[notif/debounce] template render failed:", kind, err);
  }
  return { title, body };
}

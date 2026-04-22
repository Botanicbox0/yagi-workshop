"use server";

// Phase 1.8 subtask 05 — Server Actions for the notification bell/panel.
// RLS already gates access via notif_events_select_own / notif_events_update_own;
// these actions run with the user-scoped Server client.

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

export type NotificationEvent = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  body: string | null;
  url_path: string | null;
  created_at: string;
  in_app_seen_at: string | null;
  project_id: string | null;
  workspace_id: string | null;
};

export async function getRecentEvents(): Promise<NotificationEvent[]> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("notification_events")
    .select(
      "id, kind, severity, title, body, url_path, created_at, in_app_seen_at, project_id, workspace_id",
    )
    .eq("user_id", user.id)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[notif/getRecentEvents] fetch failed:", error);
    return [];
  }
  return (data ?? []) as NotificationEvent[];
}

export async function markEventSeen(
  eventId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!eventId || typeof eventId !== "string") {
    return { error: "validation" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { error } = await supabase
    .from("notification_events")
    .update({ in_app_seen_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("user_id", user.id)
    .is("in_app_seen_at", null);

  if (error) {
    console.error("[notif/markEventSeen] update failed:", error);
    return { error: "db" };
  }

  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

export async function markAllSeen(): Promise<{ ok: true } | { error: string }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { error } = await supabase
    .from("notification_events")
    .update({ in_app_seen_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("in_app_seen_at", null);

  if (error) {
    console.error("[notif/markAllSeen] update failed:", error);
    return { error: "db" };
  }

  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

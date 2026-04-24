// Phase 1.8 — notify-dispatch Edge Function
// Runs every 10 minutes (Supabase Scheduled Functions). Loads pending
// notification_events, groups by user, applies per-user preferences + quiet
// hours, and dispatches via Resend. Idempotent via a two-phase claim:
//   1. UPDATE set email_batch_id = $uuid where email_batch_id is null
//      (rows-affected > 0 means this invocation owns the row)
//   2. send; on success set email_sent_at = now(); on failure NULL the
//      email_batch_id so the next run retries.
//
// Severity behaviour:
//   - HIGH: per-event immediate email. Respects `email_immediate_enabled`:
//     when the user has disabled immediate email, we mark the row sent
//     WITHOUT calling Resend so the in-app badge still works and the row
//     doesn't requeue forever.
//   - MEDIUM: hourly digest. Respects `email_digest_enabled`.
//   - LOW: daily digest at user's digest_time_local ± 15 min. Respects
//     `email_digest_enabled`.
//
// Deno runtime. No Node APIs. Uses Supabase service role (auto-injected).

// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// -------- Types --------
type Severity = "high" | "medium" | "low";
type Locale = "ko" | "en";

type NotificationEvent = {
  id: string;
  user_id: string;
  project_id: string | null;
  workspace_id: string | null;
  kind: string;
  severity: Severity;
  title: string;
  body: string | null;
  url_path: string | null;
  payload: Record<string, unknown> | null;
  email_sent_at: string | null;
  email_batch_id: string | null;
  created_at: string;
};

type Preferences = {
  user_id: string;
  email_immediate_enabled: boolean;
  email_digest_enabled: boolean;
  digest_time_local: string; // "HH:MM:SS"
  quiet_hours_start: string; // "HH:MM:SS"
  quiet_hours_end: string; // "HH:MM:SS"
  timezone: string;
  challenge_updates_enabled: boolean;
};

// -------- Config --------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SITE_URL =
  Deno.env.get("SITE_URL") ?? "https://studio.yagiworkshop.xyz";
const EMAIL_FROM =
  Deno.env.get("RESEND_FROM_EMAIL") ??
  "YAGI Workshop <noreply@yagiworkshop.xyz>";

const EVENT_FETCH_LIMIT = 500;

// -------- Utilities --------
function hexFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function newToken(): string {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return hexFromBytes(buf);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Extract hour/minute/day-of-week in the given IANA timezone. */
function nowInTz(tz: string): { hour: number; minute: number } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    let h = 0;
    let m = 0;
    for (const p of parts) {
      if (p.type === "hour") h = parseInt(p.value, 10) % 24;
      if (p.type === "minute") m = parseInt(p.value, 10);
    }
    return { hour: h, minute: m };
  } catch {
    // Fallback to UTC if timezone is invalid.
    const d = new Date();
    return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
  }
}

/** "HH:MM:SS" -> {hour,minute} */
function parseClock(s: string): { hour: number; minute: number } {
  const [hh = "0", mm = "0"] = s.split(":");
  return {
    hour: parseInt(hh, 10) || 0,
    minute: parseInt(mm, 10) || 0,
  };
}

/** Minutes-since-midnight. */
function toMinutes(hm: { hour: number; minute: number }): number {
  return hm.hour * 60 + hm.minute;
}

/** True if nowMins is inside [startMins, endMins) with wrap-around support. */
function isInWindow(
  nowMins: number,
  startMins: number,
  endMins: number,
): boolean {
  if (startMins === endMins) return false; // empty window
  if (startMins < endMins) {
    return nowMins >= startMins && nowMins < endMins;
  }
  // Wrap-around: e.g. 22:00 -> 08:00 means hour>=22 OR hour<8
  return nowMins >= startMins || nowMins < endMins;
}

/** Absolute minute-difference on a wrap-around clock (0..720). */
function minuteDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % (24 * 60);
  return Math.min(diff, 24 * 60 - diff);
}

// -------- Challenge kind helpers --------

function isChallengeKind(kind: string): boolean {
  return kind.startsWith("challenge_");
}

function renderChallengeSubmissionConfirmed(
  event: NotificationEvent,
  locale: Locale,
): { subject: string; text: string } {
  const title = (event.payload?.challenge_title as string | undefined) ?? "";
  const subject =
    locale === "ko"
      ? `[YAGI] 작품이 등록되었어요 — ${title}`
      : `[YAGI] Submission confirmed — ${title}`;
  const text =
    locale === "ko"
      ? `${title} 챌린지에 작품을 올렸어요.\n\n결과 발표일까지 기다려 주세요!\n\n작품 보기: ${SITE_URL}${event.url_path ?? "/"}`
      : `Your entry for ${title} has been received.\n\nResults will be announced soon.\n\nView: ${SITE_URL}${event.url_path ?? "/"}`;
  return { subject, text };
}

function renderChallengeClosingSoon(
  event: NotificationEvent,
  locale: Locale,
): { subject: string; text: string } {
  const title = (event.payload?.challenge_title as string | undefined) ?? "";
  const link = `${SITE_URL}${event.url_path ?? "/"}`;
  const subject =
    locale === "ko"
      ? `[YAGI] 곧 마감이에요 — ${title}`
      : `[YAGI] Closing in 24 hours — ${title}`;
  const text =
    locale === "ko"
      ? `${title} 챌린지가 24시간 뒤 마감됩니다. 참여를 마무리해 주세요.\n\n챌린지 보기: ${link}`
      : `${title} closes in 24 hours. Wrap up your entry before the deadline.\n\nView: ${link}`;
  return { subject, text };
}

function renderChallengeAnnouncedWinner(
  event: NotificationEvent,
  locale: Locale,
): { subject: string; text: string } {
  const title = (event.payload?.challenge_title as string | undefined) ?? "";
  const subject =
    locale === "ko"
      ? `[YAGI] 주인공으로 선정되었어요 — ${title}`
      : `[YAGI] You're a winner — ${title}`;
  const text =
    locale === "ko"
      ? `${title} 챌린지의 이번 주인공으로 선정됐어요! 축하드려요.\n\n결과 보기: ${SITE_URL}${event.url_path ?? "/"}`
      : `Your submission for ${title} has been selected. Congratulations!\n\nView results: ${SITE_URL}${event.url_path ?? "/"}`;
  return { subject, text };
}

function renderChallengeAnnouncedParticipant(
  event: NotificationEvent,
  locale: Locale,
): { subject: string; text: string } {
  const title = (event.payload?.challenge_title as string | undefined) ?? "";
  const subject =
    locale === "ko"
      ? `[YAGI] 결과가 발표되었어요 — ${title}`
      : `[YAGI] Results announced — ${title}`;
  const text =
    locale === "ko"
      ? `${title} 챌린지의 결과가 발표됐어요. 주인공들의 작품을 확인해 보세요.\n\n결과 보기: ${SITE_URL}${event.url_path ?? "/"}`
      : `Results are in for ${title}. Check out the winning entries.\n\nView results: ${SITE_URL}${event.url_path ?? "/"}`;
  return { subject, text };
}

/** Returns localized subject + text for challenge kinds, or null if kind is unknown. */
function renderChallengeEmail(
  event: NotificationEvent,
  locale: Locale,
): { subject: string; text: string } | null {
  switch (event.kind) {
    case "challenge_submission_confirmed":
      return renderChallengeSubmissionConfirmed(event, locale);
    case "challenge_closing_soon":
      return renderChallengeClosingSoon(event, locale);
    case "challenge_announced_winner":
      return renderChallengeAnnouncedWinner(event, locale);
    case "challenge_announced_participant":
      return renderChallengeAnnouncedParticipant(event, locale);
    default:
      return null;
  }
}

// -------- Email HTML (inline, mirrors src/emails/*) --------

const T_EN = {
  openButton: "Open in YAGI Workshop",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "Seoul, Korea",
  sentTo: "This email was sent to",
  unsubscribe: "Unsubscribe from these emails",
  manageSettings: "Manage notification settings",
  digestHeading: (n: number) => `${n} updates from YAGI Workshop`,
  digestPeriodHourly: "Hourly digest",
  digestPeriodDaily: "Daily digest",
  digestSubject: (n: number) => `${n} updates · YAGI Workshop`,
};

const T_KO = {
  openButton: "YAGI Workshop에서 열기",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "서울, 대한민국",
  sentTo: "이 이메일은 다음 주소로 발송되었습니다",
  unsubscribe: "이메일 수신 거부",
  manageSettings: "알림 설정 관리",
  digestHeading: (n: number) => `YAGI Workshop의 업데이트 ${n}건`,
  digestPeriodHourly: "시간별 디지스트",
  digestPeriodDaily: "데일리 디지스트",
  digestSubject: (n: number) => `업데이트 ${n}건 · YAGI Workshop`,
};

function t(locale: Locale) {
  return locale === "ko" ? T_KO : T_EN;
}

function renderFooterHtml(
  locale: Locale,
  recipientEmail: string,
  unsubscribeUrl: string,
  siteUrl: string,
): string {
  const T = t(locale);
  return `
    <hr style="border:0;border-top:1px solid #e5e5e5;margin:40px 0 24px 0;" />
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td>
        <p style="font-size:12px;line-height:1.6;color:#666666;margin:4px 0;">${escapeHtml(T.footerTagline)} &middot; ${escapeHtml(T.footerAddress)}</p>
        <p style="font-size:12px;line-height:1.6;color:#666666;margin:4px 0;">${escapeHtml(T.sentTo)} ${escapeHtml(recipientEmail)}.</p>
        <p style="font-size:12px;line-height:1.6;color:#666666;margin:4px 0;">
          <a href="${escapeHtml(unsubscribeUrl)}" style="color:#000000;text-decoration:underline;">${escapeHtml(T.unsubscribe)}</a>
          &nbsp;&middot;&nbsp;
          <a href="${escapeHtml(`${siteUrl}/${locale}/app/settings/notifications`)}" style="color:#000000;text-decoration:underline;">${escapeHtml(T.manageSettings)}</a>
        </p>
      </td></tr>
    </table>
  `;
}

function wrapShell(locale: Locale, preview: string, inner: string): string {
  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>YAGI Workshop</title>
</head>
<body style="background-color:#ffffff;color:#000000;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;">
<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td>
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
  <p style="font-family:Fraunces,Georgia,'Times New Roman',serif;font-style:italic;font-weight:400;font-size:20px;letter-spacing:0.02em;color:#000000;margin:0;padding:0;">YAGI WORKSHOP</p>
  ${inner}
</div>
</td></tr></table>
</body></html>`;
}

function renderImmediateHtml(input: {
  locale: Locale;
  event: Pick<NotificationEvent, "title" | "body" | "url_path">;
  recipientEmail: string;
  unsubscribeUrl: string;
  siteUrl: string;
}): { html: string; subject: string; text: string } {
  const { locale, event, recipientEmail, unsubscribeUrl, siteUrl } = input;
  const T = t(locale);
  const href = `${siteUrl}${event.url_path || "/"}`;
  const title = event.title || "";
  const body = event.body || "";
  const preview = title.slice(0, 50);

  const inner = `
    <h1 style="font-size:22px;line-height:1.35;font-weight:600;color:#000000;margin:32px 0 12px 0;word-break:keep-all;">${escapeHtml(title)}</h1>
    <p style="font-size:15px;line-height:1.6;color:#000000;margin:0 0 24px 0;word-break:keep-all;">${escapeHtml(body)}</p>
    <p style="margin:0 0 24px 0;"><a href="${escapeHtml(href)}" style="background-color:#000000;color:#ffffff;border-radius:9999px;padding:12px 24px;font-size:14px;font-weight:500;text-decoration:none;display:inline-block;">${escapeHtml(T.openButton)}</a></p>
    ${renderFooterHtml(locale, recipientEmail, unsubscribeUrl, siteUrl)}
  `;

  const html = wrapShell(locale, preview, inner);
  const subject = title;
  const text = `${title}\n\n${body}\n\n${T.openButton}: ${href}\n\n${T.unsubscribe}: ${unsubscribeUrl}`;
  return { html, subject, text };
}

function renderDigestHtml(input: {
  locale: Locale;
  events: NotificationEvent[];
  recipientEmail: string;
  unsubscribeUrl: string;
  siteUrl: string;
  digestPeriod: "hourly" | "daily";
}): { html: string; subject: string; text: string } {
  const {
    locale,
    events,
    recipientEmail,
    unsubscribeUrl,
    siteUrl,
    digestPeriod,
  } = input;
  const T = t(locale);
  const firstTitle = events[0]?.title ?? "";
  const preview = firstTitle.slice(0, 50);
  const periodLabel =
    digestPeriod === "hourly" ? T.digestPeriodHourly : T.digestPeriodDaily;

  const rows = events
    .map((ev) => {
      const href = `${siteUrl}${ev.url_path || "/"}`;
      const meta = (() => {
        try {
          return new Date(ev.created_at).toLocaleString(
            locale === "ko" ? "ko-KR" : "en-US",
            {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Asia/Seoul",
            },
          );
        } catch {
          return "";
        }
      })();
      return `
      <div style="border-top:1px solid #e5e5e5;padding:16px 0;">
        <a href="${escapeHtml(href)}" style="color:#000000;text-decoration:none;display:block;">
          <p style="font-size:15px;font-weight:600;line-height:1.4;color:#000000;margin:0 0 4px 0;word-break:keep-all;">${escapeHtml(ev.title)}</p>
          <p style="font-size:14px;line-height:1.55;color:#333333;margin:0 0 6px 0;word-break:keep-all;">${escapeHtml(ev.body ?? "")}</p>
          <p style="font-size:12px;color:#999999;margin:0;">${escapeHtml(meta)}</p>
        </a>
      </div>`;
    })
    .join("");

  const inner = `
    <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#666666;margin:24px 0 4px 0;">${escapeHtml(periodLabel)}</p>
    <h1 style="font-size:22px;line-height:1.35;font-weight:600;color:#000000;margin:0 0 24px 0;word-break:keep-all;">${escapeHtml(T.digestHeading(events.length))}</h1>
    ${rows}
    ${renderFooterHtml(locale, recipientEmail, unsubscribeUrl, siteUrl)}
  `;

  const html = wrapShell(locale, preview, inner);
  const subject = T.digestSubject(events.length);
  const text = events
    .map((ev) => `- ${ev.title}\n  ${ev.body ?? ""}\n  ${siteUrl}${ev.url_path || "/"}`)
    .join("\n\n");
  return { html, subject, text };
}

// -------- Resend --------
async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { ok: false, error: `Resend ${resp.status}: ${body.slice(0, 400)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// -------- Main handler --------
function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    // base64url -> base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // Auth: only service-role callers (Supabase cron passes service role).
  // verify_jwt is also enabled at deploy time so the signature was already
  // validated by the gateway. Here we enforce the role claim.
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : "";
  const role = bearer ? decodeJwtRole(bearer) : null;
  if (role !== "service_role") {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const run_id = crypto.randomUUID();
  const started = Date.now();

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Fetch pending events (cap)
  const { data: pending, error: pendErr } = await supabase
    .from("notification_events")
    .select(
      "id,user_id,project_id,workspace_id,kind,severity,title,body,url_path,payload,email_sent_at,email_batch_id,created_at",
    )
    .is("email_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(EVENT_FETCH_LIMIT);

  if (pendErr) {
    console.error(JSON.stringify({ run_id, stage: "fetch_pending", error: pendErr.message }));
    return new Response(JSON.stringify({ error: pendErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const events = (pending ?? []) as NotificationEvent[];

  if (events.length === 0) {
    const summary = { run_id, users: 0, events: 0, ms: Date.now() - started };
    console.log(JSON.stringify({ run_id, ...summary, msg: "no pending events" }));
    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // 2) Group by user
  const byUser = new Map<string, NotificationEvent[]>();
  for (const ev of events) {
    const list = byUser.get(ev.user_id);
    if (list) list.push(ev);
    else byUser.set(ev.user_id, [ev]);
  }

  // Preload recipient emails + profiles.locale for all unique users
  const userIds = Array.from(byUser.keys());

  // auth schema is not exposed via PostgREST; use the admin API per user.
  const emailByUser = new Map<string, string>();
  for (const uid of userIds) {
    try {
      const { data: u, error } = await supabase.auth.admin.getUserById(uid);
      if (error) {
        console.error(
          JSON.stringify({ run_id, stage: "fetch_auth_user", user_id: uid, error: error.message }),
        );
        continue;
      }
      const email = u?.user?.email;
      if (email) emailByUser.set(uid, email);
    } catch (err) {
      console.error(
        JSON.stringify({ run_id, stage: "fetch_auth_user_exc", user_id: uid, error: (err as Error).message }),
      );
    }
  }

  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("id,locale")
    .in("id", userIds);
  const localeByUser = new Map<string, Locale>();
  for (const p of (profilesRaw as Array<{ id: string; locale: string }> | null) ?? []) {
    localeByUser.set(p.id, p.locale === "ko" ? "ko" : "en");
  }

  let totalSent = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // 3-6) Per-user processing
  for (const [user_id, userEvents] of byUser) {
    let sent_count = 0;
    let skipped_count = 0;
    let error_count = 0;

    const recipientEmail = emailByUser.get(user_id);
    const locale: Locale = localeByUser.get(user_id) ?? "ko";

    if (!recipientEmail) {
      skipped_count += userEvents.length;
      totalSkipped += userEvents.length;
      console.warn(
        JSON.stringify({
          run_id,
          user_id,
          sent_count: 0,
          skipped_count,
          error_count: 0,
          reason: "no_email",
        }),
      );
      continue;
    }

    // Load prefs (upsert defaults if missing)
    let { data: prefsRow } = await supabase
      .from("notification_preferences")
      .select(
        "user_id,email_immediate_enabled,email_digest_enabled,digest_time_local,quiet_hours_start,quiet_hours_end,timezone,challenge_updates_enabled",
      )
      .eq("user_id", user_id)
      .maybeSingle();

    if (!prefsRow) {
      const { data: inserted } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id },
          { onConflict: "user_id", ignoreDuplicates: false },
        )
        .select(
          "user_id,email_immediate_enabled,email_digest_enabled,digest_time_local,quiet_hours_start,quiet_hours_end,timezone,challenge_updates_enabled",
        )
        .maybeSingle();
      prefsRow = inserted;
    }

    const prefs: Preferences = (prefsRow as Preferences | null) ?? {
      user_id,
      email_immediate_enabled: true,
      email_digest_enabled: true,
      digest_time_local: "09:00:00",
      quiet_hours_start: "22:00:00",
      quiet_hours_end: "08:00:00",
      timezone: "Asia/Seoul",
      challenge_updates_enabled: true,
    };

    // Resolve/issue unsubscribe token
    let unsubscribeToken: string | null = null;
    {
      const { data: existing } = await supabase
        .from("notification_unsubscribe_tokens")
        .select("token")
        .eq("user_id", user_id)
        .is("used_at", null)
        .limit(1)
        .maybeSingle();
      if (existing?.token) {
        unsubscribeToken = existing.token;
      } else {
        const token = newToken();
        const { error: tokErr } = await supabase
          .from("notification_unsubscribe_tokens")
          .insert({ token, user_id });
        if (!tokErr) unsubscribeToken = token;
      }
    }
    const unsubscribeUrl = `${SITE_URL}/unsubscribe/${unsubscribeToken ?? ""}`;

    // Time math
    const now = nowInTz(prefs.timezone);
    const nowMins = toMinutes(now);
    const qStart = toMinutes(parseClock(prefs.quiet_hours_start));
    const qEnd = toMinutes(parseClock(prefs.quiet_hours_end));
    const inQuiet = isInWindow(nowMins, qStart, qEnd);

    const digestTarget = toMinutes(parseClock(prefs.digest_time_local));
    const inDigestWindow = minuteDistance(nowMins, digestTarget) <= 15;

    // Split by severity
    const highs = userEvents.filter((e) => e.severity === "high");
    const mediums = userEvents.filter((e) => e.severity === "medium");
    const lows = userEvents.filter((e) => e.severity === "low");

    // --- High severity: per-event immediate (respects email_immediate_enabled) ---
    for (const ev of highs) {
      // If the user has disabled immediate email, mark the row sent without
      // calling Resend. This way the in-app badge still works, the row doesn't
      // requeue forever, and the unsubscribe toggle actually has effect.
      if (!prefs.email_immediate_enabled) {
        const { error: markErr } = await supabase
          .from("notification_events")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", ev.id);
        if (markErr) {
          console.error(
            "[notify-dispatch] mark-sent failed for",
            [ev.id],
            markErr,
          );
          // Recovery: clear batch claim so a future run can retry.
          await supabase
            .from("notification_events")
            .update({ email_batch_id: null })
            .eq("id", ev.id);
          error_count++;
        } else {
          skipped_count++;
        }
        continue;
      }

      // Challenge pref gate: skip email (in-app row stays) if opted out
      if (isChallengeKind(ev.kind) && prefs.challenge_updates_enabled === false) {
        console.log(
          JSON.stringify({ run_id, user_id, event_id: ev.id, kind: ev.kind, msg: "skipped (pref=off)" }),
        );
        skipped_count++;
        continue;
      }

      const ageMs = Date.now() - new Date(ev.created_at).getTime();
      const oneHour = 60 * 60 * 1000;
      if (inQuiet && ageMs < oneHour) {
        skipped_count++;
        continue;
      }
      // Claim
      const batchId = crypto.randomUUID();
      const { data: claimed, error: claimErr } = await supabase
        .from("notification_events")
        .update({ email_batch_id: batchId })
        .eq("id", ev.id)
        .is("email_batch_id", null)
        .select("id");
      if (claimErr || !claimed || claimed.length === 0) {
        skipped_count++;
        continue;
      }
      // For challenge kinds: render locale-aware subject/text from payload;
      // cron inserts blank title/body so we must override here.
      const challengeRendered = isChallengeKind(ev.kind)
        ? renderChallengeEmail(ev, locale)
        : null;
      const evForRender = challengeRendered
        ? { ...ev, title: challengeRendered.subject, body: challengeRendered.text }
        : ev;
      // Render + send
      const rendered = renderImmediateHtml({
        locale,
        event: evForRender,
        recipientEmail,
        unsubscribeUrl,
        siteUrl: SITE_URL,
      });
      const emailSubject = challengeRendered ? challengeRendered.subject : rendered.subject;
      const emailText = challengeRendered ? challengeRendered.text : rendered.text;
      const result = await sendEmail({
        to: recipientEmail,
        subject: emailSubject,
        html: rendered.html,
        text: emailText,
      });
      if (result.ok) {
        const { error: markErr } = await supabase
          .from("notification_events")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", ev.id);
        if (markErr) {
          error_count++;
          console.error(
            "[notify-dispatch] mark-sent failed for",
            [ev.id],
            markErr,
          );
          console.error(
            JSON.stringify({
              run_id,
              user_id,
              stage: "mark_sent_high",
              event_id: ev.id,
              error: markErr.message,
            }),
          );
          // Recovery: clear batch claim so the row can be retried next run.
          // Accepts the risk of a duplicate email to avoid permanent dead-letter.
          await supabase
            .from("notification_events")
            .update({ email_batch_id: null })
            .eq("id", ev.id);
        } else {
          sent_count++;
        }
      } else {
        // Release claim so next run retries
        await supabase
          .from("notification_events")
          .update({ email_batch_id: null })
          .eq("id", ev.id)
          .eq("email_batch_id", batchId);
        error_count++;
        console.error(
          JSON.stringify({
            run_id,
            user_id,
            stage: "resend_high",
            event_id: ev.id,
            error: result.error,
          }),
        );
      }
    }

    // --- Medium severity: hourly digest ---
    // Filter out challenge events when challenge_updates_enabled=false (in-app stays)
    const mediumsForEmail = prefs.challenge_updates_enabled === false
      ? mediums.filter((e) => {
          if (isChallengeKind(e.kind)) {
            console.log(
              JSON.stringify({ run_id, user_id, event_id: e.id, kind: e.kind, msg: "skipped (pref=off)" }),
            );
            skipped_count++;
            return false;
          }
          return true;
        })
      : mediums;
    if (mediumsForEmail.length > 0) {
      if (!prefs.email_digest_enabled) {
        // mark sent without sending so they don't requeue forever
        const ids = mediumsForEmail.map((e) => e.id);
        const { error: markErr } = await supabase
          .from("notification_events")
          .update({ email_sent_at: new Date().toISOString() })
          .in("id", ids);
        if (markErr) {
          error_count++;
        } else {
          skipped_count += mediumsForEmail.length;
        }
      } else {
        // Check if any medium was sent in the last 1 hour
        const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: recentCount } = await supabase
          .from("notification_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user_id)
          .eq("severity", "medium")
          .gte("email_sent_at", oneHourAgoIso);

        const recent = recentCount ?? 0;
        if (recent > 0) {
          skipped_count += mediumsForEmail.length;
        } else if (inQuiet) {
          // Mediums defer out of quiet hours (no grace on mediums)
          skipped_count += mediumsForEmail.length;
        } else {
          // Claim all
          const batchId = crypto.randomUUID();
          const ids = mediumsForEmail.map((e) => e.id);
          const { data: claimed } = await supabase
            .from("notification_events")
            .update({ email_batch_id: batchId })
            .in("id", ids)
            .is("email_batch_id", null)
            .select("id");
          const claimedIds = new Set(
            (claimed as Array<{ id: string }> | null ?? []).map((r) => r.id),
          );
          const claimedEvents = mediumsForEmail.filter((e) => claimedIds.has(e.id));
          if (claimedEvents.length === 0) {
            skipped_count += mediumsForEmail.length;
          } else {
            const rendered = renderDigestHtml({
              locale,
              events: claimedEvents,
              recipientEmail,
              unsubscribeUrl,
              siteUrl: SITE_URL,
              digestPeriod: "hourly",
            });
            const result = await sendEmail({
              to: recipientEmail,
              subject: rendered.subject,
              html: rendered.html,
              text: rendered.text,
            });
            if (result.ok) {
              const medIds = claimedEvents.map((e) => e.id);
              const { error: markErr } = await supabase
                .from("notification_events")
                .update({ email_sent_at: new Date().toISOString() })
                .in("id", medIds);
              if (markErr) {
                console.error(
                  "[notify-dispatch] mark-sent failed for",
                  medIds,
                  markErr,
                );
                // Recovery: clear batch claim so the rows can be retried next
                // run. Accepts a possible duplicate email but avoids permanent
                // dead-letter.
                await supabase
                  .from("notification_events")
                  .update({ email_batch_id: null })
                  .in("id", medIds);
                error_count++;
              } else {
                sent_count += claimedEvents.length;
              }
            } else {
              await supabase
                .from("notification_events")
                .update({ email_batch_id: null })
                .in(
                  "id",
                  claimedEvents.map((e) => e.id),
                )
                .eq("email_batch_id", batchId);
              error_count++;
              console.error(
                JSON.stringify({
                  run_id,
                  user_id,
                  stage: "resend_medium",
                  batch_id: batchId,
                  error: result.error,
                }),
              );
            }
          }
        }
      }
    }

    // --- Low severity: daily digest at user's digest_time_local ± 15 min ---
    if (lows.length > 0) {
      if (!prefs.email_digest_enabled) {
        const ids = lows.map((e) => e.id);
        const { error: markErr } = await supabase
          .from("notification_events")
          .update({ email_sent_at: new Date().toISOString() })
          .in("id", ids);
        if (markErr) {
          error_count++;
        } else {
          skipped_count += lows.length;
        }
      } else if (!inDigestWindow || inQuiet) {
        skipped_count += lows.length;
      } else {
        const batchId = crypto.randomUUID();
        const ids = lows.map((e) => e.id);
        const { data: claimed } = await supabase
          .from("notification_events")
          .update({ email_batch_id: batchId })
          .in("id", ids)
          .is("email_batch_id", null)
          .select("id");
        const claimedIds = new Set(
          (claimed as Array<{ id: string }> | null ?? []).map((r) => r.id),
        );
        const claimedEvents = lows.filter((e) => claimedIds.has(e.id));
        if (claimedEvents.length === 0) {
          skipped_count += lows.length;
        } else {
          const rendered = renderDigestHtml({
            locale,
            events: claimedEvents,
            recipientEmail,
            unsubscribeUrl,
            siteUrl: SITE_URL,
            digestPeriod: "daily",
          });
          const result = await sendEmail({
            to: recipientEmail,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          });
          if (result.ok) {
            const lowIds = claimedEvents.map((e) => e.id);
            const { error: markErr } = await supabase
              .from("notification_events")
              .update({ email_sent_at: new Date().toISOString() })
              .in("id", lowIds);
            if (markErr) {
              console.error(
                "[notify-dispatch] mark-sent failed for",
                lowIds,
                markErr,
              );
              // Recovery: clear batch claim so the rows can be retried next
              // run. Accepts a possible duplicate email but avoids permanent
              // dead-letter.
              await supabase
                .from("notification_events")
                .update({ email_batch_id: null })
                .in("id", lowIds);
              error_count++;
            } else {
              sent_count += claimedEvents.length;
            }
          } else {
            await supabase
              .from("notification_events")
              .update({ email_batch_id: null })
              .in(
                "id",
                claimedEvents.map((e) => e.id),
              )
              .eq("email_batch_id", batchId);
            error_count++;
            console.error(
              JSON.stringify({
                run_id,
                user_id,
                stage: "resend_low",
                batch_id: batchId,
                error: result.error,
              }),
            );
          }
        }
      }
    }

    totalSent += sent_count;
    totalSkipped += skipped_count;
    totalErrors += error_count;

    console.log(
      JSON.stringify({
        run_id,
        user_id,
        sent_count,
        skipped_count,
        error_count,
        in_quiet: inQuiet,
        tz: prefs.timezone,
      }),
    );
  }

  const summary = {
    run_id,
    users: byUser.size,
    events: events.length,
    sent: totalSent,
    skipped: totalSkipped,
    errors: totalErrors,
    ms: Date.now() - started,
  };
  console.log(JSON.stringify({ ...summary, msg: "run complete" }));

  return new Response(JSON.stringify({ ok: true, ...summary }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

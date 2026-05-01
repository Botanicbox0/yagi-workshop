import "server-only";
import { createSupabaseService } from "@/lib/supabase/service";
import { getResend, EMAIL_FROM } from "@/lib/resend";

type Locale = "ko" | "en";

function isLocale(v: string | null | undefined): v is Locale {
  return v === "ko" || v === "en";
}

function renderTemplate(opts: {
  locale: Locale;
  authorName: string;
  projectTitle: string;
  bodyPreview: string;
  projectUrl: string;
}) {
  const { locale, authorName, projectTitle, bodyPreview, projectUrl } = opts;
  if (locale === "ko") {
    return {
      subject: `[${projectTitle}] ${authorName}님의 새 메시지`,
      text:
        `${authorName}님이 프로젝트 "${projectTitle}"에 메시지를 남겼습니다.\n\n` +
        `"${bodyPreview}"\n\n` +
        `프로젝트 열기: ${projectUrl}\n\n` +
        `— YAGI Workshop`,
    };
  }
  return {
    subject: `[${projectTitle}] New message from ${authorName}`,
    text:
      `${authorName} sent a new message on project "${projectTitle}".\n\n` +
      `"${bodyPreview}"\n\n` +
      `Open project: ${projectUrl}\n\n` +
      `— YAGI Workshop`,
  };
}

/**
 * Fan out an email notification for a newly inserted SHARED thread message.
 * Must be called AFTER the insert has already succeeded.
 * Caller must not await the return value if it wants fire-and-forget;
 * this function never throws.
 *
 * @param messageId thread_messages.id of the just-inserted row
 */
export async function notifyNewMessage(messageId: string): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return; // no API key — silent no-op

    const admin = createSupabaseService();

    // 1. Load message + thread + project
    const { data: msg, error: msgErr } = await admin
      .from("thread_messages")
      .select(
        `id, body, visibility, author_id, thread_id,
         thread:project_threads!thread_id(id, project_id,
           project:projects!project_id(id, title, workspace_id))`
      )
      .eq("id", messageId)
      .maybeSingle();
    if (msgErr || !msg) return;
    if (msg.visibility !== "shared") return; // only shared triggers email

    // Unwrap possible array shape (Supabase sometimes returns FK joins as arrays)
    const thread = Array.isArray(msg.thread) ? msg.thread[0] : msg.thread;
    if (!thread) return;
    const project = Array.isArray(thread.project)
      ? thread.project[0]
      : thread.project;
    if (!project) return;

    // 2. Author display name
    // Phase 4.x Wave C.5b sub_08 — drop handle from user-facing fallback;
    // handle is internal (c_<random>) and not appropriate for emails.
    const { data: authorProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", msg.author_id)
      .maybeSingle();
    const authorName = authorProfile?.display_name ?? "Someone";

    // 3. Recipient set: workspace members + yagi admins, minus author
    const [membersRes, yagiRes] = await Promise.all([
      admin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", project.workspace_id),
      admin
        .from("user_roles")
        .select("user_id")
        .is("workspace_id", null)
        .eq("role", "yagi_admin"),
    ]);
    const recipientIds = new Set<string>();
    for (const r of membersRes.data ?? []) recipientIds.add(r.user_id);
    for (const r of yagiRes.data ?? []) recipientIds.add(r.user_id);
    recipientIds.delete(msg.author_id);
    if (recipientIds.size === 0) return;

    // 4. Recipient profiles (for locale)
    const recipientIdArray = Array.from(recipientIds);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, locale, display_name")
      .in("id", recipientIdArray);
    const profileById = new Map(
      (profiles ?? []).map((p) => [p.id, p] as const)
    );

    // 5. Resolve emails via auth admin API — one call per user (Supabase has no bulk getUserById)
    const emails = await Promise.all(
      recipientIdArray.map(async (uid) => {
        const { data } = await admin.auth.admin.getUserById(uid);
        return {
          user_id: uid,
          email: data?.user?.email ?? null,
        };
      })
    );

    // 6. Preview + URL
    const rawBody = msg.body ?? "";
    const bodyPreview =
      rawBody.length > 240 ? `${rawBody.slice(0, 240)}…` : rawBody;
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";

    // 7. Send per recipient, respecting their locale
    await Promise.all(
      emails.map(async ({ user_id, email }) => {
        if (!email) return;
        const profile = profileById.get(user_id);
        const locale: Locale = isLocale(profile?.locale) ? profile!.locale as Locale : "en";
        const projectUrl = `${baseUrl}/${locale}/app/projects/${project.id}`;
        const { subject, text } = renderTemplate({
          locale,
          authorName,
          projectTitle: project.title ?? "Untitled",
          bodyPreview,
          projectUrl,
        });
        try {
          await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject,
            text,
          });
        } catch (err) {
          console.error("[notifyNewMessage] resend failure", {
            user_id,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      })
    );
  } catch (err) {
    console.error(
      "[notifyNewMessage] unexpected error",
      err instanceof Error ? err.message : String(err)
    );
  }
}

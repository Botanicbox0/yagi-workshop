import "server-only";

// Phase 3.0 task_04 — Resend helpers for project lifecycle emails.
//
// Both helpers are best-effort (fire-and-forget). Callers MUST NOT await and
// expect these to block the happy path — they should catch and log internally.
//
// Uses React Email render() to convert JSX → HTML string, then sends via
// the existing getResend() singleton and EMAIL_FROM constant.

import { render } from "@react-email/render";
import { createElement } from "react";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { ProjectSubmittedAdmin } from "@/emails/projects/project_submitted_admin";
import { ProjectSubmittedClient } from "@/emails/projects/project_submitted_client";
import type { ProjectSubmittedAdminProps } from "@/emails/projects/project_submitted_admin";
import type { ProjectSubmittedClientProps } from "@/emails/projects/project_submitted_client";

/**
 * Send the admin notification email for a newly submitted project.
 * Best-effort: logs on failure, never throws.
 */
export async function sendProjectSubmittedAdmin(
  args: ProjectSubmittedAdminProps & { to: string }
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;

    const { to, ...templateProps } = args;
    const html = await render(
      createElement(ProjectSubmittedAdmin, templateProps)
    );
    const subject =
      templateProps.locale === "ko"
        ? `[신규 프로젝트] ${templateProps.clientName} 님이 의뢰를 보냈습니다`
        : `[New project] ${templateProps.clientName} submitted ${templateProps.projectName}`;

    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(
      "[email/project] sendProjectSubmittedAdmin failure",
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Send the client confirmation email after project submission.
 * Best-effort: logs on failure, never throws.
 */
export async function sendProjectSubmittedClient(
  args: ProjectSubmittedClientProps & { to: string }
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;

    const { to, ...templateProps } = args;
    const html = await render(
      createElement(ProjectSubmittedClient, templateProps)
    );
    const subject =
      templateProps.locale === "ko"
        ? "의뢰를 잘 받았습니다 — YAGI Workshop"
        : "We received your project — YAGI Workshop";

    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(
      "[email/project] sendProjectSubmittedClient failure",
      err instanceof Error ? err.message : String(err)
    );
  }
}

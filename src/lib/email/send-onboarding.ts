import "server-only";

import { getResend, EMAIL_FROM } from "@/lib/resend";
import {
  welcomeEmailSubject,
  welcomeEmailBody,
  type WelcomeEmailContext,
} from "./templates/signup-welcome";
import {
  roleConfirmationSubject,
  roleConfirmationBody,
  type RoleConfirmationContext,
} from "./templates/role-confirmation";

/**
 * Fire-and-forget welcome email dispatch at Phase 2.5 onboarding completion.
 * Silent no-op when RESEND_API_KEY is not set. Errors are logged, never thrown.
 */
export async function sendWelcomeEmail(
  to: string,
  ctx: WelcomeEmailContext
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: welcomeEmailSubject(ctx),
      html: welcomeEmailBody(ctx),
    });
  } catch (err) {
    console.error(
      "[sendWelcomeEmail] failure",
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Fire-and-forget role change confirmation email. Silent no-op when
 * RESEND_API_KEY missing. Errors are logged, never thrown.
 */
export async function sendRoleConfirmationEmail(
  to: string,
  ctx: RoleConfirmationContext
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: roleConfirmationSubject(ctx),
      html: roleConfirmationBody(ctx),
    });
  } catch (err) {
    console.error(
      "[sendRoleConfirmationEmail] failure",
      err instanceof Error ? err.message : String(err)
    );
  }
}

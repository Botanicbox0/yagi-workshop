// Role confirmation email template — Phase 2.5 G2 role change flow.
//
// Sent when user changes profiles.role (Observer ↔ Creator ↔ Studio).
// Per SPEC v2 §1: "Creator ↔ Studio (free, one direction per 30 days)"
// — confirmation provides paper trail.

import type { ProfileRole } from "@/lib/app/context";

export type RoleConfirmationContext = {
  handle: string;
  display_name: string;
  oldRole: ProfileRole | null;
  newRole: ProfileRole;
};

const ROLE_LABEL_KO: Record<ProfileRole, string> = {
  creator: "AI 창작자",
  studio: "AI 스튜디오",
  observer: "관람자",
};

export function roleConfirmationSubject(ctx: RoleConfirmationContext): string {
  const newLabel = ROLE_LABEL_KO[ctx.newRole];
  return `${ctx.display_name}님의 역할이 ${newLabel}(으)로 변경되었습니다`;
}

export function roleConfirmationBody(ctx: RoleConfirmationContext): string {
  const oldLabel = ctx.oldRole ? ROLE_LABEL_KO[ctx.oldRole] : "신규 가입";
  const newLabel = ROLE_LABEL_KO[ctx.newRole];
  const profileLink = `https://yagiworkshop.xyz/u/${ctx.handle}`;

  const cooldownNote =
    (ctx.oldRole === "creator" && ctx.newRole === "studio") ||
    (ctx.oldRole === "studio" && ctx.newRole === "creator")
      ? `<p>다음 역할 변경은 30일 후부터 가능합니다.</p>`
      : "";

  return `
<p>안녕하세요, ${ctx.display_name}님.</p>
<p>역할이 <strong>${oldLabel}</strong>에서 <strong>${newLabel}</strong>(으)로 변경되었습니다.</p>
<p>
  <a href="${profileLink}">프로필 확인</a>
</p>
${cooldownNote}
<p>변경하지 않으셨다면 즉시 hello@yagiworkshop.xyz로 알려주세요.</p>
<p>야기워크숍 드림</p>
`.trim();
}

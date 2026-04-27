// =============================================================================
// Phase 2.8.2 G_B2_F — /[locale]/commission deprecated
// =============================================================================
// Founder decision (Phase 2.8.2 SPEC §7): "이건 랜딩페이지로 편향될
// 사이트임. 삭제해도 됨." The Phase 2.7.2 funnel split that introduced a
// dedicated public commission page is rolled back — the workshop home
// page (`/[locale]`) carries the full landing surface, and authenticated
// users go through `/[locale]/app/projects` for actual project intake.
//
// External backlinks to /commission (if any historical bookmarks exist)
// resolve to home via a 308 permanent redirect; this is reversible should
// the funnel decision change. The /[locale]/commission/* directory tree
// is otherwise empty so no nested route conflicts.
//
// i18n keys under the "commission" namespace are kept in messages/*.json
// for one phase to avoid build breaks in unrelated callers (e.g.,
// admin_commission queue still references shared copy). They are marked
// for removal in Phase 3.0 alongside the contest_voters work.
// =============================================================================

import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CommissionDeprecatedRedirect({ params }: Props) {
  const { locale } = await params;
  permanentRedirect(`/${locale}`);
}

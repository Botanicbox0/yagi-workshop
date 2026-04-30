// Phase 4.x task_05 — /app default landing redirect to /app/dashboard.
//
// Phase 2 routed clients to /app/commission (now redirected to /app/projects)
// and other workspace members to a Projects empty-state. Phase 4
// flattens this: every authenticated user lands on /app/dashboard
// (Brand workspace dashboard with count cards + recent RFPs).
//
// yagi_admin / creator / etc. can navigate to their persona-specific
// surfaces (admin queue, creator console) from the sidebar.

import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AppLandingPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/app/dashboard`);
}

Phase 7 Wave B — K-05 (Tier 1 HIGH, sponsor request entry + admin approval workflow).

Wave B introduces the first authenticated-write path on the `campaigns` table from a non-admin role (sponsor INSERT via session client, RLS-bound). It also adds 4 admin status-transition actions that route through service-role, and a notification fan-out path. Adversarial focus = exploitability of the new sponsor INSERT path + correctness of the 4-action state machine.

Single commit on g-b-10-phase-7: `c820056` (13 files, +1875/-53).

## Files in scope

### B.1 — Sponsor request entry (HIGH)
- `src/app/[locale]/app/campaigns/_actions/request-campaign-action.ts` — NEW. requestCampaignAction (session client INSERT into campaigns, RLS WITH CHECK + column-level GRANT enforce row+column lockdown).
- `src/app/[locale]/app/campaigns/request/page.tsx` — NEW. Resolves active workspace, kind-eligibility guard (brand/artist), fetches own past requests via campaigns_select_sponsor RLS.
- `src/app/[locale]/app/campaigns/request/request-form.tsx` — NEW client form.
- `src/app/[locale]/app/campaigns/request/own-requests-list.tsx` — NEW server component listing own past requests + decision_metadata note preview.
- `src/components/app/sidebar.tsx` — threads activeWorkspace.kind to SidebarNav.
- `src/components/app/sidebar-nav.tsx` — adds [+ 캠페인 요청] CTA visible when activeWorkspaceKind IN ('brand','artist').

### B.2 — Admin queue + approval (HIGH)
- `src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts` — adds reviewCampaignRequestAction / approveCampaignRequestAction / declineCampaignRequestAction / requestMoreInfoAction. All service-role, all admin-gated, all append decision_metadata.history audit entry, all emit sponsor notification.
- `src/app/[locale]/app/admin/campaigns/page.tsx` — adds requested/in_review/declined to STATUS_VALUES + sponsor column with workspace name + contact phone preview.
- `src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx` — NEW. Server component renders request payload + decision history.
- `src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx` — NEW client component, dispatches one of 4 admin actions per current status.

### B.shared — Notifications + i18n
- `src/lib/notifications/kinds.ts` — adds 5 NotificationKind: campaign_request_received, campaign_request_in_review, campaign_request_approved, campaign_request_declined, campaign_request_more_info.
- `messages/{ko,en}.json` — adds campaign_request namespace + admin_campaigns.review subtree + 5 notification event templates + nav.request_campaign_cta + admin_campaigns.status_{requested,in_review,declined}.

## L-049 4-perspective audit (MANDATORY, verbatim binding)

Walk USING + WITH CHECK from each role separately for `requestCampaignAction` (the only new sponsor-side INSERT path):

  1. As `client` (auth.uid() = self, no admin role, member of a brand/artist workspace) — owner-only path. Confirm WITH CHECK on `campaigns_insert_sponsor` enforces:
     - status = 'requested'
     - created_by = auth.uid() (no forging another user's authorship)
     - sponsor_workspace_id IS NOT NULL
     - has_external_sponsor = false (sponsor must not seed admin-write column)
     - external_sponsor_name IS NULL
     - decision_metadata IS NULL
     - submission_open_at / close_at / distribution_starts_at all NULL
     - workspace_member of sponsor_workspace_id AND workspace.kind IN ('brand','artist')
     Confirm column-level INSERT GRANT (REVOKE INSERT FROM authenticated; GRANT INSERT (slug, title, description, brief, reference_assets, sponsor_workspace_id, status, request_metadata, created_by, updated_at) TO authenticated) blocks any other column. Walk every column the action passes to .insert(): {slug, title, brief, reference_assets, sponsor_workspace_id, status:'requested', request_metadata, created_by, updated_at}. Confirm zero overlap with REVOKE'd columns.

  2. As `ws_admin` (workspace_admin role for the sponsor_workspace) — same path, no special privilege expected. RLS does not distinguish ws_admin from member here. Confirm.

  3. As `yagi_admin` (cross-workspace admin) — would also satisfy `campaigns_insert_admin` policy. Action layer always uses session client (not service-role) so admin can also call this path. Acceptable? Or should admin be excluded since they have /admin/campaigns/new? Flag if ambiguous.

  4. As `different-user same-workspace` (e.g., another workspace_member, different auth.uid()) — confirm `created_by = auth.uid()` WITH CHECK denies forging the original requester's row. Confirm RLS auto-filters out rows whose `sponsor_workspace_id` they're not a member of in the SELECT path used by `/app/campaigns/request` own-requests list (campaigns_select_sponsor membership check).

For each WAVE B status-transition action (4 actions, all service-role):
- reviewCampaignRequestAction (requested → in_review)
- approveCampaignRequestAction (in_review → draft)
- declineCampaignRequestAction (in_review → declined)
- requestMoreInfoAction (in_review → requested)

Walk:
  (a) is_yagi_admin gate before service-role write — getAuthenticatedAdmin() in transitionRequestStatus (campaign-actions.ts).
  (b) Source-state guard via requireFromStatus[] — confirm a sponsor cannot trick admin into approving a 'declined' or 'draft' campaign by URL manipulation. (The page is admin-gated already, but defense-in-depth on the action.)
  (c) decision_metadata.history append — confirm prior history is preserved (not overwritten) when adding new entry. Walk appendHistory().
  (d) Notification recipient = `created_by` (original requester, preserved across workspace switches). Confirm.

## Adversarial focus areas (Tier 1 HIGH)

1. **Sponsor INSERT bypass attempts**:
   - Can a sponsor seed `decision_metadata` directly via the request_metadata payload? (request_metadata is a separate column; confirm the action layer doesn't accidentally write to decision_metadata from request input.)
   - Can a sponsor seed `compensation_model` / `allow_r2_upload` / etc by passing extra fields? (Zod schema on action input is whitelisted; column GRANT is whitelisted. Walk both layers.)
   - Slug collision: `generateSlug` uses time suffix; collision probability low but non-zero. Conflict handling on retry?
   - request_metadata.contact_phone: stored verbatim. PII concern? It's only visible to sponsor + yagi_admin per RLS; surface in admin review page is intended. OK?

2. **Sidebar workspace.kind gating bypass**:
   - The CTA visibility is gated by activeWorkspaceKind in the client component. Can a creator workspace user manually navigate to /app/campaigns/request and submit?
   - The page itself has a server-side guard (active.kind check) that shows guard_not_eligible message instead of the form. But if the creator opens devtools and POSTs to requestCampaignAction directly, the action's defense-in-depth membership precheck + RLS WITH CHECK both catch it. Walk.
   - Cookie tampering: yagi_active_workspace cookie. resolveActiveWorkspace validates membership against workspace_members. Confirm a forged cookie pointing to a workspace the user is NOT a member of falls back to first-membership instead of trusting the cookie.

3. **Admin transition state-machine consistency**:
   - The 4 transitions are: requested → in_review → {draft, declined, requested}. After 'requested' (via more_info), admin can re-enter the cycle. Is this loop bounded?
   - Source-state validation: requireFromStatus rejects bad source. But if two admins transition concurrently (admin1: requested→in_review, admin2: requested→in_review), is there an idempotency / racing concern? Optimistic locking?
   - decision_metadata.history grows unbounded across loops. Pruning policy? (Acceptable for MVP; flag if you think jsonb size could become problematic.)

4. **Notification fan-out**:
   - emitNotification recipient = created_by user (always). Workspace context = sponsor_workspace_id. If the original requester has been removed from the workspace (membership revoked between request submission and admin decision), the notification still fires but the in-app bell may not surface it (workspace filter). Acceptable for MVP? Flag if notification storage + visibility split is concerning.
   - Notification template lookup: 5 new kinds added to messages.notifications.events.<kind>. Confirm KO + EN templates present + parameterized correctly ({title} placeholder).

5. **Service-role usage in transition actions**:
   - All 4 admin transitions use createSupabaseService() because campaigns.status + decision_metadata are admin-only (column-level GRANT lockdown). The is_yagi_admin gate in getAuthenticatedAdmin() runs FIRST, then service-role write. Walk: any path where service-role write happens without admin gate? (No, transitionRequestStatus calls getAuthenticatedAdmin() at top.)

6. **i18n wording cross-check (binding)**:
   - campaign_request namespace KO values + admin_campaigns.review KO values + 5 new notification event KO templates — walk each, flag any English internal term ("Sponsor"/"Submission"/"Track"/"Roster"/"Distribution"/"RFP"/"Bypass"/"Routing"/"Type N").
   - EN side: confirm "Sponsor" English-noun is NOT exposed. The Builder renamed Sponsorship→Funding for compensation intent labels (sponsorship_self → "Self-funded", sponsorship_co_sponsor → "Shared funding"). Confirm "Sponsor" capitalized as English noun appears 0 times in user-facing values across all new keys.
   - Channel brand names (TikTok/Instagram/YouTube/X) are exempt per yagi-wording-rules (proper nouns).

7. **Page guard correctness**:
   - /app/campaigns/request page: if active workspace kind is 'creator' or 'yagi_admin', renders guard_not_eligible card instead of form. Confirm no leak of workspace data in the guard path.
   - /admin/campaigns/[id]/review page: server component fetches via service-role. If a non-admin somehow reaches the page (defense-in-depth), the action would still reject. But the page itself fetches sensitive request_metadata (contact phone). Confirm notFound() gate fires before any data fetch.

## Already-deferred (do NOT flag)

- Wave C scope: workspaces.kind 'creator' addition, /campaigns/[slug]/submit form, magic-link auto-creation of creator workspace.
- Wave D scope: admin 검수 of submissions, distribution tracking.
- Roster funnel UI (Phase 8).
- Compensation 정산 logic (Phase 11).
- A.1 schema findings (LOOP-3 CLEAN, in prod).
- A.2/A.3/A.4 findings (Wave A K-05 already covered).
- The pre-existing project_detail.timeline.routing = "Routing" en.json:1733 finding (HF4 carry-over, Phase 8 FU registered).

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding (HIGH or MED only — LOW deferred to FU):
[FINDING N] CLASS: <HIGH-A|HIGH-B|HIGH-C|MED-A|MED-B|MED-C>: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave B sponsor request + admin approval workflow ready for K-06 + Wave C dispatch."

End with one-line summary.

=== END OF PROMPT — DIFF FOLLOWS ===

diff --git a/src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx b/src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx
new file mode 100644
index 0000000..a02c808
--- /dev/null
+++ b/src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx
@@ -0,0 +1,254 @@
+// Phase 7 Wave B.2 — /admin/campaigns/[id]/review
+//
+// Admin reviews a sponsor-submitted campaign request. Shows the request
+// payload (request_metadata) + sponsor identity + decision history, and
+// renders the 4-action ReviewActions client component.
+//
+// Auth gate: notFound for non-yagi_admin (defense-in-depth on top of layout).
+
+import { notFound } from "next/navigation";
+import { getTranslations } from "next-intl/server";
+import { Link } from "@/i18n/routing";
+import { createSupabaseServer } from "@/lib/supabase/server";
+import { createSupabaseService } from "@/lib/supabase/service";
+import { ReviewActions } from "./review-actions";
+
+type Props = {
+  params: Promise<{ locale: string; id: string }>;
+};
+
+type ReferenceAsset = { url: string; label: string };
+type RequestMetadataShape = {
+  contact_phone?: string;
+  schedule_intent?: string;
+  sponsorship_intent?: string;
+  compensation_intent?: string;
+  compensation_fixed_fee_per_creator?: number;
+  notes?: string;
+};
+type DecisionHistoryEntry = {
+  at: string;
+  by: string;
+  action: string;
+  comment: string | null;
+};
+type DecisionMetadataShape = {
+  history?: DecisionHistoryEntry[];
+  note?: string | null;
+};
+
+function fmtDateTime(iso: string, locale: string): string {
+  return new Intl.DateTimeFormat(locale, {
+    year: "numeric",
+    month: "2-digit",
+    day: "2-digit",
+    hour: "2-digit",
+    minute: "2-digit",
+  }).format(new Date(iso));
+}
+
+function fieldRow(
+  label: string,
+  value: React.ReactNode,
+): React.ReactNode {
+  return (
+    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4 py-3 border-b border-border last:border-0">
+      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5">
+        {label}
+      </dt>
+      <dd className="text-sm text-foreground keep-all leading-relaxed whitespace-pre-wrap">
+        {value}
+      </dd>
+    </div>
+  );
+}
+
+export default async function AdminCampaignReviewPage({ params }: Props) {
+  const { id, locale } = await params;
+
+  const supabase = await createSupabaseServer();
+  const {
+    data: { user },
+  } = await supabase.auth.getUser();
+  if (!user) notFound();
+
+  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
+  if (!isAdmin) notFound();
+
+  const t = await getTranslations("admin_campaigns");
+
+  // Fetch campaign + sponsor workspace via service-role
+  const sbAdmin = createSupabaseService();
+  const { data: campaign, error } = await sbAdmin
+    .from("campaigns")
+    .select(
+      `id, title, brief, status, created_at, reference_assets,
+       sponsor_workspace_id, request_metadata, decision_metadata,
+       sponsor_workspace:workspaces!sponsor_workspace_id(id, name, kind)`,
+    )
+    .eq("id", id)
+    .maybeSingle();
+
+  if (error || !campaign) notFound();
+
+  const isRequestStage =
+    campaign.status === "requested" ||
+    campaign.status === "in_review" ||
+    campaign.status === "declined";
+
+  const reqMeta = (campaign.request_metadata ?? null) as RequestMetadataShape | null;
+  const decisionMeta = (campaign.decision_metadata ?? null) as DecisionMetadataShape | null;
+  const refAssets = Array.isArray(campaign.reference_assets)
+    ? (campaign.reference_assets as unknown as ReferenceAsset[])
+    : [];
+  const sponsor = (campaign as { sponsor_workspace?: { name?: string; kind?: string } | null })
+    .sponsor_workspace ?? null;
+
+  function compensationLabel(intent?: string): string {
+    if (intent === "exposure_only") return t("review.compensation_exposure_only");
+    if (intent === "fixed_fee") return t("review.compensation_fixed_fee");
+    return t("review.no_metadata");
+  }
+
+  function sponsorshipLabel(intent?: string): string {
+    if (intent === "self") return t("review.sponsorship_self");
+    if (intent === "co_sponsor") return t("review.sponsorship_co_sponsor");
+    if (intent === "yagi_assist") return t("review.sponsorship_yagi_assist");
+    return t("review.no_metadata");
+  }
+
+  return (
+    <div className="px-6 md:px-10 py-12 max-w-3xl space-y-10">
+      {/* Header */}
+      <div className="space-y-3">
+        <Link
+          href="/app/admin/campaigns?status=requested"
+          className="text-xs text-muted-foreground hover:underline underline-offset-2"
+        >
+          {t("review.back_to_list")}
+        </Link>
+        <h1 className="font-display text-3xl md:text-4xl tracking-tight leading-[1.1] keep-all">
+          {t("review.page_title")}
+        </h1>
+      </div>
+
+      {!isRequestStage && (
+        <div className="rounded-[24px] border border-border bg-muted/30 p-6">
+          <p className="text-sm text-muted-foreground keep-all leading-relaxed">
+            {t("review.guard_not_request_stage")}
+          </p>
+          <Link
+            href={`/app/admin/campaigns/${campaign.id}`}
+            className="text-sm text-foreground hover:underline underline-offset-2 mt-3 inline-block"
+          >
+            {t("edit_cta")} →
+          </Link>
+        </div>
+      )}
+
+      {/* Request payload */}
+      <section className="rounded-[24px] border border-border bg-card p-6 md:p-8">
+        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
+          {t("review.request_metadata_title")}
+        </h2>
+        <dl>
+          {fieldRow(t("review.field_title"), campaign.title)}
+          {fieldRow(
+            t("review.field_brief"),
+            campaign.brief ?? t("review.no_metadata"),
+          )}
+          {fieldRow(
+            t("review.field_sponsor"),
+            sponsor?.name ?? t("sponsor_self_host"),
+          )}
+          {fieldRow(
+            t("review.field_contact_phone"),
+            reqMeta?.contact_phone ?? t("review.no_metadata"),
+          )}
+          {fieldRow(
+            t("review.field_schedule_intent"),
+            reqMeta?.schedule_intent ?? t("review.no_metadata"),
+          )}
+          {fieldRow(
+            t("review.field_sponsorship_intent"),
+            sponsorshipLabel(reqMeta?.sponsorship_intent),
+          )}
+          {fieldRow(
+            t("review.field_compensation_intent"),
+            compensationLabel(reqMeta?.compensation_intent),
+          )}
+          {reqMeta?.compensation_intent === "fixed_fee" && reqMeta.compensation_fixed_fee_per_creator
+            ? fieldRow(
+                t("review.field_compensation_fixed_fee"),
+                new Intl.NumberFormat(locale).format(
+                  reqMeta.compensation_fixed_fee_per_creator,
+                ) + " KRW",
+              )
+            : null}
+          {fieldRow(
+            t("review.field_notes"),
+            reqMeta?.notes ?? t("review.no_metadata"),
+          )}
+          {fieldRow(
+            t("review.field_reference_assets"),
+            refAssets.length === 0 ? (
+              t("review.no_metadata")
+            ) : (
+              <ul className="space-y-1">
+                {refAssets.map((a, idx) => (
+                  <li key={idx}>
+                    <a
+                      href={a.url}
+                      target="_blank"
+                      rel="noopener noreferrer"
+                      className="text-foreground hover:underline underline-offset-2 break-all"
+                    >
+                      {a.label || a.url}
+                    </a>
+                  </li>
+                ))}
+              </ul>
+            ),
+          )}
+          {fieldRow(t("review.field_created_at"), fmtDateTime(campaign.created_at, locale))}
+        </dl>
+      </section>
+
+      {/* Decision history */}
+      {decisionMeta?.history && decisionMeta.history.length > 0 && (
+        <section className="rounded-[24px] border border-border bg-card p-6 md:p-8">
+          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
+            {t("review.field_decision_history")}
+          </h2>
+          <ol className="space-y-3">
+            {decisionMeta.history.map((entry, idx) => (
+              <li
+                key={idx}
+                className="border-l-2 border-border pl-4 py-1 space-y-1"
+              >
+                <div className="flex items-baseline gap-2">
+                  <span className="text-xs font-medium text-foreground">
+                    {entry.action}
+                  </span>
+                  <span className="text-[11px] text-muted-foreground tabular-nums">
+                    {fmtDateTime(entry.at, locale)}
+                  </span>
+                </div>
+                {entry.comment && (
+                  <p className="text-sm text-muted-foreground keep-all leading-relaxed whitespace-pre-wrap">
+                    {entry.comment}
+                  </p>
+                )}
+              </li>
+            ))}
+          </ol>
+        </section>
+      )}
+
+      {/* Actions */}
+      {isRequestStage && (
+        <ReviewActions campaignId={campaign.id} status={campaign.status} />
+      )}
+    </div>
+  );
+}
diff --git a/src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx b/src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx
new file mode 100644
index 0000000..bcfc284
--- /dev/null
+++ b/src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx
@@ -0,0 +1,207 @@
+"use client";
+
+// Phase 7 Wave B.2 — Admin review action buttons.
+//
+// Available actions depend on the current status:
+//   requested   → [Start review]
+//   in_review   → [Approve], [Decline (note required)], [Request more info (note required)]
+//   declined    → none (terminal state; admin can re-create from scratch)
+//
+// Each action: optional/required note → server action → toast → router.refresh()
+
+import { useState, useTransition } from "react";
+import { useRouter } from "next/navigation";
+import { useTranslations } from "next-intl";
+import { toast } from "sonner";
+import { Button } from "@/components/ui/button";
+import { Label } from "@/components/ui/label";
+import { Textarea } from "@/components/ui/textarea";
+import {
+  reviewCampaignRequestAction,
+  approveCampaignRequestAction,
+  declineCampaignRequestAction,
+  requestMoreInfoAction,
+} from "../../_actions/campaign-actions";
+
+type Action = "review" | "approve" | "decline" | "more_info";
+
+export function ReviewActions({
+  campaignId,
+  status,
+}: {
+  campaignId: string;
+  status: string;
+}) {
+  const router = useRouter();
+  const t = useTranslations("admin_campaigns.review");
+  const [comment, setComment] = useState("");
+  const [pendingAction, setPendingAction] = useState<Action | null>(null);
+  const [isPending, startTransition] = useTransition();
+
+  function run(action: Action) {
+    setPendingAction(action);
+    startTransition(async () => {
+      const trimmed = comment.trim();
+      const arg = trimmed.length > 0 ? trimmed : undefined;
+
+      let result: { ok: true } | { ok: false; error: string };
+      switch (action) {
+        case "review":
+          result = await reviewCampaignRequestAction(campaignId, arg);
+          break;
+        case "approve":
+          result = await approveCampaignRequestAction(campaignId, arg);
+          break;
+        case "decline":
+          result = await declineCampaignRequestAction(campaignId, arg);
+          break;
+        case "more_info":
+          result = await requestMoreInfoAction(campaignId, arg);
+          break;
+      }
+
+      setPendingAction(null);
+
+      if (!result.ok) {
+        if (result.error === "comment_required") {
+          toast.error(t("toast_decline_comment_required"));
+        } else {
+          toast.error(t("toast_error"));
+        }
+        return;
+      }
+
+      switch (action) {
+        case "review":
+          toast.success(t("toast_review_started"));
+          break;
+        case "approve":
+          toast.success(t("toast_approved"));
+          break;
+        case "decline":
+          toast.success(t("toast_declined"));
+          break;
+        case "more_info":
+          toast.success(t("toast_more_info_requested"));
+          break;
+      }
+      setComment("");
+      router.refresh();
+    });
+  }
+
+  const actionsForStatus =
+    status === "requested"
+      ? (["review"] as Action[])
+      : status === "in_review"
+        ? (["approve", "decline", "more_info"] as Action[])
+        : ([] as Action[]);
+
+  if (actionsForStatus.length === 0) return null;
+
+  return (
+    <section className="rounded-[24px] border border-border bg-card p-6 md:p-8 space-y-6">
+      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
+        {t("actions_title")}
+      </h2>
+
+      {/* Comment */}
+      <div className="space-y-2">
+        <Label htmlFor="review_comment">{t("comment_label")}</Label>
+        <Textarea
+          id="review_comment"
+          value={comment}
+          onChange={(e) => setComment(e.target.value)}
+          placeholder={t("comment_placeholder")}
+          rows={4}
+          maxLength={2000}
+          className="rounded-[12px]"
+        />
+      </div>
+
+      {/* Action buttons */}
+      <div className="flex flex-wrap gap-3">
+        {actionsForStatus.includes("review") && (
+          <ActionButton
+            label={t("action_review")}
+            helper={t("action_review_helper")}
+            disabled={isPending}
+            isLoading={isPending && pendingAction === "review"}
+            onClick={() => run("review")}
+            variant="primary"
+          />
+        )}
+        {actionsForStatus.includes("approve") && (
+          <ActionButton
+            label={t("action_approve")}
+            helper={t("action_approve_helper")}
+            disabled={isPending}
+            isLoading={isPending && pendingAction === "approve"}
+            onClick={() => run("approve")}
+            variant="primary"
+          />
+        )}
+        {actionsForStatus.includes("more_info") && (
+          <ActionButton
+            label={t("action_more_info")}
+            helper={t("action_more_info_helper")}
+            disabled={isPending}
+            isLoading={isPending && pendingAction === "more_info"}
+            onClick={() => run("more_info")}
+            variant="outline"
+          />
+        )}
+        {actionsForStatus.includes("decline") && (
+          <ActionButton
+            label={t("action_decline")}
+            helper={t("action_decline_helper")}
+            disabled={isPending}
+            isLoading={isPending && pendingAction === "decline"}
+            onClick={() => run("decline")}
+            variant="ghost"
+          />
+        )}
+      </div>
+    </section>
+  );
+}
+
+function ActionButton({
+  label,
+  helper,
+  onClick,
+  disabled,
+  isLoading,
+  variant,
+}: {
+  label: string;
+  helper: string;
+  onClick: () => void;
+  disabled: boolean;
+  isLoading: boolean;
+  variant: "primary" | "outline" | "ghost";
+}) {
+  const style =
+    variant === "primary"
+      ? { backgroundColor: "#71D083", color: "#000" }
+      : undefined;
+  const buttonVariant =
+    variant === "primary" ? "default" : variant === "outline" ? "outline" : "ghost";
+  return (
+    <div className="flex flex-col gap-1.5 max-w-[280px]">
+      <Button
+        type="button"
+        size="pill"
+        variant={buttonVariant}
+        onClick={onClick}
+        disabled={disabled}
+        style={style}
+      >
+        {isLoading ? "..." : label}
+      </Button>
+      <p className="text-[11px] text-muted-foreground keep-all leading-snug">
+        {helper}
+      </p>
+    </div>
+  );
+}
diff --git a/src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts b/src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts
new file mode 100644
index 0000000..05423b5
--- /dev/null
+++ b/src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts
@@ -0,0 +1,628 @@
+"use server";
+
+// Phase 7 Wave A.2 — Admin campaign server actions
+//
+// Auth gate: every action calls getAuthenticatedAdmin() first.
+// Uses service-role client for writes so RLS column-level grant on
+// campaigns.status (yagi_admin only) doesn't block admin writes.
+// The is_yagi_admin RPC is called via the session client (not service)
+// so the check runs in the caller's auth context.
+
+import { revalidatePath } from "next/cache";
+import { z } from "zod";
+import { createSupabaseServer } from "@/lib/supabase/server";
+import { createSupabaseService } from "@/lib/supabase/service";
+import { emitNotification } from "@/lib/notifications/emit";
+import type { NotificationKind } from "@/lib/notifications/kinds";
+import type { Database, Json } from "@/lib/supabase/database.types";
+
+type CampaignUpdate = Database["public"]["Tables"]["campaigns"]["Update"];
+
+// ---------------------------------------------------------------------------
+// Zod schemas for JSONB fields (K-05 MED-A inline fix)
+// ---------------------------------------------------------------------------
+
+const ReferenceAssetSchema = z.object({
+  url: z.string().url(),
+  label: z.string().min(1).max(200),
+});
+
+const ReferenceAssetsSchema = z
+  .array(ReferenceAssetSchema)
+  .max(20);
+
+/** Base compensation metadata — flat record, no nested objects */
+const CompensationMetadataBaseSchema = z.record(
+  z.string(),
+  z.union([z.string(), z.number(), z.boolean()])
+);
+
+/** Shaped validation: fixed_fee model requires fixed_fee_per_creator */
+function validateCompensationMetadata(
+  model: string | undefined,
+  raw: Record<string, unknown> | null | undefined
+): { ok: true } | { ok: false; error: string } {
+  if (raw === null || raw === undefined) return { ok: true };
+
+  const baseResult = CompensationMetadataBaseSchema.safeParse(raw);
+  if (!baseResult.success) {
+    return { ok: false, error: "compensation_metadata_invalid" };
+  }
+
+  if (model === "fixed_fee") {
+    const feeResult = z
+      .object({ fixed_fee_per_creator: z.number().positive() })
+      .safeParse(raw);
+    if (!feeResult.success) {
+      return {
+        ok: false,
+        error: "compensation_metadata_fixed_fee_per_creator_required",
+      };
+    }
+  }
+
+  return { ok: true };
+}
+
+// ---------------------------------------------------------------------------
+// Shared types
+// ---------------------------------------------------------------------------
+
+export type ReferenceAsset = {
+  url: string;
+  label: string;
+};
+
+export type CategoryInput = {
+  name: string;
+  description?: string;
+  format_spec?: string;
+};
+
+export type CompensationModel = "exposure_only" | "fixed_fee" | "royalty_share";
+
+export type CreateCampaignInput = {
+  title: string;
+  description?: string;
+  brief?: string;
+  reference_assets?: ReferenceAsset[];
+  categories: CategoryInput[];
+  allow_r2_upload: boolean;
+  allow_external_url: boolean;
+  compensation_model: CompensationModel;
+  compensation_metadata?: Record<string, unknown>;
+  submission_open_at?: string | null;
+  submission_close_at?: string | null;
+};
+
+export type UpdateCampaignInput = {
+  title?: string;
+  description?: string | null;
+  brief?: string | null;
+  reference_assets?: ReferenceAsset[];
+  allow_r2_upload?: boolean;
+  allow_external_url?: boolean;
+  compensation_model?: CompensationModel;
+  compensation_metadata?: Record<string, unknown> | null;
+  submission_open_at?: string | null;
+  submission_close_at?: string | null;
+};
+
+// ---------------------------------------------------------------------------
+// Auth helper
+// ---------------------------------------------------------------------------
+
+async function getAuthenticatedAdmin(): Promise<
+  | { ok: true; userId: string }
+  | { ok: false; error: string }
+> {
+  const supabase = await createSupabaseServer();
+  const {
+    data: { user },
+  } = await supabase.auth.getUser();
+  if (!user) return { ok: false, error: "unauthorized" };
+
+  const { data: isAdmin, error: rpcErr } = await supabase.rpc("is_yagi_admin", {
+    uid: user.id,
+  });
+  if (rpcErr || !isAdmin) return { ok: false, error: "not_admin" };
+
+  return { ok: true, userId: user.id };
+}
+
+// ---------------------------------------------------------------------------
+// Slug generation
+// ---------------------------------------------------------------------------
+
+function generateSlug(title: string): string {
+  const base = title
+    .toLowerCase()
+    .replace(/[^\w\s-]/g, "")
+    .trim()
+    .replace(/[\s_]+/g, "-")
+    .replace(/-+/g, "-")
+    .slice(0, 40);
+  const suffix = Date.now().toString(36).slice(-4);
+  return `${base || "campaign"}-${suffix}`;
+}
+
+// ---------------------------------------------------------------------------
+// Revalidation helper
+// ---------------------------------------------------------------------------
+
+function revalidateCampaigns(id?: string) {
+  for (const locale of ["ko", "en"]) {
+    revalidatePath(`/${locale}/app/admin/campaigns`);
+    if (id) revalidatePath(`/${locale}/app/admin/campaigns/${id}`);
+  }
+}
+
+// ---------------------------------------------------------------------------
+// createCampaignAction
+// ---------------------------------------------------------------------------
+
+export async function createCampaignAction(
+  input: CreateCampaignInput,
+): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
+  const auth = await getAuthenticatedAdmin();
+  if (!auth.ok) return { ok: false, error: auth.error };
+
+  const title = input.title.trim();
+  if (!title || title.length < 1 || title.length > 200) {
+    return { ok: false, error: "title_invalid" };
+  }
+  if (!input.categories || input.categories.length === 0) {
+    return { ok: false, error: "categories_required" };
+  }
+
+  // Validate JSONB fields (K-05 MED-A)
+  if (input.reference_assets !== undefined) {
+    const refResult = ReferenceAssetsSchema.safeParse(input.reference_assets);
+    if (!refResult.success) {
+      return { ok: false, error: "reference_assets_invalid" };
+    }
+  }
+  const compCheck = validateCompensationMetadata(
+    input.compensation_model,
+    input.compensation_metadata
+  );
+  if (!compCheck.ok) return { ok: false, error: compCheck.error };
+
+  const slug = generateSlug(title);
+  const sbAdmin = createSupabaseService();
+
+  const { data: campaign, error: insertErr } = await sbAdmin
+    .from("campaigns")
+    .insert({
+      title,
+      slug,
+      description: input.description ?? null,
+      brief: input.brief ?? null,
+      reference_assets: (input.reference_assets ?? []) as Json,
+      allow_r2_upload: input.allow_r2_upload,
+      allow_external_url: input.allow_external_url,
+      compensation_model: input.compensation_model,
+      compensation_metadata: (input.compensation_metadata ?? null) as Json,
+      submission_open_at: input.submission_open_at ?? null,
+      submission_close_at: input.submission_close_at ?? null,
+      status: "draft",
+      sponsor_workspace_id: null,
+      created_by: auth.userId,
+    })
+    .select("id")
+    .single();
+
+  if (insertErr || !campaign) {
+    console.error("[createCampaignAction] insert error:", insertErr?.message);
+    return { ok: false, error: "insert_failed" };
+  }
+
+  // Insert categories
+  if (input.categories.length > 0) {
+    const catRows = input.categories.map((cat, idx) => ({
+      campaign_id: campaign.id,
+      name: cat.name.trim(),
+      description: cat.description ?? null,
+      format_spec: cat.format_spec
+        ? ({ spec: cat.format_spec } as Json)
+        : null,
+      display_order: idx,
+    }));
+
+    const { error: catErr } = await sbAdmin.from("campaign_categories").insert(catRows);
+    if (catErr) {
+      console.error("[createCampaignAction] categories insert error:", catErr.message);
+      // Non-fatal — campaign row succeeded; categories can be added later
+    }
+  }
+
+  revalidateCampaigns(campaign.id);
+  return { ok: true, id: campaign.id };
+}
+
+// ---------------------------------------------------------------------------
+// updateCampaignAction
+// ---------------------------------------------------------------------------
+
+export async function updateCampaignAction(
+  campaignId: string,
+  patch: UpdateCampaignInput,
+): Promise<{ ok: true } | { ok: false; error: string }> {
+  const auth = await getAuthenticatedAdmin();
+  if (!auth.ok) return { ok: false, error: auth.error };
+
+  if (patch.title !== undefined) {
+    const t = patch.title.trim();
+    if (!t || t.length < 1 || t.length > 200) {
+      return { ok: false, error: "title_invalid" };
+    }
+    patch = { ...patch, title: t };
+  }
+
+  // Validate JSONB fields (K-05 MED-A)
+  if (patch.reference_assets !== undefined) {
+    const refResult = ReferenceAssetsSchema.safeParse(patch.reference_assets);
+    if (!refResult.success) {
+      return { ok: false, error: "reference_assets_invalid" };
+    }
+  }
+  if (patch.compensation_metadata !== undefined && patch.compensation_metadata !== null) {
+    const compCheck = validateCompensationMetadata(
+      patch.compensation_model,
+      patch.compensation_metadata
+    );
+    if (!compCheck.ok) return { ok: false, error: compCheck.error };
+  }
+
+  const sbAdmin = createSupabaseService();
+
+  // Build update object — typed as CampaignUpdate to satisfy supabase-js strict overload
+  const update: CampaignUpdate = { updated_at: new Date().toISOString() };
+  if (patch.title !== undefined) update.title = patch.title;
+  if (patch.description !== undefined) update.description = patch.description;
+  if (patch.brief !== undefined) update.brief = patch.brief;
+  if (patch.reference_assets !== undefined)
+    update.reference_assets = patch.reference_assets as Json;
+  if (patch.allow_r2_upload !== undefined) update.allow_r2_upload = patch.allow_r2_upload;
+  if (patch.allow_external_url !== undefined)
+    update.allow_external_url = patch.allow_external_url;
+  if (patch.compensation_model !== undefined)
+    update.compensation_model = patch.compensation_model;
+  if (patch.compensation_metadata !== undefined)
+    update.compensation_metadata = (patch.compensation_metadata ?? null) as Json;
+  if (patch.submission_open_at !== undefined)
+    update.submission_open_at = patch.submission_open_at;
+  if (patch.submission_close_at !== undefined)
+    update.submission_close_at = patch.submission_close_at;
+
+  const { error } = await sbAdmin
+    .from("campaigns")
+    .update(update)
+    .eq("id", campaignId);
+
+  if (error) {
+    console.error("[updateCampaignAction] update error:", error.message);
+    return { ok: false, error: "update_failed" };
+  }
+
+  revalidateCampaigns(campaignId);
+  return { ok: true };
+}
+
+// ---------------------------------------------------------------------------
+// publishCampaignAction
+// ---------------------------------------------------------------------------
+
+export async function publishCampaignAction(
+  campaignId: string,
+  options?: { submission_open_at?: string },
+): Promise<{ ok: true } | { ok: false; error: string }> {
+  const auth = await getAuthenticatedAdmin();
+  if (!auth.ok) return { ok: false, error: auth.error };
+
+  const sbAdmin = createSupabaseService();
+
+  // Verify current status is draft
+  const { data: campaign, error: fetchErr } = await sbAdmin
+    .from("campaigns")
+    .select("status")
+    .eq("id", campaignId)
+    .maybeSingle();
+
+  if (fetchErr || !campaign) return { ok: false, error: "not_found" };
+  if (campaign.status !== "draft") return { ok: false, error: "not_draft" };
+
+  const openAt = options?.submission_open_at ?? new Date().toISOString();
+
+  const { error } = await sbAdmin
+    .from("campaigns")
+    .update({
+      status: "published",
+      submission_open_at: openAt,
+      updated_at: new Date().toISOString(),
+    })
+    .eq("id", campaignId);
+
+  if (error) {
+    console.error("[publishCampaignAction] update error:", error.message);
+    return { ok: false, error: "update_failed" };
+  }
+
+  revalidateCampaigns(campaignId);
+  return { ok: true };
+}
+
+// ---------------------------------------------------------------------------
+// addCategoryAction
+// ---------------------------------------------------------------------------
+
+export async function addCategoryAction(
+  campaignId: string,
+  category: CategoryInput,
+): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
+  const auth = await getAuthenticatedAdmin();
+  if (!auth.ok) return { ok: false, error: auth.error };
+
+  const name = category.name.trim();
+  if (!name) return { ok: false, error: "name_required" };
+
+  const sbAdmin = createSupabaseService();
+
+  // Get current max display_order
+  const { data: existing } = await sbAdmin
+    .from("campaign_categories")
+    .select("display_order")
+    .eq("campaign_id", campaignId)
+    .order("display_order", { ascending: false })
+    .limit(1);
+
+  const nextOrder = existing && existing.length > 0 ? (existing[0].display_order ?? 0) + 1 : 0;
+
+  const { data: cat, error } = await sbAdmin
+    .from("campaign_categories")
+    .insert({
+      campaign_id: campaignId,
+      name,
+      description: category.description ?? null,
+      format_spec: category.format_spec
+        ? ({ spec: category.format_spec } as Json)
+        : null,
+      display_order: nextOrder,
+    })
+    .select("id")
+    .single();
+
+  if (error || !cat) {
+    console.error("[addCategoryAction] insert error:", error?.message);
+    return { ok: false, error: "insert_failed" };
+  }
+
+  revalidateCampaigns(campaignId);
+  return { ok: true, id: cat.id };
+}
+
+// ===========================================================================
+// Phase 7 Wave B.2 — Sponsor request review workflow (4 transitions)
+//
+// Transitions modeled per KICKOFF §B.2:
+//   reviewCampaignRequestAction       requested  → in_review
+//   approveCampaignRequestAction      in_review  → draft
+//   declineCampaignRequestAction      in_review  → declined
+//   requestMoreInfoAction             in_review  → requested
+//
+// All four are admin-only (getAuthenticatedAdmin gate). All writes go through
+// service-role because campaigns.status + decision_metadata are admin-only
+// per the migration's column-level GRANT lockdown. Each transition appends
+// to decision_metadata.history (audit trail) and emits a sponsor-side
+// notification.
+// ===========================================================================
+
+type DecisionHistoryEntry = {
+  at: string;
+  by: string;
+  action: "review_started" | "approved" | "declined" | "more_info_requested";
+  comment: string | null;
+};
+
+type DecisionMetadataShape = {
+  history?: DecisionHistoryEntry[];
+  // last applied note — kept at top level for cheap UI preview
+  note?: string | null;
+};
+
+const ReviewCommentSchema = z.string().trim().max(2000).optional();
+
+async function fetchCampaignForReview(
+  campaignId: string,
+): Promise<
+  | {
+      ok: true;
+      row: {
+        id: string;
+        title: string;
+        status: string;
+        sponsor_workspace_id: string | null;
+        decision_metadata: DecisionMetadataShape | null;
+        created_by: string;
+      };
+    }
+  | { ok: false; error: string }
+> {
+  const sbAdmin = createSupabaseService();
+  const { data, error } = await sbAdmin
+    .from("campaigns")
+    .select(
+      "id, title, status, sponsor_workspace_id, decision_metadata, created_by",
+    )
+    .eq("id", campaignId)
+    .maybeSingle();
+  if (error || !data) return { ok: false, error: "not_found" };
+  return {
+    ok: true,
+    row: data as {
+      id: string;
+      title: string;
+      status: string;
+      sponsor_workspace_id: string | null;
+      decision_metadata: DecisionMetadataShape | null;
+      created_by: string;
+    },
+  };
+}
+
+function appendHistory(
+  prior: DecisionMetadataShape | null,
+  entry: DecisionHistoryEntry,
+): DecisionMetadataShape {
+  const history = prior?.history ?? [];
+  return {
+    ...(prior ?? {}),
+    history: [...history, entry],
+    note: entry.comment,
+  };
+}
+
+async function notifyRequester(
+  campaignId: string,
+  recipientUserId: string,
+  workspaceId: string | null,
+  kind: NotificationKind,
+  title: string,
+): Promise<void> {
+  try {
+    await emitNotification({
+      user_id: recipientUserId,
+      kind,
+      workspace_id: workspaceId ?? undefined,
+      payload: { title },
+      url_path: `/app/campaigns/request`,
+    });
+  } catch (err) {
+    // Non-fatal: status transition has already committed.
+    console.error(`[campaign-actions] notify ${kind} failed:`, err);
+  }
+  void campaignId;
+}
+
+async function transitionRequestStatus(
+  campaignId: string,
+  options: {
+    requireFromStatus: string[];
+    nextStatus: "in_review" | "draft" | "declined" | "requested";
+    historyAction: DecisionHistoryEntry["action"];
+    notificationKind: NotificationKind;
+    rawComment?: unknown;
+    requireComment?: boolean;
+  },
+): Promise<{ ok: true } | { ok: false; error: string }> {
+  const auth = await getAuthenticatedAdmin();
+  if (!auth.ok) return { ok: false, error: auth.error };
+
+  const commentParse = ReviewCommentSchema.safeParse(options.rawComment ?? undefined);
+  if (!commentParse.success) return { ok: false, error: "comment_invalid" };
+  const comment = commentParse.data ?? null;
+
+  if (options.requireComment && (!comment || comment.length === 0)) {
+    return { ok: false, error: "comment_required" };
+  }
+
+  const fetched = await fetchCampaignForReview(campaignId);
+  if (!fetched.ok) return { ok: false, error: fetched.error };
+  const row = fetched.row;
+
+  if (!options.requireFromStatus.includes(row.status)) {
+    return { ok: false, error: "wrong_status" };
+  }
+
+  const sbAdmin = createSupabaseService();
+  const nowIso = new Date().toISOString();
+
+  const newMetadata = appendHistory(row.decision_metadata, {
+    at: nowIso,
+    by: auth.userId,
+    action: options.historyAction,
+    comment: comment ?? null,
+  });
+
+  const { error: updateErr } = await sbAdmin
+    .from("campaigns")
+    .update({
+      status: options.nextStatus,
+      decision_metadata: newMetadata as Json,
+      updated_at: nowIso,
+    })
+    .eq("id", campaignId);
+
+  if (updateErr) {
+    console.error("[transitionRequestStatus] update error:", updateErr.message);
+    return { ok: false, error: "update_failed" };
+  }
+
+  // Notify the original requester (created_by) — they always have visibility
+  // even after switching workspaces. Workspace context preserved so the
+  // notification surfaces in the right bell.
+  await notifyRequester(
+    campaignId,
+    row.created_by,
+    row.sponsor_workspace_id,
+    options.notificationKind,
+    row.title,
+  );
+
+  revalidateCampaigns(campaignId);
+  return { ok: true };
+}
+
+export async function reviewCampaignRequestAction(
+  campaignId: string,
+  rawComment?: unknown,
+): Promise<{ ok: true } | { ok: false; error: string }> {
+  return transitionRequestStatus(campaignId, {
+    requireFromStatus: ["requested"],
+    nextStatus: "in_review",
+    historyAction: "review_started",
+    notificationKind: "campaign_request_in_review",
+    rawComment,
+  });
+}
+
+export async function approveCampaignRequestAction(
+  campaignId: string,
+  rawComment?: unknown,
+): Promise<{ ok: true } | { ok: false; error: string }> {
+  return transitionRequestStatus(campaignId, {
+    requireFromStatus: ["in_review"],
+    nextStatus: "draft",
+    historyAction: "approved",
+    notificationKind: "campaign_request_approved",
+    rawComment,
+  });
+}
+
+export async function declineCampaignRequestAction(
+  campaignId: string,
+  rawComment?: unknown,
+): Promise<{ ok: true } | { ok: false; error: string }> {
+  return transitionRequestStatus(campaignId, {
+    requireFromStatus: ["in_review"],
+    nextStatus: "declined",
+    historyAction: "declined",
+    notificationKind: "campaign_request_declined",
+    rawComment,
+    requireComment: true,
+  });
+}
+
+export async function requestMoreInfoAction(
+  campaignId: string,
+  rawComment?: unknown,
+): Promise<{ ok: true } | { ok: false; error: string }> {
+  return transitionRequestStatus(campaignId, {
+    requireFromStatus: ["in_review"],
+    nextStatus: "requested",
+    historyAction: "more_info_requested",
+    notificationKind: "campaign_request_more_info",
+    rawComment,
+    requireComment: true,
+  });
+}
diff --git a/src/app/[locale]/app/admin/campaigns/page.tsx b/src/app/[locale]/app/admin/campaigns/page.tsx
new file mode 100644
index 0000000..5aded2c
--- /dev/null
+++ b/src/app/[locale]/app/admin/campaigns/page.tsx
@@ -0,0 +1,278 @@
+// Phase 7 Wave A.2 — /admin/campaigns list
+//
+// Status filter tabs: all / draft / published / submission_closed /
+// distributing / archived.
+//
+// Page-level auth gate: notFound() for non-yagi_admin.
+// Parent admin/layout.tsx already redirects non-admins; this is
+// defence-in-depth per spec.
+
+import { notFound } from "next/navigation";
+import { getTranslations } from "next-intl/server";
+import { Link } from "@/i18n/routing";
+import { createSupabaseServer } from "@/lib/supabase/server";
+import { createSupabaseService } from "@/lib/supabase/service";
+import { Button } from "@/components/ui/button";
+
+export const dynamic = "force-dynamic";
+
+type Props = {
+  params: Promise<{ locale: string }>;
+  searchParams: Promise<{ status?: string }>;
+};
+
+type CampaignRow = {
+  id: string;
+  title: string;
+  slug: string;
+  status: string;
+  compensation_model: string | null;
+  submission_open_at: string | null;
+  submission_close_at: string | null;
+  created_at: string;
+  // Phase 7 Wave B.2 — sponsor request surface
+  sponsor_workspace_id: string | null;
+  sponsor_workspace: { id: string; name: string; kind: string } | null;
+  request_metadata: { contact_phone?: string } | null;
+};
+
+// Phase 7 Wave B.2 — request lifecycle (requested/in_review/declined) prepended
+// to the existing publish lifecycle. Default landing tab = 'requested' so admin
+// sees the queue of incoming sponsor requests on entry.
+const STATUS_VALUES = [
+  "all",
+  "requested",
+  "in_review",
+  "declined",
+  "draft",
+  "published",
+  "submission_closed",
+  "distributing",
+  "archived",
+] as const;
+
+function fmt(d: string | null, locale: string): string {
+  if (!d) return "—";
+  return new Intl.DateTimeFormat(locale, {
+    year: "numeric",
+    month: "2-digit",
+    day: "2-digit",
+  }).format(new Date(d));
+}
+
+export default async function AdminCampaignsPage({ params, searchParams }: Props) {
+  const { locale } = await params;
+  const sp = await searchParams;
+  const selectedStatus = sp.status as string | undefined;
+
+  // Auth gate
+  const supabase = await createSupabaseServer();
+  const {
+    data: { user },
+  } = await supabase.auth.getUser();
+  if (!user) notFound();
+
+  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
+  if (!isAdmin) notFound();
+
+  const t = await getTranslations("admin_campaigns");
+
+  // Fetch campaigns via service-role (status col is yagi_admin only via RLS)
+  const sbAdmin = createSupabaseService();
+  let query = sbAdmin
+    .from("campaigns")
+    .select(
+      `id, title, slug, status, compensation_model, submission_open_at, submission_close_at, created_at,
+       sponsor_workspace_id, request_metadata,
+       sponsor_workspace:workspaces!sponsor_workspace_id(id, name, kind)`,
+    )
+    .order("created_at", { ascending: false });
+
+  if (selectedStatus && selectedStatus !== "all") {
+    query = query.eq("status", selectedStatus);
+  }
+
+  const { data, error } = await query;
+  const rows = (data ?? []) as CampaignRow[];
+
+  // Count requests awaiting admin attention (badge on tab)
+  const pendingRequests = rows.filter((r) => r.status === "requested").length;
+
+  return (
+    <div className="px-10 py-12 max-w-5xl space-y-10">
+      {/* Header */}
+      <div className="flex items-center justify-between">
+        <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] keep-all">
+          {t("title")}
+        </h1>
+        <Button size="pill" asChild>
+          <Link href="/app/admin/campaigns/new">{t("new_cta")}</Link>
+        </Button>
+      </div>
+
+      {/* Status filter tabs */}
+      <div className="flex flex-wrap gap-2">
+        {STATUS_VALUES.map((val) => {
+          const isActive = (selectedStatus ?? "all") === val;
+          const href =
+            val === "all"
+              ? "/app/admin/campaigns"
+              : `/app/admin/campaigns?status=${val}`;
+          const labelKey = val === "all" ? "status_all" : (`status_${val.replace(/-/g, "_")}` as Parameters<typeof t>[0]);
+          const showBadge = val === "requested" && pendingRequests > 0;
+          return (
+            <Link key={val} href={href}>
+              <Button
+                size="sm"
+                variant={isActive ? "default" : "outline"}
+                className="rounded-full"
+              >
+                {val === "all" ? t("status_all") : t(labelKey)}
+                {showBadge && (
+                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-[#71D083] text-black text-[10px] font-semibold min-w-[18px] h-[18px] px-1 tabular-nums">
+                    {pendingRequests}
+                  </span>
+                )}
+              </Button>
+            </Link>
+          );
+        })}
+      </div>
+
+      {/* Error state */}
+      {error ? (
+        <div className="rounded-[24px] border border-border bg-muted p-4 text-sm text-muted-foreground">
+          {t("toast_error")}
+        </div>
+      ) : null}
+
+      {/* Empty state */}
+      {!error && rows.length === 0 ? (
+        <div className="rounded-[24px] border border-border bg-card p-12 text-center">
+          <p className="text-sm text-muted-foreground keep-all">{t("list_empty")}</p>
+        </div>
+      ) : null}
+
+      {/* Campaign table */}
+      {rows.length > 0 ? (
+        <div className="overflow-hidden rounded-[24px] border border-border">
+          <table className="w-full text-sm">
+            <thead>
+              <tr className="border-b border-border bg-muted/30">
+                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
+                  {t("form.title_label")}
+                </th>
+                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
+                  {t("status_filter_label")}
+                </th>
+                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
+                  {t("sponsor_col_label")}
+                </th>
+                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
+                  {t("form.submission_open_at")}
+                </th>
+                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
+                  &nbsp;
+                </th>
+              </tr>
+            </thead>
+            <tbody>
+              {rows.map((row) => {
+                const isRequestStage =
+                  row.status === "requested" ||
+                  row.status === "in_review" ||
+                  row.status === "declined";
+                const detailHref = isRequestStage
+                  ? `/app/admin/campaigns/${row.id}/review`
+                  : `/app/admin/campaigns/${row.id}`;
+                const sponsorLabel =
+                  row.sponsor_workspace?.name ?? t("sponsor_self_host");
+                const phone = row.request_metadata?.contact_phone;
+                return (
+                  <tr
+                    key={row.id}
+                    className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
+                  >
+                    <td className="px-5 py-3 font-medium keep-all">
+                      <Link
+                        href={detailHref}
+                        className="hover:underline underline-offset-2"
+                      >
+                        {row.title}
+                      </Link>
+                    </td>
+                    <td className="px-5 py-3 hidden sm:table-cell">
+                      <StatusBadge status={row.status} t={t} />
+                    </td>
+                    <td className="px-5 py-3 text-muted-foreground text-[12px] hidden md:table-cell">
+                      <div className="flex flex-col">
+                        <span className="keep-all">{sponsorLabel}</span>
+                        {phone && (
+                          <span className="text-[11px] text-muted-foreground/70 tabular-nums">
+                            {phone}
+                          </span>
+                        )}
+                      </div>
+                    </td>
+                    <td className="px-5 py-3 tabular-nums text-[12px] text-muted-foreground hidden lg:table-cell">
+                      {isRequestStage
+                        ? fmt(row.created_at, locale)
+                        : fmt(row.submission_open_at, locale)}
+                    </td>
+                    <td className="px-5 py-3 text-right">
+                      <Link
+                        href={detailHref}
+                        className="text-sm text-foreground hover:underline underline-offset-2"
+                      >
+                        {isRequestStage ? t("review_cta") : t("edit_cta")}
+                      </Link>
+                    </td>
+                  </tr>
+                );
+              })}
+            </tbody>
+          </table>
+        </div>
+      ) : null}
+    </div>
+  );
+}
+
+function StatusBadge({
+  status,
+  t,
+}: {
+  status: string;
+  t: Awaited<ReturnType<typeof getTranslations<"admin_campaigns">>>;
+}) {
+  // Color tier:
+  //   - sage (high attention) for active states
+  //   - muted for draft / closed / archived / declined
+  //   - bordered neutral for in-flight
+  switch (status) {
+    case "requested":
+      return (
+        <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-foreground bg-muted/40">
+          {t("status_requested")}
+        </span>
+      );
+    case "in_review":
+      return (
+        <span className="inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium bg-sage-soft text-sage-ink">
+          {t("status_in_review")}
+        </span>
+      );
+    case "declined":
+      return (
+        <span className="inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
+          {t("status_declined")}
+        </span>
+      );
+    case "draft":
+      return <span className="text-[12px] text-muted-foreground">{t("draft_label")}</span>;
+    case "published":
+      return <span className="text-[12px] text-[#71D083]">{t("published_label")}</span>;
+    default:
+      return <span className="text-[12px] text-foreground/60">{status}</span>;
+  }
+}
diff --git a/src/app/[locale]/app/campaigns/_actions/request-campaign-action.ts b/src/app/[locale]/app/campaigns/_actions/request-campaign-action.ts
new file mode 100644
index 0000000..6a214e0
--- /dev/null
+++ b/src/app/[locale]/app/campaigns/_actions/request-campaign-action.ts
@@ -0,0 +1,182 @@
+"use server";
+
+// Phase 7 Wave B.1 — Sponsor (brand/artist workspace) campaign request action.
+//
+// Differs from createCampaignAction (admin Route A): uses the SESSION client,
+// not service-role. The migration's `campaigns_insert_sponsor` RLS WITH CHECK
+// + column-level INSERT GRANT lock the row to:
+//   - status = 'requested'
+//   - created_by = auth.uid()
+//   - sponsor_workspace_id = workspace member with kind IN ('brand','artist')
+//   - admin/audit fields untouched (defaults / NULL)
+// The action layer adds:
+//   - input shape validation (title, brief, contact_phone required)
+//   - request_metadata jsonb shape (Q6 lock: contact_phone required)
+//   - membership pre-check so failures surface as friendly errors (not 42501)
+
+import { revalidatePath } from "next/cache";
+import { z } from "zod";
+import { createSupabaseServer } from "@/lib/supabase/server";
+import { emitNotification } from "@/lib/notifications/emit";
+import type { Json } from "@/lib/supabase/database.types";
+
+// ---------------------------------------------------------------------------
+// Input schema
+// ---------------------------------------------------------------------------
+
+const ReferenceAssetSchema = z.object({
+  url: z.string().url(),
+  label: z.string().min(1).max(200),
+});
+
+const RequestCampaignInputSchema = z.object({
+  workspace_id: z.string().uuid(),
+  title: z.string().trim().min(1).max(200),
+  brief: z.string().trim().min(1).max(5000),
+  reference_assets: z.array(ReferenceAssetSchema).max(20).optional(),
+  contact_phone: z
+    .string()
+    .trim()
+    .min(7, "phone_too_short")
+    .max(40, "phone_too_long"),
+  schedule_intent: z.string().trim().max(2000).optional(),
+  sponsorship_intent: z
+    .enum(["self", "co_sponsor", "yagi_assist"])
+    .optional(),
+  compensation_intent: z
+    .enum(["exposure_only", "fixed_fee"])
+    .optional(),
+  compensation_fixed_fee_per_creator: z.number().int().nonnegative().optional(),
+  notes: z.string().trim().max(2000).optional(),
+});
+
+export type RequestCampaignInput = z.infer<typeof RequestCampaignInputSchema>;
+
+export type RequestCampaignResult =
+  | { ok: true; id: string }
+  | { ok: false; error: string };
+
+// ---------------------------------------------------------------------------
+// Slug — same pattern as createCampaignAction
+// ---------------------------------------------------------------------------
+
+function generateSlug(title: string): string {
+  const base = title
+    .toLowerCase()
+    .replace(/[^\w\s-]/g, "")
+    .trim()
+    .replace(/[\s_]+/g, "-")
+    .replace(/-+/g, "-")
+    .slice(0, 40);
+  const suffix = Date.now().toString(36).slice(-4);
+  return `${base || "campaign"}-${suffix}`;
+}
+
+// ---------------------------------------------------------------------------
+// requestCampaignAction
+// ---------------------------------------------------------------------------
+
+export async function requestCampaignAction(
+  raw: unknown,
+): Promise<RequestCampaignResult> {
+  const parsed = RequestCampaignInputSchema.safeParse(raw);
+  if (!parsed.success) {
+    const first = parsed.error.issues[0];
+    return { ok: false, error: first?.message || "input_invalid" };
+  }
+  const input = parsed.data;
+
+  // Cross-field: fixed_fee compensation requires a positive fee amount
+  if (
+    input.compensation_intent === "fixed_fee" &&
+    !(input.compensation_fixed_fee_per_creator && input.compensation_fixed_fee_per_creator > 0)
+  ) {
+    return { ok: false, error: "fixed_fee_amount_required" };
+  }
+
+  const supabase = await createSupabaseServer();
+  const {
+    data: { user },
+  } = await supabase.auth.getUser();
+  if (!user) return { ok: false, error: "unauthorized" };
+
+  // Defense-in-depth: confirm membership + sponsor-eligible workspace.kind
+  // before triggering the RLS WITH CHECK (which would return a less friendly
+  // 42501). RLS still enforces the same check; this surfaces the right error
+  // to the form.
+  const { data: membership, error: memErr } = await supabase
+    .from("workspace_members")
+    .select("workspace_id, workspaces!inner(id, kind)")
+    .eq("user_id", user.id)
+    .eq("workspace_id", input.workspace_id)
+    .maybeSingle();
+
+  if (memErr || !membership) return { ok: false, error: "not_a_member" };
+
+  const wsKind = (membership as { workspaces?: { kind?: string } }).workspaces?.kind;
+  if (wsKind !== "brand" && wsKind !== "artist") {
+    return { ok: false, error: "workspace_not_sponsor_eligible" };
+  }
+
+  // Build request_metadata JSONB
+  const requestMetadata: Record<string, Json> = {
+    contact_phone: input.contact_phone,
+  };
+  if (input.schedule_intent) requestMetadata.schedule_intent = input.schedule_intent;
+  if (input.sponsorship_intent) requestMetadata.sponsorship_intent = input.sponsorship_intent;
+  if (input.compensation_intent) {
+    requestMetadata.compensation_intent = input.compensation_intent;
+    if (input.compensation_intent === "fixed_fee") {
+      requestMetadata.compensation_fixed_fee_per_creator =
+        input.compensation_fixed_fee_per_creator!;
+    }
+  }
+  if (input.notes) requestMetadata.notes = input.notes;
+
+  const slug = generateSlug(input.title);
+  const nowIso = new Date().toISOString();
+
+  // INSERT via session client — RLS + column-level INSERT GRANT enforce:
+  //   - status='requested', created_by=auth.uid(), sponsor membership + kind
+  //   - admin/audit columns are NOT GRANTed and excluded here.
+  const { data: row, error: insertErr } = await supabase
+    .from("campaigns")
+    .insert({
+      slug,
+      title: input.title,
+      brief: input.brief,
+      reference_assets: (input.reference_assets ?? []) as Json,
+      sponsor_workspace_id: input.workspace_id,
+      status: "requested",
+      request_metadata: requestMetadata as Json,
+      created_by: user.id,
+      updated_at: nowIso,
+    })
+    .select("id")
+    .single();
+
+  if (insertErr || !row) {
+    console.error("[requestCampaignAction] insert error:", insertErr?.message);
+    return { ok: false, error: "insert_failed" };
+  }
+
+  // Notify the requester (in-app + digest email per notification preferences).
+  // Wave B.2 admin transitions emit the other 3 events (in_review/approved/declined).
+  try {
+    await emitNotification({
+      user_id: user.id,
+      kind: "campaign_request_received",
+      workspace_id: input.workspace_id,
+      payload: { title: input.title },
+      url_path: `/app/campaigns/request`,
+    });
+  } catch (err) {
+    // Non-fatal: row is committed.
+    console.error("[requestCampaignAction] notify error:", err);
+  }
+
+  revalidatePath(`/ko/app/campaigns/request`);
+  revalidatePath(`/en/app/campaigns/request`);
+
+  return { ok: true, id: row.id };
+}
diff --git a/src/app/[locale]/app/campaigns/request/own-requests-list.tsx b/src/app/[locale]/app/campaigns/request/own-requests-list.tsx
new file mode 100644
index 0000000..835be0c
--- /dev/null
+++ b/src/app/[locale]/app/campaigns/request/own-requests-list.tsx
@@ -0,0 +1,116 @@
+// Phase 7 Wave B.1 — Own past requests list (server component, RSC).
+//
+// Shows the workspace's prior campaign requests with status + decision
+// metadata preview. Visible via the campaigns_select_sponsor RLS policy.
+
+import { getTranslations } from "next-intl/server";
+
+export type OwnRequestRow = {
+  id: string;
+  title: string;
+  status: string;
+  created_at: string;
+  request_metadata: unknown;
+  decision_metadata: unknown;
+};
+
+function formatDate(iso: string, locale: string): string {
+  return new Intl.DateTimeFormat(locale, {
+    year: "numeric",
+    month: "2-digit",
+    day: "2-digit",
+  }).format(new Date(iso));
+}
+
+function statusKey(status: string): string {
+  // Maps the 8-state campaigns lifecycle to i18n keys defined under
+  // campaign_request.status.<key>. Anything past 'declined' (draft/published/
+  // submission_closed/distributing/archived) renders as 'progressed' since
+  // the sponsor request itself is no longer the surface they care about.
+  if (status === "requested" || status === "in_review" || status === "declined") {
+    return status;
+  }
+  return "progressed";
+}
+
+function statusPillClass(key: string): string {
+  switch (key) {
+    case "requested":
+      return "border-border text-muted-foreground bg-muted/40";
+    case "in_review":
+      return "border-transparent bg-sage-soft text-sage-ink";
+    case "declined":
+      return "border-transparent bg-muted text-muted-foreground";
+    case "progressed":
+      return "border-transparent bg-foreground/5 text-foreground";
+    default:
+      return "border-border text-muted-foreground";
+  }
+}
+
+function decisionNote(meta: unknown): string | null {
+  if (!meta || typeof meta !== "object") return null;
+  const m = meta as Record<string, unknown>;
+  const note = m.note ?? m.comment ?? m.message;
+  return typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
+}
+
+export async function OwnRequestsList({
+  rows,
+  locale,
+}: {
+  rows: OwnRequestRow[];
+  locale: string;
+}) {
+  const t = await getTranslations("campaign_request");
+
+  return (
+    <section className="space-y-4">
+      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
+        {t("own_list_title")}
+      </h2>
+
+      {rows.length === 0 ? (
+        <div className="rounded-[24px] border border-border bg-card p-6">
+          <p className="text-xs text-muted-foreground keep-all leading-relaxed">
+            {t("own_list_empty")}
+          </p>
+        </div>
+      ) : (
+        <ul className="space-y-2">
+          {rows.map((row) => {
+            const key = statusKey(row.status);
+            const note = decisionNote(row.decision_metadata);
+            return (
+              <li
+                key={row.id}
+                className="rounded-[24px] border border-border bg-card p-4"
+              >
+                <div className="flex items-start justify-between gap-4">
+                  <div className="min-w-0 flex-1">
+                    <p className="text-sm font-medium keep-all truncate">
+                      {row.title}
+                    </p>
+                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
+                      {formatDate(row.created_at, locale)}
+                    </p>
+                    {note && (
+                      <p className="mt-2 text-xs text-muted-foreground keep-all leading-relaxed">
+                        {t("own_decision_note")}: {note}
+                      </p>
+                    )}
+                  </div>
+                  <span
+                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusPillClass(key)}`}
+                  >
+                    {t(`status.${key}` as Parameters<typeof t>[0])}
+                  </span>
+                </div>
+              </li>
+            );
+          })}
+        </ul>
+      )}
+    </section>
+  );
+}
diff --git a/src/app/[locale]/app/campaigns/request/page.tsx b/src/app/[locale]/app/campaigns/request/page.tsx
new file mode 100644
index 0000000..8393c53
--- /dev/null
+++ b/src/app/[locale]/app/campaigns/request/page.tsx
@@ -0,0 +1,94 @@
+// Phase 7 Wave B.1 — /app/campaigns/request
+//
+// Sponsor (brand or artist workspace member) submits a campaign request.
+// Server Component:
+//   - Resolves active workspace + verifies kind IN ('brand', 'artist')
+//   - Fetches the user's own past requests (RLS: campaigns_select_sponsor)
+//   - Renders the client form with the active workspace pre-bound
+// Creator workspace + admin workspace are not sponsor-eligible — show a
+// guard message instead of the form.
+
+import { notFound, redirect } from "next/navigation";
+import { getTranslations } from "next-intl/server";
+import { Link } from "@/i18n/routing";
+import { createSupabaseServer } from "@/lib/supabase/server";
+import { resolveActiveWorkspace } from "@/lib/workspace/active";
+import { RequestCampaignForm } from "./request-form";
+import { OwnRequestsList, type OwnRequestRow } from "./own-requests-list";
+
+export const dynamic = "force-dynamic";
+
+type Props = {
+  params: Promise<{ locale: string }>;
+};
+
+export default async function CampaignRequestPage({ params }: Props) {
+  const { locale } = await params;
+
+  const supabase = await createSupabaseServer();
+  const {
+    data: { user },
+  } = await supabase.auth.getUser();
+  if (!user) redirect(`/${locale}/signin?next=/${locale}/app/campaigns/request`);
+
+  const active = await resolveActiveWorkspace(user.id);
+  if (!active) notFound();
+
+  const t = await getTranslations("campaign_request");
+
+  // Guard: only brand + artist workspaces can host a campaign request.
+  // 'yagi_admin' workspaces use /admin/campaigns/new (Route A self-host).
+  // 'creator' workspaces (Phase 7 Wave C) cannot sponsor — they participate.
+  const isSponsorEligible = active.kind === "brand" || active.kind === "artist";
+
+  if (!isSponsorEligible) {
+    return (
+      <div className="px-10 py-12 max-w-2xl space-y-6">
+        <h1 className="font-display text-3xl tracking-tight leading-[1.1] keep-all">
+          {t("title")}
+        </h1>
+        <div className="rounded-[24px] border border-border bg-card p-8">
+          <p className="text-sm text-muted-foreground keep-all leading-relaxed">
+            {t("guard_not_eligible")}
+          </p>
+        </div>
+      </div>
+    );
+  }
+
+  // Fetch own past requests via session client. The campaigns_select_sponsor
+  // RLS policy scopes naturally to the active workspace's memberships.
+  const { data: ownRows } = await supabase
+    .from("campaigns")
+    .select(
+      "id, title, status, created_at, request_metadata, decision_metadata",
+    )
+    .eq("sponsor_workspace_id", active.id)
+    .order("created_at", { ascending: false })
+    .limit(20);
+
+  const own = (ownRows ?? []) as OwnRequestRow[];
+
+  return (
+    <div className="px-6 md:px-10 py-12 max-w-2xl space-y-12">
+      {/* Header */}
+      <div className="space-y-3">
+        <h1 className="font-display text-3xl md:text-4xl tracking-tight leading-[1.1] keep-all">
+          {t("title")}
+        </h1>
+        <p className="text-sm text-muted-foreground keep-all leading-relaxed">
+          {t("intro")}
+        </p>
+        <p className="text-xs text-muted-foreground">
+          {t("requester_label")}: <span className="font-medium text-foreground">{active.name}</span>
+        </p>
+      </div>
+
+      {/* Form */}
+      <RequestCampaignForm workspaceId={active.id} />
+
+      {/* Own requests list */}
+      <OwnRequestsList rows={own} locale={locale} />
+    </div>
+  );
+}
diff --git a/src/app/[locale]/app/campaigns/request/request-form.tsx b/src/app/[locale]/app/campaigns/request/request-form.tsx
new file mode 100644
index 0000000..6a74377
--- /dev/null
+++ b/src/app/[locale]/app/campaigns/request/request-form.tsx
@@ -0,0 +1,380 @@
+"use client";
+
+// Phase 7 Wave B.1 — Sponsor request form (client component).
+//
+// Form state: title, brief, contact_phone (required); reference_assets,
+// schedule_intent, sponsorship_intent, compensation_intent, notes (optional).
+// On submit: requestCampaignAction → server action returns { ok, id } or
+// { ok: false, error: <key> }. Inline error keys map to i18n.
+
+import { useState, useTransition } from "react";
+import { useRouter } from "next/navigation";
+import { useTranslations } from "next-intl";
+import { toast } from "sonner";
+import { Input } from "@/components/ui/input";
+import { Textarea } from "@/components/ui/textarea";
+import { Button } from "@/components/ui/button";
+import { Label } from "@/components/ui/label";
+import {
+  Select,
+  SelectContent,
+  SelectItem,
+  SelectTrigger,
+  SelectValue,
+} from "@/components/ui/select";
+import { requestCampaignAction } from "../_actions/request-campaign-action";
+
+type ReferenceAssetDraft = { url: string; label: string };
+
+type SponsorshipIntent = "self" | "co_sponsor" | "yagi_assist";
+type CompensationIntent = "exposure_only" | "fixed_fee";
+
+// Server-action error codes that have matching i18n keys under campaign_request.error.
+// Anything else falls back to error.submit_failed so we never render a raw code.
+const ERROR_KEYS = new Set([
+  "phone_required",
+  "phone_too_short",
+  "phone_too_long",
+  "title_required",
+  "brief_required",
+  "fixed_fee_required",
+  "fixed_fee_amount_required",
+  "input_invalid",
+  "unauthorized",
+  "not_a_member",
+  "workspace_not_sponsor_eligible",
+  "insert_failed",
+  "submit_failed",
+]);
+
+export function RequestCampaignForm({
+  workspaceId,
+}: {
+  workspaceId: string;
+}) {
+  const router = useRouter();
+  const t = useTranslations("campaign_request");
+  const [isPending, startTransition] = useTransition();
+
+  const [title, setTitle] = useState("");
+  const [brief, setBrief] = useState("");
+  const [contactPhone, setContactPhone] = useState("");
+  const [referenceAssets, setReferenceAssets] = useState<ReferenceAssetDraft[]>([]);
+  const [scheduleIntent, setScheduleIntent] = useState("");
+  const [sponsorshipIntent, setSponsorshipIntent] =
+    useState<SponsorshipIntent | "unset">("unset");
+  const [compensationIntent, setCompensationIntent] =
+    useState<CompensationIntent | "unset">("unset");
+  const [fixedFeeAmount, setFixedFeeAmount] = useState("");
+  const [notes, setNotes] = useState("");
+
+  function addAsset() {
+    setReferenceAssets((prev) => [...prev, { url: "", label: "" }]);
+  }
+  function removeAsset(idx: number) {
+    setReferenceAssets((prev) => prev.filter((_, i) => i !== idx));
+  }
+  function updateAsset(
+    idx: number,
+    field: keyof ReferenceAssetDraft,
+    value: string,
+  ) {
+    setReferenceAssets((prev) =>
+      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
+    );
+  }
+
+  function handleSubmit(e: React.FormEvent) {
+    e.preventDefault();
+
+    const phone = contactPhone.trim();
+    if (phone.length < 7) {
+      toast.error(t("error.phone_required"));
+      return;
+    }
+    const trimmedTitle = title.trim();
+    if (!trimmedTitle) {
+      toast.error(t("error.title_required"));
+      return;
+    }
+    const trimmedBrief = brief.trim();
+    if (!trimmedBrief) {
+      toast.error(t("error.brief_required"));
+      return;
+    }
+
+    if (compensationIntent === "fixed_fee") {
+      const amount = Number(fixedFeeAmount);
+      if (!Number.isFinite(amount) || amount <= 0) {
+        toast.error(t("error.fixed_fee_required"));
+        return;
+      }
+    }
+
+    // Drop empty asset rows so the server zod schema doesn't reject them.
+    const cleanAssets = referenceAssets
+      .map((a) => ({ url: a.url.trim(), label: a.label.trim() }))
+      .filter((a) => a.url.length > 0 && a.label.length > 0);
+
+    startTransition(async () => {
+      const result = await requestCampaignAction({
+        workspace_id: workspaceId,
+        title: trimmedTitle,
+        brief: trimmedBrief,
+        contact_phone: phone,
+        reference_assets: cleanAssets.length > 0 ? cleanAssets : undefined,
+        schedule_intent: scheduleIntent.trim() || undefined,
+        sponsorship_intent:
+          sponsorshipIntent === "unset" ? undefined : sponsorshipIntent,
+        compensation_intent:
+          compensationIntent === "unset" ? undefined : compensationIntent,
+        compensation_fixed_fee_per_creator:
+          compensationIntent === "fixed_fee"
+            ? Number(fixedFeeAmount)
+            : undefined,
+        notes: notes.trim() || undefined,
+      });
+
+      if (!result.ok) {
+        const known = ERROR_KEYS.has(result.error);
+        const key = (known
+          ? `error.${result.error}`
+          : "error.submit_failed") as Parameters<typeof t>[0];
+        toast.error(t(key));
+        return;
+      }
+
+      toast.success(t("toast_submitted"));
+      // Reset form so subsequent submits don't accidentally re-send the same
+      // payload, then refresh the page to show the new entry in the own list.
+      setTitle("");
+      setBrief("");
+      setContactPhone("");
+      setReferenceAssets([]);
+      setScheduleIntent("");
+      setSponsorshipIntent("unset");
+      setCompensationIntent("unset");
+      setFixedFeeAmount("");
+      setNotes("");
+      router.refresh();
+    });
+  }
+
+  return (
+    <form
+      onSubmit={handleSubmit}
+      className="rounded-[24px] border border-border bg-card p-6 md:p-8 space-y-7"
+    >
+      {/* Title */}
+      <div className="space-y-2">
+        <Label htmlFor="req_title">
+          {t("form.title_label")} <span className="text-destructive">*</span>
+        </Label>
+        <Input
+          id="req_title"
+          value={title}
+          onChange={(e) => setTitle(e.target.value)}
+          placeholder={t("form.title_placeholder")}
+          maxLength={200}
+          required
+          className="rounded-[12px]"
+        />
+      </div>
+
+      {/* Brief */}
+      <div className="space-y-2">
+        <Label htmlFor="req_brief">
+          {t("form.brief_label")} <span className="text-destructive">*</span>
+        </Label>
+        <Textarea
+          id="req_brief"
+          value={brief}
+          onChange={(e) => setBrief(e.target.value)}
+          placeholder={t("form.brief_placeholder")}
+          rows={6}
+          maxLength={5000}
+          required
+          className="rounded-[12px]"
+        />
+      </div>
+
+      {/* Contact phone — REQUIRED (Q6 lock) */}
+      <div className="space-y-2">
+        <Label htmlFor="req_phone">
+          {t("form.contact_phone_label")} <span className="text-destructive">*</span>
+        </Label>
+        <Input
+          id="req_phone"
+          type="tel"
+          inputMode="tel"
+          value={contactPhone}
+          onChange={(e) => setContactPhone(e.target.value)}
+          placeholder={t("form.contact_phone_placeholder")}
+          maxLength={40}
+          required
+          className="rounded-[12px]"
+        />
+        <p className="text-xs text-muted-foreground keep-all">
+          {t("form.contact_phone_helper")}
+        </p>
+      </div>
+
+      {/* Reference assets */}
+      <div className="space-y-3">
+        <Label>{t("form.reference_assets_label")}</Label>
+        {referenceAssets.length > 0 && (
+          <div className="space-y-2">
+            {referenceAssets.map((asset, idx) => (
+              <div key={idx} className="flex gap-2">
+                <Input
+                  type="url"
+                  placeholder="https://..."
+                  value={asset.url}
+                  onChange={(e) => updateAsset(idx, "url", e.target.value)}
+                  className="flex-1 rounded-[12px]"
+                />
+                <Input
+                  placeholder={t("form.reference_label_placeholder")}
+                  value={asset.label}
+                  onChange={(e) => updateAsset(idx, "label", e.target.value)}
+                  maxLength={200}
+                  className="w-40 rounded-[12px]"
+                />
+                <Button
+                  type="button"
+                  variant="ghost"
+                  size="sm"
+                  onClick={() => removeAsset(idx)}
+                  className="text-muted-foreground"
+                >
+                  {t("form.remove_asset")}
+                </Button>
+              </div>
+            ))}
+          </div>
+        )}
+        <Button
+          type="button"
+          variant="outline"
+          size="sm"
+          onClick={addAsset}
+          className="rounded-full"
+        >
+          {t("form.add_asset")}
+        </Button>
+        <p className="text-xs text-muted-foreground keep-all">
+          {t("form.reference_assets_helper")}
+        </p>
+      </div>
+
+      {/* Schedule intent */}
+      <div className="space-y-2">
+        <Label htmlFor="req_schedule">{t("form.schedule_intent_label")}</Label>
+        <Textarea
+          id="req_schedule"
+          value={scheduleIntent}
+          onChange={(e) => setScheduleIntent(e.target.value)}
+          placeholder={t("form.schedule_intent_placeholder")}
+          rows={2}
+          maxLength={2000}
+          className="rounded-[12px]"
+        />
+      </div>
+
+      {/* Sponsorship intent */}
+      <div className="space-y-2">
+        <Label htmlFor="req_sponsorship">
+          {t("form.sponsorship_intent_label")}
+        </Label>
+        <Select
+          value={sponsorshipIntent}
+          onValueChange={(v) =>
+            setSponsorshipIntent(v as SponsorshipIntent | "unset")
+          }
+        >
+          <SelectTrigger id="req_sponsorship" className="rounded-[12px]">
+            <SelectValue placeholder={t("form.sponsorship_intent_placeholder")} />
+          </SelectTrigger>
+          <SelectContent>
+            <SelectItem value="self">{t("form.sponsorship_self")}</SelectItem>
+            <SelectItem value="co_sponsor">
+              {t("form.sponsorship_co_sponsor")}
+            </SelectItem>
+            <SelectItem value="yagi_assist">
+              {t("form.sponsorship_yagi_assist")}
+            </SelectItem>
+          </SelectContent>
+        </Select>
+      </div>
+
+      {/* Compensation intent */}
+      <div className="space-y-2">
+        <Label htmlFor="req_compensation">
+          {t("form.compensation_intent_label")}
+        </Label>
+        <Select
+          value={compensationIntent}
+          onValueChange={(v) =>
+            setCompensationIntent(v as CompensationIntent | "unset")
+          }
+        >
+          <SelectTrigger id="req_compensation" className="rounded-[12px]">
+            <SelectValue placeholder={t("form.compensation_intent_placeholder")} />
+          </SelectTrigger>
+          <SelectContent>
+            <SelectItem value="exposure_only">
+              {t("form.compensation_exposure_only")}
+            </SelectItem>
+            <SelectItem value="fixed_fee">
+              {t("form.compensation_fixed_fee")}
+            </SelectItem>
+          </SelectContent>
+        </Select>
+      </div>
+
+      {compensationIntent === "fixed_fee" && (
+        <div className="space-y-2">
+          <Label htmlFor="req_fixed_fee">
+            {t("form.fixed_fee_amount_label")}{" "}
+            <span className="text-destructive">*</span>
+          </Label>
+          <Input
+            id="req_fixed_fee"
+            type="number"
+            inputMode="numeric"
+            min={0}
+            value={fixedFeeAmount}
+            onChange={(e) => setFixedFeeAmount(e.target.value)}
+            className="rounded-[12px]"
+          />
+        </div>
+      )}
+
+      {/* Notes */}
+      <div className="space-y-2">
+        <Label htmlFor="req_notes">{t("form.notes_label")}</Label>
+        <Textarea
+          id="req_notes"
+          value={notes}
+          onChange={(e) => setNotes(e.target.value)}
+          placeholder={t("form.notes_placeholder")}
+          rows={3}
+          maxLength={2000}
+          className="rounded-[12px]"
+        />
+      </div>
+
+      {/* Submit */}
+      <div className="flex justify-end pt-2">
+        <Button
+          type="submit"
+          size="pill"
+          disabled={isPending}
+          style={{ backgroundColor: "#71D083", color: "#000" }}
+        >
+          {isPending ? "..." : t("form.submit_cta")}
+        </Button>
+      </div>
+    </form>
+  );
+}
diff --git a/src/components/app/sidebar-nav.tsx b/src/components/app/sidebar-nav.tsx
index b472f42..34a65f7 100644
--- a/src/components/app/sidebar-nav.tsx
+++ b/src/components/app/sidebar-nav.tsx
@@ -15,6 +15,7 @@ import {
   LayoutDashboard,
   Sparkles,
   Mailbox,
+  Megaphone,
   ChevronDown,
   type LucideIcon,
 } from "lucide-react";
@@ -28,6 +29,11 @@ import {
 import { SidebarGroupLabel } from "./sidebar-group-label";
 import type { ProfileRole, WorkspaceRole } from "@/lib/app/context";
 
+// Phase 7 Wave B.1 — must mirror WorkspaceItem.kind in workspace-switcher.tsx.
+// Wave C.1 expands this to include 'creator'; the CTA below already excludes
+// non-sponsor kinds, so adding 'creator' there is a no-op for this component.
+type WorkspaceKindForNav = "brand" | "artist" | "yagi_admin" | "creator";
+
 type NavItem = {
   key: string;
   href?: string;
@@ -91,6 +97,17 @@ const GROUPS: NavGroup[] = [
           { key: "challenges_open", href: "/app/admin/challenges?state=open" },
         ],
       },
+      {
+        // Phase 7 Wave A.2 + Hotfix-4: yagi_admin campaign console.
+        key: "campaigns",
+        icon: Megaphone,
+        roles: ["yagi_admin"],
+        children: [
+          { key: "campaigns_all", href: "/app/admin/campaigns" },
+          { key: "campaigns_new", href: "/app/admin/campaigns/new" },
+          { key: "campaigns_published", href: "/app/admin/campaigns?status=published" },
+        ],
+      },
       // Phase 2.7.1: preprod / showcases / storyboards / brands removed
       // from the active sidebar. Routes still work for direct navigation;
       // phasing out from primary IA per visibility pass.
@@ -252,10 +269,14 @@ export function SidebarNav({
   roles,
   profileRole,
   isYagiInternalMember,
+  activeWorkspaceKind,
 }: {
   roles: WorkspaceRole[];
   profileRole: ProfileRole | null;
   isYagiInternalMember: boolean;
+  /** Phase 7 Wave B.1 — current active workspace's kind. Used to gate the
+   *  [+ 캠페인 요청] CTA to brand + artist sponsor-eligible workspaces only. */
+  activeWorkspaceKind?: WorkspaceKindForNav | null;
 }) {
   const t = useTranslations("nav");
   const pathname = usePathname();
@@ -291,9 +312,33 @@ export function SidebarNav({
   );
   const activeKey = computeActiveKey(allLeaves, pathname, searchParams);
 
+  // Phase 7 Wave B.1 — sponsor-eligible workspaces (brand/artist) get a
+  // prominent [+ 캠페인 요청] CTA at the top of the nav. Creator + yagi_admin
+  // workspaces don't see it (admin uses /app/admin/campaigns/new directly).
+  const showCampaignRequestCta =
+    activeWorkspaceKind === "brand" || activeWorkspaceKind === "artist";
+  const campaignRequestActive = pathname === "/app/campaigns/request";
+
   return (
     <TooltipProvider delayDuration={300}>
       <nav className="flex flex-col px-2 pb-3" aria-label="Operations">
+        {showCampaignRequestCta && (
+          <div className="px-1 pt-2 pb-3">
+            <Link
+              href="/app/campaigns/request"
+              aria-current={campaignRequestActive ? "page" : undefined}
+              className={cn(
+                "flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-medium border transition-colors",
+                campaignRequestActive
+                  ? "bg-foreground text-background border-foreground"
+                  : "bg-card text-foreground border-border hover:border-foreground/40 hover:bg-accent/50",
+              )}
+            >
+              <span aria-hidden="true">+</span>
+              <span>{t("request_campaign_cta")}</span>
+            </Link>
+          </div>
+        )}
         {visibleGroups.map((group) => {
           const showLabel = group.items.length >= 2;
           return (
diff --git a/src/components/app/sidebar.tsx b/src/components/app/sidebar.tsx
index 9b180e0..c13e951 100644
--- a/src/components/app/sidebar.tsx
+++ b/src/components/app/sidebar.tsx
@@ -72,6 +72,7 @@ function SidebarBody({
           roles={context.workspaceRoles}
           profileRole={context.profile.role}
           isYagiInternalMember={internalMember}
+          activeWorkspaceKind={activeWorkspace?.kind ?? null}
         />
       </div>
       <div className="p-3 border-t border-border">
diff --git a/src/lib/notifications/kinds.ts b/src/lib/notifications/kinds.ts
index 0a021bf..93159f8 100644
--- a/src/lib/notifications/kinds.ts
+++ b/src/lib/notifications/kinds.ts
@@ -30,7 +30,13 @@ export type NotificationKind =
   | "meeting_cancelled"
   | "support_message_new"
   // Phase 3.0 task_04 — project lifecycle
-  | "project_submitted";
+  | "project_submitted"
+  // Phase 7 Wave B — sponsor-side campaign request lifecycle (5 transitions)
+  | "campaign_request_received"
+  | "campaign_request_in_review"
+  | "campaign_request_approved"
+  | "campaign_request_declined"
+  | "campaign_request_more_info";
 
 export type NotificationSeverity = "high" | "medium" | "low";
 
@@ -59,6 +65,12 @@ export const SEVERITY_BY_KIND: Record<NotificationKind, NotificationSeverity> =
   support_message_new: "medium",
   // Phase 3.0 task_04
   project_submitted: "high",
+  // Phase 7 Wave B — sponsor sees these in their workspace bell
+  campaign_request_received: "medium",
+  campaign_request_in_review: "medium",
+  campaign_request_approved: "high",
+  campaign_request_declined: "high",
+  campaign_request_more_info: "high",
 };
 
 export function severityOf(kind: NotificationKind): NotificationSeverity {

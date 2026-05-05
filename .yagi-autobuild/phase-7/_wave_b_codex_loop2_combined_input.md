Phase 7 Wave B — K-05 LOOP-2 (cascade verification of LOOP-1 inline fix).

LOOP-1 returned 1 MED-B finding: TOCTOU race in admin status transitions.
LOOP-1 inline fix applied as a cascade-not-cycle change:
- Added `.in("status", requireFromStatus)` and `.select("id")` to the UPDATE
  in `transitionRequestStatus` so the UPDATE itself is a CAS (atomic row
  filter), not a separate select-then-update.
- Added rowCount=0 → "stale_status" return path so the caller surfaces a
  friendly toast and refreshes when the CAS lost the race.
- Notification fires only AFTER the CAS UPDATE succeeded.
- The remaining `decision_metadata.history` concurrent-append edge (where
  two admins on different transitions both see `in_review` and the second
  loser's history append is lost) is registered as
  FU-Phase7-B-K05-F1-rpc-jsonb-history-append (Phase 8 RPC fix).

Per L-052 cascade-vs-cycle distinction: this is a CASCADE fix (inline change
to address the LOOP-1 finding), not a re-test of the same LOOP-1 surface.
Confirm:

1. The CAS UPDATE pattern in `transitionRequestStatus` correctly forecloses
   the LOOP-1 finding's exploit scenario (concurrent admins racing the same
   source state both passing the source-state check then last-write-wins).
2. The new "stale_status" error path is consistent with the rest of the
   action's error contract.
3. No NEW security/correctness regression introduced by the cascade fix.
4. K-06 inline fixes (Findings 1-3 + F8 trivial wording) did not introduce
   any new code-correctness issue:
   - request-form.tsx asset row: `flex flex-col sm:flex-row` + `min-w-0`
     on URL input (responsive layout fix only, no security surface).
   - review-actions.tsx: removed per-button helper text + ActionButton
     simplified to a single Button (no logic change, only render).
   - review/page.tsx back link: dynamic `?status=${campaign.status}` (uses
     server-fetched value; no user input injection).
   - en.json sponsorship_co_sponsor renamed `Partner / shared funding` →
     `Shared funding` for consistency with admin review surface.

## Files changed since LOOP-1

- `src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts` —
  CAS pattern in transitionRequestStatus (lines ~530-560).
- `src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx` —
  toast for stale_status path + helper text removal + ActionButton simpler.
- `src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx` —
  back link uses dynamic campaign.status.
- `src/app/[locale]/app/campaigns/request/request-form.tsx` —
  reference asset row mobile responsive layout.
- `messages/{ko,en}.json` — toast_stale_status key added; per-button
  helpers removed; actions_summary single-line guidance added;
  sponsorship_co_sponsor en value normalized.

## Already-deferred (do NOT flag)

- LOOP-1 verdict (MED-B FINDING 1) — LOOP-2 cascade fix here.
- LOW K-06 findings 4/5/6/7/9 — all FU-registered.
- All Wave A K-05 + K-06 surfaces.
- HF4 carried-over `project_detail.timeline.routing` wording finding (Phase 8).
- All Wave C/D scope.

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding (HIGH or MED only):
[FINDING N] CLASS: <HIGH-A|HIGH-B|HIGH-C|MED-A|MED-B|MED-C>: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave B LOOP-2 cascade fix resolves LOOP-1 finding without regression. Ready for ff-merge gate."

End with one-line summary.

=== END OF PROMPT — DIFF (since c820056) FOLLOWS ===

diff --git a/messages/en.json b/messages/en.json
index bf99200..b7365f3 100644
--- a/messages/en.json
+++ b/messages/en.json
@@ -2179,7 +2179,7 @@
       "sponsorship_intent_label": "Funding intent (optional)",
       "sponsorship_intent_placeholder": "Select",
       "sponsorship_self": "Self-funded",
-      "sponsorship_co_sponsor": "Partner / shared funding",
+      "sponsorship_co_sponsor": "Shared funding",
       "sponsorship_yagi_assist": "Leave to the YAGI team",
       "compensation_intent_label": "Creator compensation intent (optional)",
       "compensation_intent_placeholder": "Select",
@@ -2335,20 +2335,18 @@
       "actions_title": "Review actions",
       "comment_label": "Note (optional, sent to the requester)",
       "comment_placeholder": "Decline reason, requested follow-ups, etc. Included in the decision notification.",
+      "actions_summary": "Approve moves to draft · Decline requires a note · Request more info returns it to the requester.",
       "action_review": "Start review",
       "action_approve": "Approve (move to draft)",
       "action_decline": "Decline",
       "action_more_info": "Request more info",
-      "action_review_helper": "Sends an \"under review\" notification to the requester.",
-      "action_approve_helper": "Moves the campaign to draft so the YAGI team can author it.",
-      "action_decline_helper": "Add the decline reason in the note field.",
-      "action_more_info_helper": "Returns the request to the requester with your follow-up notes.",
       "toast_review_started": "Review started.",
       "toast_approved": "Campaign request approved. Moved to draft.",
       "toast_declined": "Campaign request declined.",
       "toast_more_info_requested": "Sent the requester a follow-up.",
       "toast_error": "Could not complete the action. Please try again.",
       "toast_decline_comment_required": "Decline requires a reason in the note field.",
+      "toast_stale_status": "Another admin already changed the status. Reloading to show the latest state.",
       "guard_not_request_stage": "This campaign is no longer in the request stage. Use the regular edit view instead.",
       "compensation_exposure_only": "Exposure only",
       "compensation_fixed_fee": "Fixed fee",
diff --git a/messages/ko.json b/messages/ko.json
index 458aba4..16c1313 100644
--- a/messages/ko.json
+++ b/messages/ko.json
@@ -2400,20 +2400,18 @@
       "actions_title": "검토 액션",
       "comment_label": "메모 (선택, 요청자에게 전달)",
       "comment_placeholder": "거절 사유, 보완 요청 항목 등을 적어주세요. 검토 결과 알림에 함께 전달됩니다.",
+      "actions_summary": "승인은 초안으로 이동, 거절은 사유 메모 필수, 추가 정보 요청은 요청자에게 다시 보냅니다.",
       "action_review": "검토 시작",
       "action_approve": "승인 (초안으로)",
       "action_decline": "거절",
       "action_more_info": "추가 정보 요청",
-      "action_review_helper": "요청자에게 \"검토 중\" 알림이 발송됩니다.",
-      "action_approve_helper": "캠페인이 초안 상태가 되어 야기 팀이 작성을 이어갑니다.",
-      "action_decline_helper": "거절 사유는 메모에 적어주세요.",
-      "action_more_info_helper": "요청 상태로 되돌리고 요청자에게 보완 요청 알림을 보냅니다.",
       "toast_review_started": "검토를 시작했어요.",
       "toast_approved": "캠페인 요청을 승인했어요. 초안으로 이동했습니다.",
       "toast_declined": "캠페인 요청을 거절했어요.",
       "toast_more_info_requested": "요청자에게 추가 정보를 요청했어요.",
       "toast_error": "처리 중 오류가 발생했어요. 다시 시도해주세요.",
       "toast_decline_comment_required": "거절 시에는 사유 메모가 필요해요.",
+      "toast_stale_status": "다른 관리자가 이미 상태를 변경했어요. 새 상태를 확인해주세요.",
       "guard_not_request_stage": "이 캠페인은 요청 단계가 아니에요. 일반 편집 화면을 사용해주세요.",
       "compensation_exposure_only": "노출만",
       "compensation_fixed_fee": "정액 보상",
diff --git a/src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx b/src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx
index a02c808..d828bc5 100644
--- a/src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx
+++ b/src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx
@@ -121,8 +121,12 @@ export default async function AdminCampaignReviewPage({ params }: Props) {
     <div className="px-6 md:px-10 py-12 max-w-3xl space-y-10">
       {/* Header */}
       <div className="space-y-3">
+        {/* K-06 LOOP-1 F3 fix: back link drops admin onto the tab they came
+            from (matches campaign.status), not always 'requested'. Falls back
+            to 'requested' for non-request stages so admins land in the
+            primary queue when navigating back from a stale link. */}
         <Link
-          href="/app/admin/campaigns?status=requested"
+          href={`/app/admin/campaigns?status=${isRequestStage ? campaign.status : "requested"}`}
           className="text-xs text-muted-foreground hover:underline underline-offset-2"
         >
           {t("review.back_to_list")}
diff --git a/src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx b/src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx
index bcfc284..4fb227d 100644
--- a/src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx
+++ b/src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx
@@ -65,6 +65,10 @@ export function ReviewActions({
       if (!result.ok) {
         if (result.error === "comment_required") {
           toast.error(t("toast_decline_comment_required"));
+        } else if (result.error === "stale_status") {
+          toast.error(t("toast_stale_status"));
+          // Refresh so the page reflects the current server-side status.
+          router.refresh();
         } else {
           toast.error(t("toast_error"));
         }
@@ -117,14 +121,21 @@ export function ReviewActions({
           maxLength={2000}
           className="rounded-[12px]"
         />
+        {/* K-06 LOOP-1 F2 fix: replace 3 per-button helper paragraphs (which
+            visually competed with the action buttons and blunted the
+            primary-action signal) with a single quiet guidance line. */}
+        {actionsForStatus.length > 1 && (
+          <p className="text-[11px] text-muted-foreground keep-all leading-snug">
+            {t("actions_summary")}
+          </p>
+        )}
       </div>
 
-      {/* Action buttons */}
-      <div className="flex flex-wrap gap-3">
+      {/* Action buttons — primary first, ghost (decline) last per visual weight */}
+      <div className="flex flex-wrap gap-3 items-center">
         {actionsForStatus.includes("review") && (
           <ActionButton
             label={t("action_review")}
-            helper={t("action_review_helper")}
             disabled={isPending}
             isLoading={isPending && pendingAction === "review"}
             onClick={() => run("review")}
@@ -134,7 +145,6 @@ export function ReviewActions({
         {actionsForStatus.includes("approve") && (
           <ActionButton
             label={t("action_approve")}
-            helper={t("action_approve_helper")}
             disabled={isPending}
             isLoading={isPending && pendingAction === "approve"}
             onClick={() => run("approve")}
@@ -144,7 +154,6 @@ export function ReviewActions({
         {actionsForStatus.includes("more_info") && (
           <ActionButton
             label={t("action_more_info")}
-            helper={t("action_more_info_helper")}
             disabled={isPending}
             isLoading={isPending && pendingAction === "more_info"}
             onClick={() => run("more_info")}
@@ -154,7 +163,6 @@ export function ReviewActions({
         {actionsForStatus.includes("decline") && (
           <ActionButton
             label={t("action_decline")}
-            helper={t("action_decline_helper")}
             disabled={isPending}
             isLoading={isPending && pendingAction === "decline"}
             onClick={() => run("decline")}
@@ -168,14 +176,12 @@ export function ReviewActions({
 
 function ActionButton({
   label,
-  helper,
   onClick,
   disabled,
   isLoading,
   variant,
 }: {
   label: string;
-  helper: string;
   onClick: () => void;
   disabled: boolean;
   isLoading: boolean;
@@ -188,20 +194,15 @@ function ActionButton({
   const buttonVariant =
     variant === "primary" ? "default" : variant === "outline" ? "outline" : "ghost";
   return (
-    <div className="flex flex-col gap-1.5 max-w-[280px]">
-      <Button
-        type="button"
-        size="pill"
-        variant={buttonVariant}
-        onClick={onClick}
-        disabled={disabled}
-        style={style}
-      >
-        {isLoading ? "..." : label}
-      </Button>
-      <p className="text-[11px] text-muted-foreground keep-all leading-snug">
-        {helper}
-      </p>
-    </div>
+    <Button
+      type="button"
+      size="pill"
+      variant={buttonVariant}
+      onClick={onClick}
+      disabled={disabled}
+      style={style}
+    >
+      {isLoading ? "..." : label}
+    </Button>
   );
 }
diff --git a/src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts b/src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts
index 05423b5..7151e8a 100644
--- a/src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts
+++ b/src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts
@@ -544,23 +544,41 @@ async function transitionRequestStatus(
     comment: comment ?? null,
   });
 
-  const { error: updateErr } = await sbAdmin
+  // K-05 LOOP-1 MED-B fix: TOCTOU race on concurrent admin transitions.
+  // Without a status guard on the UPDATE, two admins acting on an in_review
+  // row could both pass the source-state check and last-write-wins.
+  // The .in("status", requireFromStatus) makes the UPDATE itself a CAS:
+  // it only writes if the row is still in one of the expected source states.
+  // Returning rows tells us whether the CAS succeeded.
+  // Note: decision_metadata.history is still built from the prior fetched
+  // state and could lose a concurrent peer's history entry. RPC-based
+  // jsonb concat is the full fix — registered as Wave B FU for Phase 8.
+  const { data: updated, error: updateErr } = await sbAdmin
     .from("campaigns")
     .update({
       status: options.nextStatus,
       decision_metadata: newMetadata as Json,
       updated_at: nowIso,
     })
-    .eq("id", campaignId);
+    .eq("id", campaignId)
+    .in("status", options.requireFromStatus)
+    .select("id");
 
   if (updateErr) {
     console.error("[transitionRequestStatus] update error:", updateErr.message);
     return { ok: false, error: "update_failed" };
   }
+  if (!updated || updated.length === 0) {
+    // Source-state guard saw the expected status but the UPDATE didn't match
+    // — another admin transitioned the row in between. Surface a friendly
+    // error so the caller can refresh and retry.
+    return { ok: false, error: "stale_status" };
+  }
 
   // Notify the original requester (created_by) — they always have visibility
   // even after switching workspaces. Workspace context preserved so the
-  // notification surfaces in the right bell.
+  // notification surfaces in the right bell. Only fired after the CAS UPDATE
+  // succeeded so racing admins don't both notify.
   await notifyRequester(
     campaignId,
     row.created_by,
diff --git a/src/app/[locale]/app/campaigns/request/request-form.tsx b/src/app/[locale]/app/campaigns/request/request-form.tsx
index 6a74377..95e1ded 100644
--- a/src/app/[locale]/app/campaigns/request/request-form.tsx
+++ b/src/app/[locale]/app/campaigns/request/request-form.tsx
@@ -223,32 +223,40 @@ export function RequestCampaignForm({
       <div className="space-y-3">
         <Label>{t("form.reference_assets_label")}</Label>
         {referenceAssets.length > 0 && (
-          <div className="space-y-2">
+          <div className="space-y-3">
             {referenceAssets.map((asset, idx) => (
-              <div key={idx} className="flex gap-2">
+              // K-06 LOOP-1 F1 fix: stack URL + label vertically on mobile so
+              // the URL field doesn't collapse to ~120px on a 360px viewport.
+              // sm: breakpoint restores the inline 3-column layout.
+              <div
+                key={idx}
+                className="flex flex-col sm:flex-row gap-2"
+              >
                 <Input
                   type="url"
                   placeholder="https://..."
                   value={asset.url}
                   onChange={(e) => updateAsset(idx, "url", e.target.value)}
-                  className="flex-1 rounded-[12px]"
+                  className="flex-1 min-w-0 rounded-[12px]"
                 />
-                <Input
-                  placeholder={t("form.reference_label_placeholder")}
-                  value={asset.label}
-                  onChange={(e) => updateAsset(idx, "label", e.target.value)}
-                  maxLength={200}
-                  className="w-40 rounded-[12px]"
-                />
-                <Button
-                  type="button"
-                  variant="ghost"
-                  size="sm"
-                  onClick={() => removeAsset(idx)}
-                  className="text-muted-foreground"
-                >
-                  {t("form.remove_asset")}
-                </Button>
+                <div className="flex gap-2">
+                  <Input
+                    placeholder={t("form.reference_label_placeholder")}
+                    value={asset.label}
+                    onChange={(e) => updateAsset(idx, "label", e.target.value)}
+                    maxLength={200}
+                    className="flex-1 sm:w-40 sm:flex-none rounded-[12px]"
+                  />
+                  <Button
+                    type="button"
+                    variant="ghost"
+                    size="sm"
+                    onClick={() => removeAsset(idx)}
+                    className="text-muted-foreground shrink-0"
+                  >
+                    {t("form.remove_asset")}
+                  </Button>
+                </div>
               </div>
             ))}
           </div>

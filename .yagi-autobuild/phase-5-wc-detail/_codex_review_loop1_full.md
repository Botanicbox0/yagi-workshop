Reading prompt from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: medium
reasoning summaries: none
session id: 019df347-f11f-7552-8236-83b71aaed0e3
--------
user
Phase 5 Wave C — K-05 LOOP 1 (Tier 2 medium).

Scope: detail page redesign (5-tab structure) + status timeline + brief
read-only view + 현황 tab composition (timeline + CTA + brief summary +
attachment summary + comments placeholder) + 2 new server actions
(approveDeliveredAction / requestRevisionAction) + in_review material
append modal.

No DB schema change. Existing RPC `transition_project_status` reused
(creator-first matrix from Wave B 20260504200001 already applied).
Wave B.5 added `submitted → draft` and `in_review → draft` to client
matrix (20260504220000). is_valid_transition truth table NOT modified
this Wave.

## Files in scope (14 total, all under 20-file budget)

NEW:
- `src/app/[locale]/app/projects/[id]/cta-actions.ts`
  • approveDeliveredAction (delivered → approved via RPC)
  • requestRevisionAction (delivered → in_revision; comment ≥10 chars)
  • PostgrestError → discriminated-union map: 42501/P0002 → forbidden,
    23514 → invalid_transition, 22023 → comment_required, else → unknown
  • revalidatePath on success
- `src/components/project-detail/status-timeline.tsx` (rewritten by C_2)
  • Vertical 7-step stepper. in_revision = inline badge on in_progress.
  • Sage #71D083 current step, completed = checkmark, future = muted.
  • Server component, props { status, labels }.
- `src/components/project-detail/status-tab.tsx` (rewritten by C_3)
  • Composition only: StatusTimeline + NextActionCTA + BriefSummaryCard
    + AttachmentSummary + comments placeholder.
- `src/components/project-detail/brief-tab.tsx` (rewritten by C_4)
  • Stage 1/2/3 read-only view. dt/dd structure, NO input controls.
  • Draft banner + [브리프 완성하기 →] CTA when status='draft'.
  • interested_in_twin 3-way (true/false/null = 미응답).
- `src/components/project-detail/brief-summary-card.tsx` (C_3)
  • title + deliverable_types chips + description first 80 chars
    (Intl.Segmenter grapheme-aware truncate) + view-all link.
- `src/components/project-detail/attachment-summary.tsx` (C_3)
  • Count header + top-3 thumbnail strip (~64px) + view-all link.
- `src/components/project-detail/next-action-cta.tsx` (C_3, "use client")
  • Status-keyed CTA renderer. Delivered placeholder modal.
  • Hides for non-owner viewers.
  • Renders MaterialAppendModal in_review.
- `src/components/project-detail/material-append-modal.tsx` (C_3, "use client")
  • AlertDialog with kind/source selectors + file/url input.
  • Calls Wave B addBriefingDocumentAction + getBriefingDocumentPutUrlAction.
- `src/components/project-detail/cancelled-archived-banner.tsx` (C_5)
  • Sage left-edge bar + bg-sage-soft tint. Text + cancelled-link variant.
- `src/components/project-detail/empty-state-tab.tsx` (C_5)
  • Generic empty state for comments/deliverables placeholder tabs.

MODIFIED:
- `src/app/[locale]/app/projects/[id]/page.tsx`
  • parseTab: progress→status default. 5-tab routing.
  • Extended SELECT: full briefing fields (mood/visual/channels/
    target/notes/twin/submitted_at) + creator profile fetch.
  • Briefing_documents fetch (count by kind + top-3 with thumbnail).
  • Banner above breadcrumb when terminal status.
  • L4/L5 rewired to 5-tab content router.
- `src/components/project-detail/tabs.tsx`
  • TabKey union: status|brief|board|comments|deliverables.
  • Disabled tabs (comments/deliverables) render `<span>` not `<Link>`.
- `messages/ko.json` + `messages/en.json` — KO+EN parity for all
  new namespaces under projects.status.* (label/helper) and
  project_detail.* (tab/banner/status/summary_card/attachments/
  comments_thread/delivered_placeholder/material_append/brief_tab/
  empty_state). Existing project_detail.status.<enum> flat keys are
  shadowed by new project_detail.status.{cta,banner,empty_state} block;
  no remaining consumers of the flat keys (ProgressTab dropped from
  page.tsx). Cleanup deferred to Wave C ff-merge.

## Out of scope (do NOT review)

- Briefing Canvas (Wave B / Wave B.5) files: briefing-canvas.tsx,
  briefing-canvas-step-1/2/3.tsx, briefing-step2-actions.ts,
  briefing-step3-actions.ts, briefing-actions.ts, recall-actions.ts,
  recall-button.tsx — already CLEAN at Wave B / Wave B.5 reviews.
- All migrations (no schema change this Wave). is_valid_transition,
  transition_project_status, projects RLS, briefing_documents RLS
  unchanged.
- Existing Phase 4.x detail components (HeroCard, InfoRail, BoardTab,
  ProgressTab, AdminDeleteButton, ProjectActionButtons) — Wave C did
  not modify their internals.

## Risk surface (per SPEC §"Codex K-05" + §"Risk surface")

1. **Brief summary card RLS read** — page.tsx fetches projects row
   via user-scoped supabase client; RLS gates by created_by OR
   workspace_member OR yagi_admin. Verify cross-workspace project ID
   in `?tab=` does not leak: tab routing is purely a query param,
   the projects SELECT is by id and RLS-scoped. `notFound()` returns
   if project missing or denied.

2. **delivered/approved server actions** — cta-actions.ts.
   - Both actions use createSupabaseServer (user-scoped) → RPC
     transition_project_status. The RPC's creator-first role
     resolution (Wave B 20260504200001) means the workspace
     creator is resolved as 'client' for own-project transitions
     even when they hold workspace_admin. is_valid_transition's
     client matrix allows delivered→approved AND delivered→in_revision
     (Phase 3.0 baseline).
   - For NON-creator viewers (e.g., yagi_admin or ws_admin acting
     on someone else's project), RPC resolves them to admin role.
     Admin matrix does NOT include delivered→approved (intentionally
     client-only) and DOES include delivered→in_revision via the
     in_revision branch? Actually no: admin matrix is in_review→
     in_progress, in_revision→in_progress, in_progress→delivered,
     approved→archived, *→cancelled. Admin attempting
     delivered→approved or delivered→in_revision = invalid_transition
     (23514). Verify the action layer maps this to the correct
     'invalid_transition' return rather than silently succeeding.
   - Verify revalidatePath is called only on success.
   - Verify p_comment ≥10 enforcement is double-layered (zod
     min(10) at action AND RPC raise 22023). Pre-zod surface
     prevents needless RPC round-trips.

3. **Tab routing (?tab=) cross-workspace project ID injection** —
   parseTab simply maps the value to a TabKey enum. The actual
   project ID is from the route segment `[id]`. Verify there's no
   path where a malicious ?tab= or workspace switch slips a
   different project ID into the briefing_documents query.

4. **Cancelled / archived banner bypass** — banner is rendered at
   page.tsx based on project.status. For terminal-status projects
   the page still renders (read-only mode). Verify there's no
   path where the banner is suppressed but write-side actions
   become reachable. (RLS on briefing_documents update/insert
   already requires status='draft' from Wave A sub_5; in_review
   write surface is an explicitly out-of-scope FU-Phase5-16 anyway.)

5. **briefing_documents append RLS in in_review** — material-append-
   modal calls Wave B's addBriefingDocumentAction in in_review
   status. RLS INSERT WITH CHECK on briefing_documents requires
   parent project status='draft' (Wave A sub_5 fix F2). The
   in_review caller WILL hit forbidden. Verify the modal surfaces
   the error cleanly (toast.error mapping to error_rls_pending /
   error_forbidden / error_unknown). This is an honest UX of a
   known limitation; FU-Phase5-16 covers the policy update.

6. **briefing_documents SELECT RLS in page.tsx** — fetch top-3 by
   project_id. RLS on briefing_documents SELECT is workspace_member
   OR yagi_admin. Verify the page.tsx SELECT cannot leak rows
   from another project (the .eq('project_id', project.id) is
   redundant with RLS but acts as defense-in-depth).

7. **MaterialAppendModal R2 prefix binding** — the modal calls
   getBriefingDocumentPutUrlAction (Wave B) which generates
   `briefing-docs/${auth.userId}/${kind}/<uuid>.<ext>`.
   addBriefingDocumentAction re-validates the prefix. Verify
   that wiring works the same when called from this Wave C modal
   (no parameter shape drift).

## Already-deferred (do NOT flag again)

- FU-Phase5-10 (full comment thread)
- FU-Phase5-11 (deliverables download surface)
- FU-Phase5-12 (mobile responsive polish)
- FU-Phase5-13 (brief edit affordance expansion D5 B/C)
- FU-Phase5-14 (routing status timeline + matrix)
- FU-Phase5-15 (delivered/approved real UI surface)
- FU-Phase5-16 (briefing_documents INSERT RLS for in_review status)
  — registered in this Wave for the modal's known limitation.
- All Wave A/B/B.5 deferred FUs.

## Builder grep audit pre-step (per Phase 5 KICKOFF rule)

Verified pre-review:
- All `transition_project_status` callers (cta-actions.ts approve +
  revision, recall-actions.ts recall, briefing-step3-actions.ts
  submit) follow the same pattern: createSupabaseServer +
  resolveActiveWorkspace + sb.rpc. Creator-first role resolution
  Wave B 20260504200001 covers all paths.
- All `briefing_documents` SELECTs (page.tsx Wave C, briefing-
  canvas-step-2.tsx Wave B) use `.eq("project_id", ...)` with
  RLS-scoped client. No raw .from() with no eq filter found.
- `?tab=` parsing is in page.tsx parseTab() only. No other route
  consumes the param. Cross-workspace project ID injection is
  prevented by the route segment + RLS on projects SELECT.

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave C ready for ff-merge to main."

Scale-aware rule: <100 user prod, all-trusted. MED-B/C → FU register
+ proceed. HIGH → HALT.

End with one-line summary suitable for the run log.

codex
I’ll review this as a code-review pass focused on the listed Wave C risk surface and only the in-scope files. I’m going to inspect the relevant diffs and targeted call paths first, then verify the action/error handling and tab/data queries.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "transition_project_status|approveDeliveredAction|requestRevisionAction|parseTab|briefing_documents|MaterialAppendModal|revalidatePath|PostgrestError|project_detail.status|projects.status" src messages -S' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg --files src/app/[locale]/app/projects/[id] src/components/project-detail messages' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 498ms:
src\components\admin\projects-queue.tsx:7:import { StatusBadge } from '@/components/projects/status-badge';
src\lib\workspace\actions.ts:16:import { revalidatePath } from "next/cache";
src\lib\workspace\actions.ts:67:  revalidatePath("/[locale]/app", "layout");
src\lib\supabase\database.types.ts:2706:      transition_project_status: {
src\lib\commission\actions.ts:3:import { revalidatePath } from "next/cache";
src\lib\commission\actions.ts:74:  revalidatePath("/app/commission");
src\lib\commission\actions.ts:127:  revalidatePath("/app/admin/commissions");
src\lib\commission\actions.ts:128:  revalidatePath(`/app/admin/commissions/${parsed.data.intake_id}`);
src\lib\commission\actions.ts:129:  revalidatePath("/app/commission");
src\lib\commission\actions.ts:130:  revalidatePath(`/app/commission/${parsed.data.intake_id}`);
src\lib\commission\actions.ts:153:  revalidatePath("/app/commission");
src\lib\commission\actions.ts:154:  revalidatePath(`/app/commission/${intakeId}`);
src\components\project-detail\attachment-summary.tsx:10://   1. briefing_documents.thumbnail_url (set by Wave B oembed proxy for
src\components\projects\action-modals\revision-request-modal.tsx:9:import { requestRevisionAction } from '@/components/projects/project-actions';
src\components\projects\action-modals\revision-request-modal.tsx:63:        await requestRevisionAction(projectId, trimmed);
src\components\projects\project-actions.ts:4:import { revalidatePath } from 'next/cache';
src\components\projects\project-actions.ts:13:  const { data, error } = await (supabase.rpc as any)('transition_project_status', {
src\components\projects\project-actions.ts:24:  revalidatePath('/[locale]/app/admin/projects', 'page');
src\components\projects\project-actions.ts:25:  revalidatePath(`/[locale]/app/projects/${id}`, 'page');
src\components\projects\project-actions.ts:46:export async function requestRevisionAction(id: string, comment: string) {
src\components\projects\project-action-buttons.tsx:5:// which calls transition_project_status RPC — never direct UPDATE.
src\components\project-board\version-history-panel.tsx:50:      // revalidatePath in updateProjectBoardAction's chain (or explicit
src\app\challenges\[slug]\submit\actions.ts:8:import { revalidatePath } from "next/cache";
src\app\challenges\[slug]\submit\actions.ts:304:  revalidatePath(`/challenges/${slug}/gallery`);
src\components\project-detail\material-append-modal.tsx:9://   3. INSERT into briefing_documents via Wave B addBriefingDocumentAction
src\components\project-detail\material-append-modal.tsx:14:// Note (FU-Phase5-16): briefing_documents INSERT RLS (Wave A sub_5 F2)
src\components\project-detail\material-append-modal.tsx:44:import type { MaterialAppendModalLabels } from "./next-action-cta";
src\components\project-detail\material-append-modal.tsx:49:export function MaterialAppendModal({
src\components\project-detail\material-append-modal.tsx:54:  labels: MaterialAppendModalLabels;
src\components\project-detail\material-append-modal.tsx:138:        console.error("[MaterialAppendModal] submit threw:", e);
src\components\project-detail\next-action-cta.tsx:9://   in_review     → [자료 추가하기]  → opens MaterialAppendModal (kind selector)
src\components\project-detail\next-action-cta.tsx:17://   - approveDeliveredAction / requestRevisionAction live in
src\components\project-detail\next-action-cta.tsx:22://   - in_review append form ships here via MaterialAppendModal.
src\components\project-detail\next-action-cta.tsx:28:import { MaterialAppendModal } from "./material-append-modal";
src\components\project-detail\next-action-cta.tsx:44:    // MaterialAppendModal labels (passed-through)
src\components\project-detail\next-action-cta.tsx:45:    modal: MaterialAppendModalLabels;
src\components\project-detail\next-action-cta.tsx:49:export type MaterialAppendModalLabels = {
src\components\project-detail\next-action-cta.tsx:109:      <MaterialAppendModal
src\app\showcase\[slug]\actions.ts:12:import { revalidatePath } from "next/cache";
src\app\showcase\[slug]\actions.ts:104:  if (slug) revalidatePath(`/showcase/${slug}`);
src\components\projects\status-badge.tsx:55:      {t(`projects.status_${status}` as any)}
src\components\project-detail\status-tab.tsx:18:  type MaterialAppendModalLabels,
src\components\project-detail\status-tab.tsx:59:      modal: MaterialAppendModalLabels;
src\app\challenges\[slug]\gallery\actions.ts:3:import { revalidatePath } from "next/cache";
src\app\challenges\[slug]\gallery\actions.ts:46:  revalidatePath(`/challenges/${slug}/gallery`);
src\app\[locale]\app\notifications\actions.ts:7:import { revalidatePath } from "next/cache";
src\app\[locale]\app\notifications\actions.ts:76:  revalidatePath("/[locale]/app", "layout");
src\app\[locale]\app\notifications\actions.ts:98:  revalidatePath("/[locale]/app", "layout");
src\app\[locale]\app\preprod\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\preprod\actions.ts:63:    revalidatePath(`/${locale}/app/preprod`);
src\app\[locale]\app\admin\commissions\[id]\actions.ts:19:import { revalidatePath } from "next/cache";
src\app\[locale]\app\admin\commissions\[id]\actions.ts:89:  revalidatePath(
src\app\[locale]\app\admin\commissions\[id]\actions.ts:93:  revalidatePath("/[locale]/app/admin/commissions", "page");
src\app\[locale]\app\admin\commissions\[id]\actions.ts:94:  revalidatePath(`/[locale]/app/projects/${result.projectId}`, "page");
src\app\[locale]\app\meetings\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\meetings\actions.ts:296:    revalidatePath(`/${locale}/app/meetings`);
src\app\[locale]\app\meetings\actions.ts:298:      revalidatePath(`/${locale}/app/projects/${projectId}`);
src\app\[locale]\app\meetings\actions.ts:305:    revalidatePath(`/${locale}/app/meetings/${meetingId}`);
src\app\[locale]\app\meetings\actions.ts:306:    revalidatePath(`/${locale}/app/meetings`);
src\app\[locale]\app\meetings\request-actions.ts:26:import { revalidatePath } from "next/cache";
src\app\[locale]\app\meetings\request-actions.ts:184:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\meetings\request-actions.ts:185:  revalidatePath("/[locale]/app/meetings", "page");
src\app\[locale]\app\meetings\request-actions.ts:219:  revalidatePath("/[locale]/app/meetings", "page");
src\app\[locale]\app\meetings\request-actions.ts:220:  revalidatePath(`/[locale]/app/meetings/${parsed.data.meetingId}`, "page");
src\app\[locale]\app\meetings\request-actions.ts:276:  revalidatePath("/[locale]/app/meetings", "page");
src\app\[locale]\app\meetings\request-actions.ts:277:  revalidatePath(`/[locale]/app/meetings/${meeting.id}`, "page");
src\app\[locale]\app\meetings\request-actions.ts:324:  revalidatePath("/[locale]/app/meetings", "page");
src\app\[locale]\app\meetings\request-actions.ts:325:  revalidatePath(`/[locale]/app/meetings/${meeting.id}`, "page");
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:17:    revalidatePath(`/${locale}/app/invoices`);
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:18:    revalidatePath(`/${locale}/app/invoices/${invoiceId}`);
src\app\[locale]\app\invoices\[id]\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\invoices\[id]\actions.ts:22:    revalidatePath(`/${locale}/app/invoices`);
src\app\[locale]\app\invoices\[id]\actions.ts:23:    revalidatePath(`/${locale}/app/invoices/${invoiceId}`);
src\app\[locale]\app\preprod\[id]\share-actions.ts:8:import { revalidatePath } from "next/cache"
src\app\[locale]\app\preprod\[id]\share-actions.ts:35:  revalidatePath("/app/preprod")
src\app\[locale]\app\preprod\[id]\share-actions.ts:36:  revalidatePath(`/app/preprod/${boardId}`)
src\app\[locale]\app\settings\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\settings\actions.ts:92:  revalidatePath(`/[locale]/app/settings`, "page");
src\app\[locale]\app\settings\actions.ts:116:  revalidatePath(`/[locale]/app/settings`, "page");
src\app\[locale]\app\settings\actions.ts:148:  revalidatePath(`/[locale]/app/settings`, "page");
src\app\[locale]\app\settings\actions.ts:190:  revalidatePath(`/[locale]/app/settings`, "page");
src\app\[locale]\app\admin\projects\[id]\page.tsx:11:import { StatusBadge } from "@/components/projects/status-badge";
src\app\[locale]\app\admin\projects\[id]\page.tsx:12:import type { Status } from "@/components/projects/status-badge";
src\app\[locale]\app\projects\new\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\new\actions.ts:191:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\actions.ts:423:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\actions.ts:509:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\actions.ts:510:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src\app\[locale]\app\projects\new\actions.ts:1131:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\actions.ts:1132:  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
src\app\[locale]\app\preprod\[id]\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\preprod\[id]\actions.ts:15:    revalidatePath(`/${locale}/app/preprod`);
src\app\[locale]\app\preprod\[id]\actions.ts:16:    revalidatePath(`/${locale}/app/preprod/${boardId}`);
src\app\[locale]\app\preprod\[id]\actions.ts:278:    revalidatePath(`/${locale}/app/preprod`);
src\app\[locale]\app\invoices\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\invoices\actions.ts:74:    revalidatePath(`/${locale}/app/invoices`);
src\app\[locale]\app\team\[slug]\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\team\[slug]\actions.ts:158:    revalidatePath(`/${data.locale}/app/team/${data.channelSlug}`);
src\app\[locale]\app\team\[slug]\actions.ts:424:    revalidatePath(`/ko/app/team/${inserted.slug}`);
src\app\[locale]\app\team\[slug]\actions.ts:425:    revalidatePath(`/en/app/team/${inserted.slug}`);
src\app\[locale]\app\team\[slug]\actions.ts:467:    revalidatePath(`/ko/app/team/${updated.slug}`);
src\app\[locale]\app\team\[slug]\actions.ts:468:    revalidatePath(`/en/app/team/${updated.slug}`);
src\app\[locale]\app\team\[slug]\actions.ts:506:    revalidatePath(`/ko/app/team/${updated.slug}`);
src\app\[locale]\app\team\[slug]\actions.ts:507:    revalidatePath(`/en/app/team/${updated.slug}`);
src\app\[locale]\app\projects\new\briefing-actions.ts:13://   - addBriefingDocumentAction(input)              — INSERT briefing_documents
src\app\[locale]\app\projects\new\briefing-actions.ts:14://   - removeBriefingDocumentAction(input)           — DELETE briefing_documents
src\app\[locale]\app\projects\new\briefing-actions.ts:30:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\new\briefing-actions.ts:152:      revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\briefing-actions.ts:172:  // briefing_documents under the soft-deleted project become dangling
src\app\[locale]\app\projects\new\briefing-actions.ts:219:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\[id]\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\actions.ts:97:  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:98:  revalidatePath(`/[locale]/app/projects`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:149:  revalidatePath(`/[locale]/app/projects`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:150:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:151:  revalidatePath(`/[locale]/app/admin/trash`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:169:  revalidatePath(`/[locale]/app/projects`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:170:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:171:  revalidatePath(`/[locale]/app/admin/trash`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:202:  revalidatePath(`/[locale]/app/admin/trash`, "page");
src\app\[locale]\app\projects\[id]\board-actions.ts:25:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\board-actions.ts:227:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\board-actions.ts:332:    revalidatePath(
src\app\[locale]\app\projects\[id]\board-actions.ts:447:    revalidatePath(
src\app\[locale]\app\projects\[id]\board-actions.ts:498:    revalidatePath(`/[locale]/app/projects/${board.project_id}`, "page");
src\app\[locale]\app\projects\new\briefing-canvas-step-2-brief.tsx:10:// The list shows briefing_documents WHERE kind='brief' for this project,
src\app\[locale]\app\admin\challenges\actions.ts:3:import { revalidatePath } from "next/cache";
src\app\[locale]\app\admin\challenges\actions.ts:44:    revalidatePath(`/${locale}/app/admin/challenges`);
src\app\[locale]\app\admin\challenges\actions.ts:45:    if (slug) revalidatePath(`/${locale}/app/admin/challenges/${slug}/edit`);
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:3:import { revalidatePath } from "next/cache";
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:83:  revalidatePath(`/app/admin/challenges/${slug}/judge`);
src\app\[locale]\app\projects\[id]\cta-actions.ts:6:// Two thin RPC wrappers, both invoking transition_project_status:
src\app\[locale]\app\projects\[id]\cta-actions.ts:7://   - approveDeliveredAction   (delivered -> approved)   client-only matrix
src\app\[locale]\app\projects\[id]\cta-actions.ts:8://   - requestRevisionAction    (delivered -> in_revision) client-only matrix
src\app\[locale]\app\projects\[id]\cta-actions.ts:16:// requestRevisionAction's p_comment ≥10 chars rule is enforced by the
src\app\[locale]\app\projects\[id]\cta-actions.ts:24:// shorthand maps to that pre-existing surface. NOTE: the briefing_documents
src\app\[locale]\app\projects\[id]\cta-actions.ts:32:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\cta-actions.ts:51:// 1. approveDeliveredAction — delivered -> approved
src\app\[locale]\app\projects\[id]\cta-actions.ts:68:export async function approveDeliveredAction(
src\app\[locale]\app\projects\[id]\cta-actions.ts:89:    "transition_project_status",
src\app\[locale]\app\projects\[id]\cta-actions.ts:96:    console.error("[approveDeliveredAction] RPC error:", rpcErr);
src\app\[locale]\app\projects\[id]\cta-actions.ts:103:  revalidatePath("/[locale]/app/projects/[id]", "page");
src\app\[locale]\app\projects\[id]\cta-actions.ts:104:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\[id]\cta-actions.ts:109:// 2. requestRevisionAction — delivered -> in_revision (comment ≥ 10 chars)
src\app\[locale]\app\projects\[id]\cta-actions.ts:127:export async function requestRevisionAction(
src\app\[locale]\app\projects\[id]\cta-actions.ts:157:    "transition_project_status",
src\app\[locale]\app\projects\[id]\cta-actions.ts:165:    console.error("[requestRevisionAction] RPC error:", rpcErr);
src\app\[locale]\app\projects\[id]\cta-actions.ts:172:  revalidatePath("/[locale]/app/projects/[id]", "page");
src\app\[locale]\app\projects\[id]\cta-actions.ts:173:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\[id]\page.tsx:73:function parseTab(value: string | undefined): TabKey {
src\app\[locale]\app\projects\[id]\page.tsx:104:  const activeTab = parseTab(sp.tab);
src\app\[locale]\app\projects\[id]\page.tsx:214:  // Phase 5 Wave C C_3 — Fetch briefing_documents for the 첨부자료 요약
src\app\[locale]\app\projects\[id]\page.tsx:230:      .from("briefing_documents")
src\app\[locale]\app\projects\[id]\page.tsx:341:          Labels from projects.status.label namespace (shared across surfaces).
src\app\[locale]\app\projects\new\briefing-canvas-step-2.tsx:8://     • Step2BriefColumn      — 보유 자료 (briefing_documents kind='brief')
src\app\[locale]\app\projects\new\briefing-canvas-step-2.tsx:22://   - briefing_documents fetched on mount via supabase browser client
src\app\[locale]\app\projects\new\briefing-canvas-step-2.tsx:90:  // Initial fetch of briefing_documents + projects metadata.
src\app\[locale]\app\projects\new\briefing-canvas-step-2.tsx:99:          .from("briefing_documents")
src\app\[locale]\app\projects\[id]\recall-actions.ts:6:// Thin wrapper over transition_project_status RPC. The RPC handles all
src\app\[locale]\app\projects\[id]\recall-actions.ts:13://   3. Maps PostgrestError codes to a small discriminated-union return.
src\app\[locale]\app\projects\[id]\recall-actions.ts:14://   4. revalidatePath on success so the detail page + list update.
src\app\[locale]\app\projects\[id]\recall-actions.ts:29:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\recall-actions.ts:59:    "transition_project_status",
src\app\[locale]\app\projects\[id]\recall-actions.ts:92:  revalidatePath("/[locale]/app/projects/[id]", "page");
src\app\[locale]\app\projects\[id]\recall-actions.ts:93:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\support\actions.ts:18:import { revalidatePath } from "next/cache";
src\app\[locale]\app\support\actions.ts:124:  revalidatePath("/[locale]/app/admin/support", "page");
src\app\[locale]\app\support\actions.ts:156:  revalidatePath("/[locale]/app/admin/support", "page");
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:157:  // Initial fetch: projects row + briefing_documents counts.
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:173:          .from("briefing_documents")
src\app\[locale]\app\projects\[id]\recall-button.tsx:7:// recallProjectAction (which delegates to transition_project_status RPC
src\app\[locale]\app\showcases\actions.ts:13:import { revalidatePath } from "next/cache";
src\app\[locale]\app\showcases\actions.ts:54:    revalidatePath(`/${locale}/app/showcases`);
src\app\[locale]\app\showcases\actions.ts:55:    revalidatePath(`/${locale}/app/showcases/${showcaseId}`);
src\app\[locale]\app\showcases\actions.ts:57:  if (slug) revalidatePath(`/showcase/${slug}`);
src\app\[locale]\app\projects\[id]\ref-actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\ref-actions.ts:114:  revalidatePath(`/[locale]/app/projects/${d.projectId}`, "page");
src\app\[locale]\app\projects\[id]\ref-actions.ts:161:    revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src\app\[locale]\app\projects\[id]\ref-actions.ts:181:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src\app\[locale]\app\projects\[id]\ref-actions.ts:219:  revalidatePath(`/[locale]/app/projects/${ref.project_id}`, "page");
src\app\[locale]\app\projects\[id]\brief\actions.ts:20:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\brief\actions.ts:313:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\brief\actions.ts:381:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\brief\actions.ts:424:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\brief\actions.ts:465:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\settings\notifications\actions.ts:6:import { revalidatePath } from "next/cache";
src\app\[locale]\app\settings\notifications\actions.ts:57:  revalidatePath("/[locale]/app/settings/notifications", "page");
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:12://   - addBriefingDocumentAction(input)          — INSERT briefing_documents
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:13://   - removeBriefingDocumentAction(input)       — DELETE briefing_documents
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:23:// briefing_documents column-grant lockdown landed in Wave A sub_4 F3:
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:37:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:78: * in-depth — RLS policies on briefing_documents + projects already
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:361:    .from("briefing_documents")
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:376:  revalidatePath("/[locale]/app/projects/new", "page");
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:419:    .from("briefing_documents")
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:429:    .from("briefing_documents")
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:437:  revalidatePath("/[locale]/app/projects/new", "page");
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:482:    .from("briefing_documents")
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:509:    .from("briefing_documents")
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:517:  revalidatePath("/[locale]/app/projects/new", "page");
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:593:  // No revalidatePath on autosave — the user is mid-edit and a
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:24:// briefing_documents policies; projects RLS already requires
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:32:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:215:  // hotfix-6: direct UPDATE of projects.status is rejected by the
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:216:  // BEFORE-UPDATE trigger trg_guard_projects_status (raises
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:218:  // through the SECURITY DEFINER `transition_project_status` RPC, which:
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:250:    "transition_project_status",
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:285:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\[id]\thread-actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\thread-actions.ts:79:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\thread-actions.ts:263:  revalidatePath(`/[locale]/app/projects/${d.projectId}`, "page");
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:3:import { revalidatePath } from "next/cache";
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:150:    revalidatePath(`/${locale}/app/admin/challenges`);
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:151:    revalidatePath(`/${locale}/app/admin/challenges/${challenge.slug}/announce`);
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:153:  revalidatePath(`/challenges/${challenge.slug}`);
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:154:  revalidatePath(`/challenges/${challenge.slug}/gallery`);

 succeeded in 489ms:
src/components/project-detail\brief-summary-card.tsx
src/components/project-detail\board-tab.tsx
src/components/project-detail\attachment-summary.tsx
src/components/project-detail\empty-state-tab.tsx
src/components/project-detail\cancelled-archived-banner.tsx
src/components/project-detail\brief-tab.tsx
src/components/project-detail\hero-card.tsx
src/components/project-detail\info-rail.tsx
src/components/project-detail\tabs.tsx
src/components/project-detail\status-timeline.tsx
src/components/project-detail\status-tab.tsx
src/components/project-detail\progress-tab.tsx
src/components/project-detail\placeholder-tab.tsx
src/components/project-detail\next-action-cta.tsx
src/components/project-detail\material-append-modal.tsx
src/app/[locale]/app/projects/[id]\thread-actions.ts
src/app/[locale]/app/projects/[id]\ref-actions.ts
src/app/[locale]/app/projects/[id]\recall-button.tsx
src/app/[locale]/app/projects/[id]\recall-actions.ts
src/app/[locale]/app/projects/[id]\page.tsx
src/app/[locale]/app/projects/[id]\cta-actions.ts
messages\ko.json
messages\en.json
src/app/[locale]/app/projects/[id]\actions.ts
src/app/[locale]/app/projects/[id]\board-actions.ts
src/app/[locale]/app/projects/[id]\brief\actions.ts

 succeeded in 525ms:
 M .yagi-autobuild/PRODUCT-MASTER.md
?? .yagi-autobuild/phase-5-wc-detail/
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop1.md
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop2.md
?? .yagi-autobuild/phase-5/_wave_a_task_01_result.md
?? .yagi-autobuild/phase-5/_wave_b_hotfix6_codex_loop1_full.md
?? .yagi-autobuild/phase-5/_wave_b_hotfix6_codex_loop2_full.md
?? .yagi-autobuild/phase-5/_wave_b_sub_5_codex_loop2_full.md
?? .yagi-autobuild/phase-5/_wave_b_task_04v3_codex_review.md
?? .yagi-autobuild/phase-5/_wave_b_task_06v3_codex_loop1_full.md
?? .yagi-autobuild/phase-5/_wave_b_task_06v3_codex_loop2_full.md

codex
The initial grep shows the new status RPC wrappers are isolated in `cta-actions.ts`, and the new document SELECT is filtered by `project.id`. I’m reading the changed page and modal/action code now because those are the main places a medium-risk bug would show up.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/[id]/cta-actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/[id]/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/project-detail/material-append-modal.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/project-detail/next-action-cta.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 375ms:
"use server";

// =============================================================================
// Phase 5 Wave C C_3 ??Detail page next-action server actions.
//
// Two thin RPC wrappers, both invoking transition_project_status:
//   - approveDeliveredAction   (delivered -> approved)   client-only matrix
//   - requestRevisionAction    (delivered -> in_revision) client-only matrix
//
// Both transitions are already in the Phase 3.0 truth table (client actor),
// so this Wave introduces no migration. The Wave B creator-first patch
// (20260504200001) means the workspace creator is resolved as 'client'
// even when they hold workspace_admin, so own-project recall + approve +
// revision flow goes through the client matrix consistently.
//
// requestRevisionAction's p_comment ??0 chars rule is enforced by the
// RPC itself (RAISE EXCEPTION 'comment_required_min_10_chars' USING
// ERRCODE='22023'); the action layer also pre-validates so the user sees
// an inline error before round-tripping to Postgres.
//
// in_review ??[?먮즺 異붽??섍린] modal calls the existing
// addBriefingDocumentAction from briefing-step2-actions.ts (Wave B sub_5).
// We do NOT duplicate that action here ??the SPEC's "appendBriefingDocumentAction"
// shorthand maps to that pre-existing surface. NOTE: the briefing_documents
// INSERT RLS policy (Wave A sub_5 fix F2) currently requires parent
// status='draft'. An in_review caller will hit RLS denial and surface a
// 'forbidden' return; loosening RLS to allow ('draft','in_review') is
// FU-Phase5-16 (registered in Wave C result doc).
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

// ---------------------------------------------------------------------------
// Shared error mapping ??same shape as recallProjectAction.
// ---------------------------------------------------------------------------

type RpcErrorCode = "forbidden" | "invalid_transition" | "comment_required" | "unknown";

function mapRpcError(rpcErr: { code?: string; message?: string }): RpcErrorCode {
  const code = (rpcErr.code ?? "") as string;
  if (code === "42501" || code === "P0002") return "forbidden";
  if (code === "23514") return "invalid_transition";
  if (code === "22023") return "comment_required";
  return "unknown";
}

// ===========================================================================
// 1. approveDeliveredAction ??delivered -> approved
// ===========================================================================

const approveInput = z.object({
  projectId: z.string().uuid(),
});

export type ApproveDeliveredInput = z.input<typeof approveInput>;

export type ApproveDeliveredResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "no_workspace" | RpcErrorCode;
      message?: string;
    };

export async function approveDeliveredAction(
  input: unknown,
): Promise<ApproveDeliveredResult> {
  const parsed = approveInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
  const sb = supabase as any;
  const { data: historyId, error: rpcErr } = await sb.rpc(
    "transition_project_status",
    {
      p_project_id: parsed.data.projectId,
      p_to_status: "approved",
    },
  );
  if (rpcErr) {
    console.error("[approveDeliveredAction] RPC error:", rpcErr);
    return { ok: false, error: mapRpcError(rpcErr), message: rpcErr.message };
  }
  if (!historyId) {
    return { ok: false, error: "unknown", message: "RPC returned null" };
  }

  revalidatePath("/[locale]/app/projects/[id]", "page");
  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true };
}

// ===========================================================================
// 2. requestRevisionAction ??delivered -> in_revision (comment ??10 chars)
// ===========================================================================

const revisionInput = z.object({
  projectId: z.string().uuid(),
  comment: z.string().trim().min(10).max(2000),
});

export type RequestRevisionInput = z.input<typeof revisionInput>;

export type RequestRevisionResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "no_workspace" | RpcErrorCode;
      message?: string;
    };

export async function requestRevisionAction(
  input: unknown,
): Promise<RequestRevisionResult> {
  const parsed = revisionInput.safeParse(input);
  if (!parsed.success) {
    // zod min(10) catches comment_required at the action layer, mirroring
    // the RPC's 22023 raise so the UX surface is identical.
    const isCommentLength = parsed.error.issues.some(
      (i) => i.path[0] === "comment",
    );
    return {
      ok: false,
      error: isCommentLength ? "comment_required" : "validation",
      message: parsed.error.message,
    };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
  const sb = supabase as any;
  const { data: historyId, error: rpcErr } = await sb.rpc(
    "transition_project_status",
    {
      p_project_id: parsed.data.projectId,
      p_to_status: "in_revision",
      p_comment: parsed.data.comment,
    },
  );
  if (rpcErr) {
    console.error("[requestRevisionAction] RPC error:", rpcErr);
    return { ok: false, error: mapRpcError(rpcErr), message: rpcErr.message };
  }
  if (!historyId) {
    return { ok: false, error: "unknown", message: "RPC returned null" };
  }

  revalidatePath("/[locale]/app/projects/[id]", "page");
  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true };
}

 succeeded in 381ms:
"use client";

// =============================================================================
// Phase 5 Wave C C_3 ??Next-action CTA matrix (status-keyed).
//
// Renders 1?? CTAs per status per SPEC 짠"Next action CTA":
//   draft         ??primary [釉뚮━???꾩꽦?섍린 ?? (Link to /projects/new?project=...)
//   submitted     ??0 CTA, helper text only
//   in_review     ??[?먮즺 異붽??섍린]  ??opens MaterialAppendModal (kind selector)
//   in_progress   ??disabled placeholder [肄붾찘???묒꽦]    (FU-Phase5-10)
//   in_revision   ??disabled placeholder [?섏젙 ?섍껄 肄붾찘?? (FU-Phase5-10)
//   delivered     ??primary [?쒖븞 蹂닿린 ?? ??"以鍮?以? placeholder modal (FU-Phase5-15)
//   approved      ??disabled placeholder [?꾨줈?앺듃 ?됯??섍린] (FU-Phase5-15)
//   cancelled / archived ??no CTA (banner above the page handles those)
//
// Server actions:
//   - approveDeliveredAction / requestRevisionAction live in
//     src/app/[locale]/app/projects/[id]/cta-actions.ts but are wired
//     through the "以鍮?以? placeholder for delivered today (UI surface
//     ships in Phase 6+ per SPEC). The data layer is verifiable via
//     devtools per SPEC 짠"Verification" steps 10??1.
//   - in_review append form ships here via MaterialAppendModal.
// =============================================================================

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialAppendModal } from "./material-append-modal";

type Props = {
  projectId: string;
  status: string;
  isOwner: boolean;
  locale: string;
  labels: {
    cta_draft: string;
    cta_in_review: string;
    cta_in_progress: string;
    cta_in_revision: string;
    cta_delivered: string;
    cta_approved: string;
    empty_state_submitted: string;
    delivered_placeholder: string;
    // MaterialAppendModal labels (passed-through)
    modal: MaterialAppendModalLabels;
  };
};

export type MaterialAppendModalLabels = {
  trigger: string;
  title: string;
  description: string;
  kindLabel: string;
  kindBrief: string;
  kindReference: string;
  sourceLabel: string;
  sourceUpload: string;
  sourceUrl: string;
  fileLabel: string;
  urlLabel: string;
  urlPlaceholder: string;
  cancel: string;
  submit: string;
  successToast: string;
  errorForbidden: string;
  errorRlsPending: string;
  errorUnknown: string;
};

export function NextActionCTA({
  projectId,
  status,
  isOwner,
  locale,
  labels,
}: Props) {
  const [showDeliveredPlaceholder, setShowDeliveredPlaceholder] =
    useState(false);

  // Banner-status (cancelled / archived) handled by the page-level banner;
  // render nothing here.
  if (status === "cancelled" || status === "archived") return null;

  // Non-owner viewers (yagi_admin / workspace_admin) see a hint instead of
  // the client-only CTAs. Admin-side actions live in ProjectActionButtons.
  if (!isOwner) return null;

  if (status === "draft") {
    return (
      <Link
        href={`/${locale}/app/projects/new?project=${projectId}`}
        className="inline-flex items-center justify-center rounded-full bg-[#71D083] text-black px-6 py-2.5 text-sm font-medium hover:brightness-105 transition-all duration-[400ms] keep-all"
      >
        {labels.cta_draft}
      </Link>
    );
  }

  if (status === "submitted") {
    return (
      <p className="text-sm text-muted-foreground keep-all leading-relaxed">
        {labels.empty_state_submitted}
      </p>
    );
  }

  if (status === "in_review") {
    return (
      <MaterialAppendModal
        projectId={projectId}
        labels={labels.modal}
      />
    );
  }

  if (status === "in_progress") {
    return (
      <DisabledCta label={labels.cta_in_progress} hint="Phase 5+" />
    );
  }

  if (status === "in_revision") {
    return (
      <DisabledCta label={labels.cta_in_revision} hint="Phase 5+" />
    );
  }

  if (status === "delivered") {
    return (
      <>
        <Button
          type="button"
          onClick={() => setShowDeliveredPlaceholder(true)}
          className="rounded-full bg-[#71D083] text-black px-6 py-2.5 text-sm font-medium hover:brightness-105 transition-all duration-[400ms]"
        >
          {labels.cta_delivered}
        </Button>
        {showDeliveredPlaceholder && (
          // Click-outside the button text to dismiss; minimal modal.
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowDeliveredPlaceholder(false)}
          >
            <div
              className="rounded-3xl border border-border/40 bg-background p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm text-muted-foreground keep-all leading-relaxed">
                {labels.delivered_placeholder}
              </p>
              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeliveredPlaceholder(false)}
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (status === "approved") {
    return (
      <DisabledCta label={labels.cta_approved} hint="Phase 6+" />
    );
  }

  return null;
}

function DisabledCta({ label, hint }: { label: string; hint: string }) {
  return (
    <span
      role="button"
      aria-disabled="true"
      className="inline-flex items-center gap-2 rounded-full border border-border/40 px-5 py-2 text-sm text-muted-foreground/70 cursor-not-allowed keep-all"
    >
      {label}
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50">
        {hint}
      </span>
    </span>
  );
}

 succeeded in 381ms:
"use client";

// =============================================================================
// Phase 5 Wave C C_3 ??Material append modal (in_review status).
//
// Wires the in_review [?먮즺 異붽??섍린] CTA to:
//   1. R2 presigned PUT URL via Wave B getBriefingDocumentPutUrlAction
//   2. Direct PUT upload from the browser
//   3. INSERT into briefing_documents via Wave B addBriefingDocumentAction
//
// kind selector: brief | reference
// source selector: upload | url
//
// Note (FU-Phase5-16): briefing_documents INSERT RLS (Wave A sub_5 F2)
// currently requires parent project status='draft'. An in_review caller
// hits 'forbidden' ??the modal surfaces a clear toast pointing at the
// FU. The action wiring + form structure remain shipped per SPEC, so
// when FU-Phase5-16 extends the policy (status IN ('draft','in_review')),
// this modal works end-to-end without UI changes.
// =============================================================================

import { useState, useTransition } from "react";
import { Loader2, FileText, Link as LinkIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getBriefingDocumentPutUrlAction,
  addBriefingDocumentAction,
} from "@/app/[locale]/app/projects/new/briefing-step2-actions";
import type { MaterialAppendModalLabels } from "./next-action-cta";

const ACCEPT_MIME =
  "application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp,image/gif";

export function MaterialAppendModal({
  projectId,
  labels,
}: {
  projectId: string;
  labels: MaterialAppendModalLabels;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"brief" | "reference">("brief");
  const [source, setSource] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setKind("brief");
    setSource("upload");
    setFile(null);
    setUrl("");
  }

  const submitAllowed =
    (source === "upload" && !!file) ||
    (source === "url" && url.trim().length > 0);

  async function handleSubmit() {
    startTransition(async () => {
      try {
        if (source === "upload" && file) {
          const presign = await getBriefingDocumentPutUrlAction({
            projectId,
            kind,
            contentType: file.type,
            sizeBytes: file.size,
          });
          if (!presign.ok) {
            const key =
              presign.error === "forbidden"
                ? "errorRlsPending"
                : "errorUnknown";
            toast.error(labels[key as "errorRlsPending" | "errorUnknown"]);
            return;
          }
          const putRes = await fetch(presign.putUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
          if (!putRes.ok) {
            toast.error(labels.errorUnknown);
            return;
          }
          const insert = await addBriefingDocumentAction({
            projectId,
            kind,
            source_type: "upload",
            storage_key: presign.storageKey,
            filename: file.name,
            size_bytes: file.size,
            mime_type: file.type,
          });
          if (!insert.ok) {
            const key =
              insert.error === "forbidden"
                ? "errorRlsPending"
                : "errorUnknown";
            toast.error(labels[key as "errorRlsPending" | "errorUnknown"]);
            return;
          }
        } else if (source === "url" && url.trim()) {
          const insert = await addBriefingDocumentAction({
            projectId,
            kind,
            source_type: "url",
            url: url.trim(),
          });
          if (!insert.ok) {
            const key =
              insert.error === "forbidden"
                ? "errorRlsPending"
                : "errorUnknown";
            toast.error(labels[key as "errorRlsPending" | "errorUnknown"]);
            return;
          }
        }
        toast.success(labels.successToast);
        setOpen(false);
        reset();
      } catch (e) {
        console.error("[MaterialAppendModal] submit threw:", e);
        toast.error(labels.errorUnknown);
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-sm rounded-full px-5"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          {labels.trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.title}</AlertDialogTitle>
          <AlertDialogDescription className="keep-all leading-relaxed">
            {labels.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* kind selector */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
              {labels.kindLabel}
            </Label>
            <div className="flex gap-2">
              {(["brief", "reference"] as const).map((opt) => {
                const selected = kind === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setKind(opt)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
                      selected
                        ? "bg-foreground text-background"
                        : "border border-border/60 hover:border-border",
                    )}
                  >
                    {opt === "brief" ? labels.kindBrief : labels.kindReference}
                  </button>
                );
              })}
            </div>
          </div>

          {/* source selector */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
              {labels.sourceLabel}
            </Label>
            <div className="flex gap-2">
              {(["upload", "url"] as const).map((opt) => {
                const selected = source === opt;
                const Icon = opt === "upload" ? FileText : LinkIcon;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSource(opt)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all flex items-center gap-1.5",
                      selected
                        ? "bg-foreground text-background"
                        : "border border-border/60 hover:border-border",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt === "upload" ? labels.sourceUpload : labels.sourceUrl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* file or url input */}
          {source === "upload" ? (
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="material-append-file"
                className="text-xs font-medium text-foreground keep-all"
              >
                {labels.fileLabel}
              </Label>
              <Input
                id="material-append-file"
                type="file"
                accept={ACCEPT_MIME}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="material-append-url"
                className="text-xs font-medium text-foreground keep-all"
              >
                {labels.urlLabel}
              </Label>
              <Input
                id="material-append-url"
                type="url"
                placeholder={labels.urlPlaceholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} onClick={reset}>
            {labels.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (!submitAllowed || pending) return;
              void handleSubmit();
            }}
            disabled={!submitAllowed || pending}
            className="bg-[#71D083] text-black hover:bg-[#71D083]/90 focus-visible:ring-[#71D083]/40"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              labels.submit
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

 succeeded in 414ms:
// Phase 4.x task_04 ??Post-submit detail page redesign.
//
// Layout (1280 max-width):
//   1. Breadcrumb (workspace -> brand -> project)
//   2. Status timeline (5-stage horizontal pipeline, sage active)
//   3. Hero card 1:1 (720x720) + Info rail (360 wide)  [responsive grid]
//   4. Detail tabs (4 tabs: 蹂대뱶 / 吏꾪뻾 / 肄붾찘??disabled / 寃곌낵臾?disabled)
//   5. Tab content panel
//   6. Admin actions row (yagi_admin only)
//
// Authorization (BLOCKER 1 consistency):
//   - viewer must be project.created_by OR yagi_admin
//   - workspace_admin from same workspace also allowed for backwards compat
//   - everyone else -> notFound()
//
// Phase 4.x DOES NOT add new statuses. The 5-stage timeline maps to the
// existing 9-state CHECK; ?쇱슦??/ ?쒖븞 are reserved visual slots.
//
// Server-only data fetch; tabs are conditionally rendered based on
// ?tab= query param. Disabled tabs route to PlaceholderTab and never
// trigger any DB read.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { MessageSquare, Package } from "lucide-react";
import { AdminDeleteButton } from "@/components/projects/admin-delete-button";
import { ProjectActionButtons } from "@/components/projects/project-action-buttons";
import { StatusTimeline } from "@/components/project-detail/status-timeline";
import { HeroCard } from "@/components/project-detail/hero-card";
import { InfoRail, type TwinIntent } from "@/components/project-detail/info-rail";
import { DetailTabs, type TabKey } from "@/components/project-detail/tabs";
import { BoardTab } from "@/components/project-detail/board-tab";
import { EmptyStateTab } from "@/components/project-detail/empty-state-tab";
import { StatusTab } from "@/components/project-detail/status-tab";
import { BriefTab } from "@/components/project-detail/brief-tab";
import { CancelledArchivedBanner } from "@/components/project-detail/cancelled-archived-banner";
import { RecallButton } from "./recall-button";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

type ProjectDetail = {
  id: string;
  title: string;
  brief: string | null;
  status: string;
  workspace_id: string;
  created_by: string;
  budget_band: string | null;
  target_delivery_at: string | null;
  meeting_preferred_at: string | null;
  twin_intent: string | null;
  created_at: string;
  workspace: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  // Phase 5 Wave C C_4 ??additional brief fields
  deliverable_types: string[];
  mood_keywords: string[];
  mood_keywords_free: string | null;
  visual_ratio: string | null;
  visual_ratio_custom: string | null;
  channels: string[];
  target_audience: string | null;
  additional_notes: string | null;
  interested_in_twin: boolean | null;
  submitted_at: string | null;
};

function parseTab(value: string | undefined): TabKey {
  // Phase 5 Wave C C_1 ??5-tab structure. "status" is the default
  // (?꾪솴 tab) per SPEC 짠"Scope: 5 tab 援ъ“".
  if (
    value === "brief" ||
    value === "board" ||
    value === "comments" ||
    value === "deliverables"
  ) {
    return value;
  }
  return "status";
}

function narrowTwinIntent(value: string | null): TwinIntent | null {
  if (
    value === "undecided" ||
    value === "specific_in_mind" ||
    value === "no_twin"
  ) {
    return value;
  }
  return null;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: Props) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const activeTab = parseTab(sp.tab);

  const t = await getTranslations({ locale, namespace: "projects" });
  const tDetail = await getTranslations({
    locale,
    namespace: "project_detail",
  });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Fetch project. budget_band / submitted_at / twin_intent / kind columns
  // are not in generated database.types.ts (Phase 3.0 + Phase 4.x); use
  // the same any-cast pattern the existing detail page used.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0/4.x columns not in generated types
  const sb = supabase as any;
  const { data: projectRaw, error: projectErr } = (await sb
    .from("projects")
    .select(
      `
      id, title, brief, status,
      workspace_id, created_by,
      budget_band, target_delivery_at,
      meeting_preferred_at, twin_intent, created_at,
      deliverable_types, mood_keywords, mood_keywords_free,
      visual_ratio, visual_ratio_custom,
      channels, target_audience, additional_notes,
      interested_in_twin, submitted_at,
      brand:brands(id, name),
      workspace:workspaces(id, name)
    `
    )
    .eq("id", id)
    .maybeSingle()) as {
    data: Record<string, unknown> | null;
    error: unknown;
  };

  if (projectErr || !projectRaw) notFound();

  const brandRaw = projectRaw.brand;
  const workspaceRaw = projectRaw.workspace;

  const project: ProjectDetail = {
    id: projectRaw.id as string,
    title: projectRaw.title as string,
    brief: projectRaw.brief as string | null,
    status: projectRaw.status as string,
    workspace_id: projectRaw.workspace_id as string,
    created_by: projectRaw.created_by as string,
    budget_band: (projectRaw.budget_band as string | null) ?? null,
    target_delivery_at:
      (projectRaw.target_delivery_at as string | null) ?? null,
    meeting_preferred_at:
      (projectRaw.meeting_preferred_at as string | null) ?? null,
    // twin_intent column added by task_01 migration (Wave D D.1 apply).
    // Until apply, the SELECT returns undefined -> coerce to null. After
    // apply, the value is one of the 3 enum members.
    twin_intent:
      (projectRaw.twin_intent as string | undefined | null) ?? null,
    created_at: projectRaw.created_at as string,
    brand: Array.isArray(brandRaw)
      ? ((brandRaw[0] as ProjectDetail["brand"]) ?? null)
      : (brandRaw as ProjectDetail["brand"]),
    workspace: Array.isArray(workspaceRaw)
      ? ((workspaceRaw[0] as ProjectDetail["workspace"]) ?? null)
      : (workspaceRaw as ProjectDetail["workspace"]),
    // Phase 5 Wave C C_4 ??additional brief fields
    deliverable_types:
      (projectRaw.deliverable_types as string[] | null) ?? [],
    mood_keywords: (projectRaw.mood_keywords as string[] | null) ?? [],
    mood_keywords_free:
      (projectRaw.mood_keywords_free as string | undefined | null) ?? null,
    visual_ratio:
      (projectRaw.visual_ratio as string | undefined | null) ?? null,
    visual_ratio_custom:
      (projectRaw.visual_ratio_custom as string | undefined | null) ?? null,
    channels: (projectRaw.channels as string[] | null) ?? [],
    target_audience:
      (projectRaw.target_audience as string | undefined | null) ?? null,
    additional_notes:
      (projectRaw.additional_notes as string | undefined | null) ?? null,
    // interested_in_twin ??3-way: true / false / null (null = not answered)
    interested_in_twin:
      projectRaw.interested_in_twin == null
        ? null
        : (projectRaw.interested_in_twin as boolean),
    submitted_at:
      (projectRaw.submitted_at as string | undefined | null) ?? null,
  };

  // Fetch creator display name for the brief tab Stage 3 metadata.
  // Use the same service-role bypass pattern (profiles may be RLS-restricted
  // to own row for non-admin viewers). Falls back to null on any error.
  let creatorDisplayName: string | null = null;
  try {
    const { data: creatorProfile } = await sb
      .from("profiles")
      .select("display_name")
      .eq("id", project.created_by)
      .maybeSingle();
    creatorDisplayName =
      (creatorProfile?.display_name as string | null) ?? null;
  } catch {
    // Non-fatal ??brief tab shows dash for creator name
  }

  // Phase 5 Wave C C_3 ??Fetch briefing_documents for the 泥⑤??먮즺 ?붿빟
  // (?꾪솴 tab right column). RLS scopes via project_id; only members of
  // the project's workspace get rows. We slice top-3 here and keep the
  // count-by-kind for the section header.
  let briefDocsCount = 0;
  let referenceDocsCount = 0;
  let topThreeDocs: Array<{
    id: string;
    kind: "brief" | "reference";
    source_type: "upload" | "url";
    thumbnail_url: string | null;
    filename: string | null;
    url: string | null;
  }> = [];
  try {
    const { data: docsRaw } = await sb
      .from("briefing_documents")
      .select(
        "id, kind, source_type, thumbnail_url, filename, url, created_at"
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: true });
    const docs = (docsRaw ?? []) as Array<{
      id: string;
      kind: "brief" | "reference";
      source_type: "upload" | "url";
      thumbnail_url: string | null;
      filename: string | null;
      url: string | null;
    }>;
    briefDocsCount = docs.filter((d) => d.kind === "brief").length;
    referenceDocsCount = docs.filter((d) => d.kind === "reference").length;
    // SPEC 짠"泥⑤??먮즺 ?붿빟" ??湲고쉷???곗꽑 ???덊띁?곗뒪. Stable sort by kind
    // then keep insertion order within each kind. slice(0, 3).
    topThreeDocs = [
      ...docs.filter((d) => d.kind === "brief"),
      ...docs.filter((d) => d.kind === "reference"),
    ].slice(0, 3);
  } catch {
    // Non-fatal ??render empty attachments section
  }

  // Authorization (BLOCKER 1 consistency: use created_by, NOT owner_id).
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role, workspace_id")
    .eq("user_id", user.id);

  const roles = new Set(
    (roleRows ?? [])
      .filter(
        (r) =>
          r.workspace_id === null || r.workspace_id === project.workspace_id
      )
      .map((r) => r.role as string)
  );

  const isYagiAdmin = roles.has("yagi_admin");
  const isWsAdmin = roles.has("workspace_admin");
  const isOwner = project.created_by === user.id;

  if (!isYagiAdmin && !isWsAdmin && !isOwner) notFound();

  const viewerRole: "admin" | "client" = isYagiAdmin || isWsAdmin
    ? "admin"
    : "client";

  const localeNarrow: "ko" | "en" = locale === "en" ? "en" : "ko";
  const workspaceName = project.workspace?.name ?? "??;
  const brandName = project.brand?.name ?? null;

  // Status pill label (uses existing translations namespace -- same map
  // already powers StatusBadge elsewhere).
  const tStatus = await getTranslations({ locale, namespace: "projects" });
  const statusLabel =
    tStatus.has(`status_${project.status}` as never)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tStatus as any)(`status_${project.status}`)
      : project.status;

  // Phase 5 Wave C C_1 ??Cancelled / Archived banner. Renders above
  // the entire page chrome when status terminates the lifecycle. Full
  // styling + the [???섎ː ?쒖옉] link variant land in C_5; for now this
  // is a text-only placeholder so the gate is observable.
  const isTerminalStatus =
    project.status === "cancelled" || project.status === "archived";

  return (
    <div className="px-6 md:px-10 py-10 max-w-[1280px] mx-auto">
      {isTerminalStatus && (
        <CancelledArchivedBanner
          variant={project.status as "cancelled" | "archived"}
          locale={locale}
          labels={{
            cancelled: tDetail("banner.cancelled"),
            cancelledLinkText: tDetail("banner.cancelled_link_text"),
            archived: tDetail("banner.archived"),
          }}
        />
      )}

      {/* L1 Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="mb-6 text-sm text-muted-foreground"
      >
        <Link
          href={`/${locale}/app/projects`}
          className="hover:text-foreground transition-colors"
        >
          {t("list_title")}
        </Link>
        <span className="mx-1.5 text-muted-foreground/60">??/span>
        <span>{workspaceName}</span>
        {brandName && (
          <>
            <span className="mx-1.5 text-muted-foreground/60">??/span>
            <span>{brandName}</span>
          </>
        )}
        <span className="mx-1.5 text-muted-foreground/60">??/span>
        <span className="font-medium text-foreground keep-all">
          {project.title}
        </span>
      </nav>

      {/* L2 Status timeline ??C_2 vertical stepper.
          Labels from projects.status.label namespace (shared across surfaces).
          eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="mb-8">
        <StatusTimeline
          status={project.status}
          labels={{
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            draft: (tStatus as any)("status.label.draft"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            submitted: (tStatus as any)("status.label.submitted"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            in_review: (tStatus as any)("status.label.in_review"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            in_progress: (tStatus as any)("status.label.in_progress"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            in_revision: (tStatus as any)("status.label.in_revision"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delivered: (tStatus as any)("status.label.delivered"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            approved: (tStatus as any)("status.label.approved"),
          }}
        />
      </div>

      {/* L3 Hero card + Info rail */}
      <div className="mb-10 flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <HeroCard
            title={project.title}
            description={project.brief}
            status={project.status}
            statusLabel={statusLabel}
            bannerLine={
              project.status === "in_review" ||
              project.status === "submitted" ||
              project.status === "draft"
                ? tDetail("hero.banner_in_review")
                : null
            }
          />
        </div>
        <InfoRail
          createdAt={project.created_at}
          budgetBand={project.budget_band}
          targetDeliveryAt={project.target_delivery_at}
          twinIntent={narrowTwinIntent(project.twin_intent)}
          meetingPreferredAt={project.meeting_preferred_at}
          locale={localeNarrow}
          labels={{
            section: tDetail("info_rail.section"),
            submittedOn: tDetail("info_rail.submitted_on"),
            budget: tDetail("info_rail.budget"),
            delivery: tDetail("info_rail.delivery"),
            deliveryNegotiable: tDetail("info_rail.delivery_negotiable"),
            twinIntent: tDetail("info_rail.twin_intent"),
            meeting: tDetail("info_rail.meeting"),
            meetingNone: tDetail("info_rail.meeting_none"),
            notSet: tDetail("info_rail.not_set"),
            budgetMap: {
              under_1m: tDetail("budget.under_1m"),
              "1m_to_5m": tDetail("budget.1m_to_5m"),
              "5m_to_10m": tDetail("budget.5m_to_10m"),
              negotiable: tDetail("budget.negotiable"),
            },
            twinIntentMap: {
              undecided: tDetail("twin_intent.undecided"),
              specific_in_mind: tDetail("twin_intent.specific_in_mind"),
              no_twin: tDetail("twin_intent.no_twin"),
            },
          }}
        />
      </div>

      {/* Wave B.5 ??Client recall (submitted/in_review -> draft).
          Conditional on creator viewer + recall-window status. The
          RPC re-checks both, this UI gate just hides the button when
          it would be useless. Wave C will absorb this into the
          "?꾪솴" tab next-action CTA matrix (PRODUCT-MASTER 짠C.4). */}
      {(project.status === "submitted" || project.status === "in_review") &&
        isOwner && (
          <div className="mb-6 flex justify-end">
            <RecallButton projectId={project.id} />
          </div>
        )}

      {/* L4 Tabs ??Wave C C_1: 5-tab structure (status default). */}
      <div className="mb-6">
        <DetailTabs
          active={activeTab}
          labels={{
            status: tDetail("tab.status"),
            brief: tDetail("tab.brief"),
            board: tDetail("tab.board"),
            comments: tDetail("tab.comments"),
            deliverables: tDetail("tab.deliverables"),
          }}
        />
      </div>

      {/* L5 Tab content panel */}
      <div className="mb-10">
        {activeTab === "status" && (
          <StatusTab
            status={project.status}
            isOwner={isOwner}
            projectId={project.id}
            locale={locale}
            title={project.title}
            deliverableTypes={project.deliverable_types}
            description={project.brief}
            briefCount={briefDocsCount}
            referenceCount={referenceDocsCount}
            topThree={topThreeDocs}
            labels={{
              timeline: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                draft: (tStatus as any)("status.label.draft"),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                submitted: (tStatus as any)("status.label.submitted"),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                in_review: (tStatus as any)("status.label.in_review"),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                in_progress: (tStatus as any)("status.label.in_progress"),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                in_revision: (tStatus as any)("status.label.in_revision"),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delivered: (tStatus as any)("status.label.delivered"),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                approved: (tStatus as any)("status.label.approved"),
              },
              cta: {
                cta_draft: tDetail("status.cta.draft"),
                cta_in_review: tDetail("status.cta.in_review"),
                cta_in_progress: tDetail("status.cta.in_progress"),
                cta_in_revision: tDetail("status.cta.in_revision"),
                cta_delivered: tDetail("status.cta.delivered"),
                cta_approved: tDetail("status.cta.approved"),
                empty_state_submitted: tDetail("status.empty_state.submitted"),
                delivered_placeholder: tDetail("delivered_placeholder"),
                modal: {
                  trigger: tDetail("material_append.trigger"),
                  title: tDetail("material_append.title"),
                  description: tDetail("material_append.description"),
                  kindLabel: tDetail("material_append.kind_label"),
                  kindBrief: tDetail("material_append.kind_brief"),
                  kindReference: tDetail("material_append.kind_reference"),
                  sourceLabel: tDetail("material_append.source_label"),
                  sourceUpload: tDetail("material_append.source_upload"),
                  sourceUrl: tDetail("material_append.source_url"),
                  fileLabel: tDetail("material_append.file_label"),
                  urlLabel: tDetail("material_append.url_label"),
                  urlPlaceholder: tDetail("material_append.url_placeholder"),
                  cancel: tDetail("material_append.cancel"),
                  submit: tDetail("material_append.submit"),
                  successToast: tDetail("material_append.success_toast"),
                  errorForbidden: tDetail("material_append.error_forbidden"),
                  errorRlsPending: tDetail("material_append.error_rls_pending"),
                  errorUnknown: tDetail("material_append.error_unknown"),
                },
              },
              brief: {
                deliverable_types: tDetail("summary_card.deliverable_types"),
                description: tDetail("summary_card.description"),
                view_all: tDetail("summary_card.view_all"),
                deliverable_options: {
                  image: tDetail("brief_tab.deliverable_type.image"),
                  ad_video_short: tDetail(
                    "brief_tab.deliverable_type.ad_video_short"
                  ),
                  ad_video_long: tDetail(
                    "brief_tab.deliverable_type.ad_video_long"
                  ),
                  ai_vfx_mv: tDetail("brief_tab.deliverable_type.ai_vfx_mv"),
                  branding_video: tDetail(
                    "brief_tab.deliverable_type.branding_video"
                  ),
                  ad_video: tDetail("brief_tab.deliverable_type.ad_video"),
                  ai_human: tDetail("brief_tab.deliverable_type.ai_human"),
                  motion_graphics: tDetail(
                    "brief_tab.deliverable_type.motion_graphics"
                  ),
                  vfx: tDetail("brief_tab.deliverable_type.vfx"),
                  branding: tDetail("brief_tab.deliverable_type.branding"),
                  illustration: tDetail(
                    "brief_tab.deliverable_type.illustration"
                  ),
                  other: tDetail("brief_tab.deliverable_type.other"),
                },
              },
              attachments: {
                section_heading: tDetail("attachments.section_heading"),
                count_brief: (n: number) =>
                  tDetail("attachments.count_brief", { count: n }),
                count_reference: (n: number) =>
                  tDetail("attachments.count_reference", { count: n }),
                view_all: tDetail("attachments.view_all"),
                empty: tDetail("attachments.empty"),
              },
              comments_section_heading: tDetail(
                "comments_thread.section_heading"
              ),
              comments_placeholder: tDetail("comments_thread.placeholder"),
            }}
          />
        )}
        {activeTab === "brief" && (
          <BriefTab
            locale={localeNarrow}
            projectId={project.id}
            status={project.status}
            title={project.title}
            deliverable_types={project.deliverable_types}
            description={project.brief}
            mood_keywords={project.mood_keywords}
            mood_keywords_free={project.mood_keywords_free}
            visual_ratio={project.visual_ratio}
            visual_ratio_custom={project.visual_ratio_custom}
            channels={project.channels}
            target_audience={project.target_audience}
            additional_notes={project.additional_notes}
            budget_band={project.budget_band}
            target_delivery_at={project.target_delivery_at}
            meeting_preferred_at={project.meeting_preferred_at}
            interested_in_twin={project.interested_in_twin}
            submitted_at={project.submitted_at}
            creator_display_name={creatorDisplayName}
            labels={{
              banner_draft: tDetail("brief_tab.banner_draft"),
              cta_complete: tDetail("brief_tab.cta_complete"),
              section_stage1: tDetail("brief_tab.section_stage1"),
              section_stage2: tDetail("brief_tab.section_stage2"),
              section_stage3: tDetail("brief_tab.section_stage3"),
              field_project_name: tDetail("brief_tab.field_project_name"),
              field_deliverable_types: tDetail("brief_tab.field_deliverable_types"),
              field_description: tDetail("brief_tab.field_description"),
              field_mood_keywords: tDetail("brief_tab.field_mood_keywords"),
              field_channels: tDetail("brief_tab.field_channels"),
              field_target_audience: tDetail("brief_tab.field_target_audience"),
              field_visual_ratio: tDetail("brief_tab.field_visual_ratio"),
              field_additional_notes: tDetail("brief_tab.field_additional_notes"),
              field_budget_band: tDetail("brief_tab.field_budget_band"),
              field_target_delivery_at: tDetail("brief_tab.field_target_delivery_at"),
              field_meeting_preferred_at: tDetail("brief_tab.field_meeting_preferred_at"),
              field_interested_in_twin: tDetail("brief_tab.field_interested_in_twin"),
              field_submitted_at: tDetail("brief_tab.field_submitted_at"),
              field_creator: tDetail("brief_tab.field_creator"),
              empty_dash: tDetail("brief_tab.empty_dash"),
              twin_interested: tDetail("brief_tab.twin_interested"),
              twin_not_interested: tDetail("brief_tab.twin_not_interested"),
              twin_not_answered: tDetail("brief_tab.twin_not_answered"),
              budget_under_1m: tDetail("budget.under_1m"),
              budget_1m_to_5m: tDetail("budget.1m_to_5m"),
              budget_5m_to_10m: tDetail("budget.5m_to_10m"),
              budget_negotiable: tDetail("budget.negotiable"),
              mood_options: {
                emotional: tDetail("brief_tab.mood.emotional"),
                sophisticated: tDetail("brief_tab.mood.sophisticated"),
                humorous: tDetail("brief_tab.mood.humorous"),
                dynamic: tDetail("brief_tab.mood.dynamic"),
                minimal: tDetail("brief_tab.mood.minimal"),
                warm: tDetail("brief_tab.mood.warm"),
                luxurious: tDetail("brief_tab.mood.luxurious"),
                trendy: tDetail("brief_tab.mood.trendy"),
                friendly: tDetail("brief_tab.mood.friendly"),
              },
              channel_options: {
                instagram: tDetail("brief_tab.channel.instagram"),
                youtube: tDetail("brief_tab.channel.youtube"),
                tiktok: tDetail("brief_tab.channel.tiktok"),
                facebook: tDetail("brief_tab.channel.facebook"),
                website: tDetail("brief_tab.channel.website"),
                offline: tDetail("brief_tab.channel.offline"),
                other: tDetail("brief_tab.channel.other"),
              },
              visual_ratio_options: {
                "1_1": tDetail("brief_tab.visual_ratio.1_1"),
                "16_9": tDetail("brief_tab.visual_ratio.16_9"),
                "9_16": tDetail("brief_tab.visual_ratio.9_16"),
                "4_5": tDetail("brief_tab.visual_ratio.4_5"),
                "239_1": tDetail("brief_tab.visual_ratio.239_1"),
                custom: tDetail("brief_tab.visual_ratio.custom"),
              },
              deliverable_type_options: {
                image: tDetail("brief_tab.deliverable_type.image"),
                ad_video_short: tDetail("brief_tab.deliverable_type.ad_video_short"),
                ad_video_long: tDetail("brief_tab.deliverable_type.ad_video_long"),
                ai_vfx_mv: tDetail("brief_tab.deliverable_type.ai_vfx_mv"),
                branding_video: tDetail("brief_tab.deliverable_type.branding_video"),
                ad_video: tDetail("brief_tab.deliverable_type.ad_video"),
                ai_human: tDetail("brief_tab.deliverable_type.ai_human"),
                motion_graphics: tDetail("brief_tab.deliverable_type.motion_graphics"),
                vfx: tDetail("brief_tab.deliverable_type.vfx"),
                branding: tDetail("brief_tab.deliverable_type.branding"),
                illustration: tDetail("brief_tab.deliverable_type.illustration"),
                other: tDetail("brief_tab.deliverable_type.other"),
              },
            }}
          />
        )}
        {activeTab === "board" && (
          <BoardTab
            projectId={project.id}
            isYagiAdmin={isYagiAdmin}
            locale={localeNarrow}
          />
        )}
        {activeTab === "comments" && (
          <EmptyStateTab
            heading={tDetail("empty_state.comments.heading")}
            subtext={tDetail("empty_state.comments.subtext")}
            Icon={MessageSquare}
          />
        )}
        {activeTab === "deliverables" && (
          <EmptyStateTab
            heading={tDetail("empty_state.deliverables.heading")}
            subtext={tDetail("empty_state.deliverables.subtext")}
            Icon={Package}
          />
        )}
      </div>

      {/* L6 Admin actions row */}
      {viewerRole === "admin" && (
        <div className="border-t border-border/40 pt-8 flex flex-wrap items-center gap-4">
          <ProjectActionButtons
            projectId={project.id}
            status={project.status}
            viewerRole="admin"
            locale={localeNarrow}
          />
          {isYagiAdmin && <AdminDeleteButton projectId={project.id} />}
        </div>
      )}
    </div>
  );
}

codex
One issue candidate is visible in `page.tsx`: several Korean literals/comments are mojibake in the terminal output, and I need to distinguish display encoding from an actual syntax problem. I’m checking line-numbered source and TypeScript diagnostics before treating it as a finding.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/[id]/page.tsx' | ForEach-Object { if ("'$i -ge 240 -and $i -le 330) { '"'{0,4}: {1}' -f "'$i, $_ }; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'package.json'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/[id]/page.tsx' | ForEach-Object { if ("'$i -ge 520 -and $i -le 610) { '"'{0,4}: {1}' -f "'$i, $_ }; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/components/project-detail/tabs.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 456ms:
 240:       thumbnail_url: string | null;
 241:       filename: string | null;
 242:       url: string | null;
 243:     }>;
 244:     briefDocsCount = docs.filter((d) => d.kind === "brief").length;
 245:     referenceDocsCount = docs.filter((d) => d.kind === "reference").length;
 246:     // SPEC 짠"泥⑤??먮즺 ?붿빟" ??湲고쉷???곗꽑 ???덊띁?곗뒪. Stable sort by kind
 247:     // then keep insertion order within each kind. slice(0, 3).
 248:     topThreeDocs = [
 249:       ...docs.filter((d) => d.kind === "brief"),
 250:       ...docs.filter((d) => d.kind === "reference"),
 251:     ].slice(0, 3);
 252:   } catch {
 253:     // Non-fatal ??render empty attachments section
 254:   }
 255: 
 256:   // Authorization (BLOCKER 1 consistency: use created_by, NOT owner_id).
 257:   const { data: roleRows } = await supabase
 258:     .from("user_roles")
 259:     .select("role, workspace_id")
 260:     .eq("user_id", user.id);
 261: 
 262:   const roles = new Set(
 263:     (roleRows ?? [])
 264:       .filter(
 265:         (r) =>
 266:           r.workspace_id === null || r.workspace_id === project.workspace_id
 267:       )
 268:       .map((r) => r.role as string)
 269:   );
 270: 
 271:   const isYagiAdmin = roles.has("yagi_admin");
 272:   const isWsAdmin = roles.has("workspace_admin");
 273:   const isOwner = project.created_by === user.id;
 274: 
 275:   if (!isYagiAdmin && !isWsAdmin && !isOwner) notFound();
 276: 
 277:   const viewerRole: "admin" | "client" = isYagiAdmin || isWsAdmin
 278:     ? "admin"
 279:     : "client";
 280: 
 281:   const localeNarrow: "ko" | "en" = locale === "en" ? "en" : "ko";
 282:   const workspaceName = project.workspace?.name ?? "??;
 283:   const brandName = project.brand?.name ?? null;
 284: 
 285:   // Status pill label (uses existing translations namespace -- same map
 286:   // already powers StatusBadge elsewhere).
 287:   const tStatus = await getTranslations({ locale, namespace: "projects" });
 288:   const statusLabel =
 289:     tStatus.has(`status_${project.status}` as never)
 290:       ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
 291:         (tStatus as any)(`status_${project.status}`)
 292:       : project.status;
 293: 
 294:   // Phase 5 Wave C C_1 ??Cancelled / Archived banner. Renders above
 295:   // the entire page chrome when status terminates the lifecycle. Full
 296:   // styling + the [???섎ː ?쒖옉] link variant land in C_5; for now this
 297:   // is a text-only placeholder so the gate is observable.
 298:   const isTerminalStatus =
 299:     project.status === "cancelled" || project.status === "archived";
 300: 
 301:   return (
 302:     <div className="px-6 md:px-10 py-10 max-w-[1280px] mx-auto">
 303:       {isTerminalStatus && (
 304:         <CancelledArchivedBanner
 305:           variant={project.status as "cancelled" | "archived"}
 306:           locale={locale}
 307:           labels={{
 308:             cancelled: tDetail("banner.cancelled"),
 309:             cancelledLinkText: tDetail("banner.cancelled_link_text"),
 310:             archived: tDetail("banner.archived"),
 311:           }}
 312:         />
 313:       )}
 314: 
 315:       {/* L1 Breadcrumb */}
 316:       <nav
 317:         aria-label="breadcrumb"
 318:         className="mb-6 text-sm text-muted-foreground"
 319:       >
 320:         <Link
 321:           href={`/${locale}/app/projects`}
 322:           className="hover:text-foreground transition-colors"
 323:         >
 324:           {t("list_title")}
 325:         </Link>
 326:         <span className="mx-1.5 text-muted-foreground/60">??/span>
 327:         <span>{workspaceName}</span>
 328:         {brandName && (
 329:           <>
 330:             <span className="mx-1.5 text-muted-foreground/60">??/span>

 succeeded in 449ms:
{
  "name": "yagi-workshop",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "lint:rsc-form-action": "node scripts/test-rsc-form-action-rule.mjs",
    "check:rsc-form-action": "bash scripts/check-rsc-form-action.sh",
    "verify:rsc-form-action": "pnpm check:rsc-form-action && pnpm lint:rsc-form-action",
    "test:ssrf-defense": "node scripts/test-ssrf-defense.mjs",
    "test:saveversion-race": "node scripts/test-saveversion-race.mjs",
    "test:r2-brief-asset": "node scripts/test-r2-brief-asset.mjs",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "prepare": "husky"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1035.0",
    "@aws-sdk/s3-request-presigner": "^3.1035.0",
    "@base-ui/react": "^1.4.1",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@react-email/components": "^1.0.12",
    "@react-email/render": "^2.0.7",
    "@supabase/ssr": "^0.10.2",
    "@supabase/supabase-js": "^2.104.0",
    "@tanstack/react-query": "^5.99.2",
    "@tanstack/react-query-devtools": "^5.99.2",
    "@tiptap/core": "3.22.4",
    "@tiptap/pm": "3.22.4",
    "@tiptap/react": "3.22.4",
    "@tiptap/starter-kit": "3.22.4",
    "@tiptap/suggestion": "3.22.4",
    "@tldraw/tldraw": "^4.5.10",
    "@vercel/og": "^0.11.1",
    "bcryptjs": "^3.0.3",
    "cheerio": "1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.38.0",
    "google-auth-library": "^10.6.2",
    "lucide-react": "^1.8.0",
    "next": "15.5.0",
    "next-intl": "^4.9.1",
    "next-themes": "^0.4.6",
    "pdfjs-dist": "^5.6.205",
    "react": "19.1.0",
    "react-day-picker": "^9.14.0",
    "react-dom": "19.1.0",
    "react-dropzone": "^15.0.0",
    "react-hook-form": "^7.73.1",
    "react-image-crop": "^11.0.10",
    "react-markdown": "^10.1.0",
    "rehype-sanitize": "^6.0.0",
    "resend": "^6.12.2",
    "shadcn": "^4.3.1",
    "slugify": "^1.6.9",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "tailwindcss-animate": "^1.0.7",
    "tippy.js": "6.3.7",
    "tw-animate-css": "^1.4.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@content-collections/core": "^0.15.0",
    "@content-collections/mdx": "^0.2.2",
    "@content-collections/next": "^0.2.11",
    "@eslint/eslintrc": "^3",
    "@playwright/test": "1.55.0",
    "@types/bcryptjs": "^3.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/react-dropzone": "^5.1.0",
    "autoprefixer": "^10.5.0",
    "eslint": "^9",
    "eslint-config-next": "15.5.0",
    "husky": "^9.1.7",
    "postcss": "^8.4.31",
    "sharp": "^0.34.5",
    "tailwindcss": "^3.4.19",
    "typescript": "^5"
  }
}

 succeeded in 461ms:
   1: // Phase 5 Wave C C_1 ??Detail page 5-tab structure.
   2: //
   3: // Tab order per SPEC 짠"Scope: 5 tab 援ъ“":
   4: //   ?꾪솴 (status) ??DEFAULT, full ship in C_2/C_3 (timeline + CTA + brief
   5: //     summary + attachment summary + comments thread placeholder)
   6: //   釉뚮━??(brief) ??read-only Stage 1/2/3 view, ships in C_4
   7: //   蹂대뱶 (board) ??wraps existing brief-board-shell-client, no change to
   8: //     the wrapped component (board-tab.tsx already imports it)
   9: //   肄붾찘??(comments) ??placeholder, lands in FU-Phase5-10
  10: //   寃곌낵臾?(deliverables) ??placeholder, lands in FU-Phase5-11
  11: //
  12: // Phase 4.x's "progress" (status history) tab is removed. Its surface
  13: // moves into the ?꾪솴 timeline (C_2) and recent activity feed (C_3 +
  14: // FU-Phase5-10 thread).
  15: //
  16: // Routing convention preserved from Phase 4.x: ?tab= query param so
  17: // URLs are shareable and back-button-aware.
  18: //
  19: // Visual: Pretendard medium for active, muted-foreground for inactive,
  20: // border-b-2 underline on active, hairline divider on the strip itself.
  21: // Disabled placeholder tabs (comments / deliverables) keep the same
  22: // visual rhythm but use cursor-not-allowed + aria-disabled and DO NOT
  23: // render an anchor ??clicks are no-ops and produce no router push.
  24: 
  25: import Link from "next/link";
  26: 
  27: export type TabKey =
  28:   | "status"
  29:   | "brief"
  30:   | "board"
  31:   | "comments"
  32:   | "deliverables";
  33: 
  34: type Props = {
  35:   active: TabKey;
  36:   labels: Record<TabKey, string>;
  37: };
  38: 
  39: const TAB_ORDER: { key: TabKey; disabled: boolean }[] = [
  40:   { key: "status", disabled: false },
  41:   { key: "brief", disabled: false },
  42:   { key: "board", disabled: false },
  43:   { key: "comments", disabled: true },
  44:   { key: "deliverables", disabled: true },
  45: ];
  46: 
  47: export function DetailTabs({ active, labels }: Props) {
  48:   return (
  49:     <div
  50:       role="tablist"
  51:       aria-label="Project detail tabs"
  52:       className="flex items-center gap-1 border-b border-border/40 overflow-x-auto"
  53:     >
  54:       {TAB_ORDER.map(({ key, disabled }) => {
  55:         const isActive = active === key;
  56:         const baseClass =
  57:           "px-3 py-2 text-xs uppercase tracking-[0.12em] border-b-2 -mb-px shrink-0 keep-all";
  58:         const stateClass = disabled
  59:           ? "border-transparent text-muted-foreground/60 cursor-not-allowed"
  60:           : isActive
  61:             ? "border-foreground text-foreground font-medium"
  62:             : "border-transparent text-muted-foreground hover:text-foreground";
  63: 
  64:         if (disabled) {
  65:           return (
  66:             <span
  67:               key={key}
  68:               role="tab"
  69:               aria-selected={false}
  70:               aria-disabled={true}
  71:               className={`${baseClass} ${stateClass}`}
  72:             >
  73:               {labels[key]}
  74:             </span>
  75:           );
  76:         }
  77: 
  78:         return (
  79:           <Link
  80:             key={key}
  81:             href={`?tab=${key}`}
  82:             scroll={false}
  83:             role="tab"
  84:             aria-selected={isActive}
  85:             className={`${baseClass} ${stateClass}`}
  86:           >
  87:             {labels[key]}
  88:           </Link>
  89:         );
  90:       })}
  91:     </div>
  92:   );
  93: }

 succeeded in 468ms:
 520:                     "brief_tab.deliverable_type.motion_graphics"
 521:                   ),
 522:                   vfx: tDetail("brief_tab.deliverable_type.vfx"),
 523:                   branding: tDetail("brief_tab.deliverable_type.branding"),
 524:                   illustration: tDetail(
 525:                     "brief_tab.deliverable_type.illustration"
 526:                   ),
 527:                   other: tDetail("brief_tab.deliverable_type.other"),
 528:                 },
 529:               },
 530:               attachments: {
 531:                 section_heading: tDetail("attachments.section_heading"),
 532:                 count_brief: (n: number) =>
 533:                   tDetail("attachments.count_brief", { count: n }),
 534:                 count_reference: (n: number) =>
 535:                   tDetail("attachments.count_reference", { count: n }),
 536:                 view_all: tDetail("attachments.view_all"),
 537:                 empty: tDetail("attachments.empty"),
 538:               },
 539:               comments_section_heading: tDetail(
 540:                 "comments_thread.section_heading"
 541:               ),
 542:               comments_placeholder: tDetail("comments_thread.placeholder"),
 543:             }}
 544:           />
 545:         )}
 546:         {activeTab === "brief" && (
 547:           <BriefTab
 548:             locale={localeNarrow}
 549:             projectId={project.id}
 550:             status={project.status}
 551:             title={project.title}
 552:             deliverable_types={project.deliverable_types}
 553:             description={project.brief}
 554:             mood_keywords={project.mood_keywords}
 555:             mood_keywords_free={project.mood_keywords_free}
 556:             visual_ratio={project.visual_ratio}
 557:             visual_ratio_custom={project.visual_ratio_custom}
 558:             channels={project.channels}
 559:             target_audience={project.target_audience}
 560:             additional_notes={project.additional_notes}
 561:             budget_band={project.budget_band}
 562:             target_delivery_at={project.target_delivery_at}
 563:             meeting_preferred_at={project.meeting_preferred_at}
 564:             interested_in_twin={project.interested_in_twin}
 565:             submitted_at={project.submitted_at}
 566:             creator_display_name={creatorDisplayName}
 567:             labels={{
 568:               banner_draft: tDetail("brief_tab.banner_draft"),
 569:               cta_complete: tDetail("brief_tab.cta_complete"),
 570:               section_stage1: tDetail("brief_tab.section_stage1"),
 571:               section_stage2: tDetail("brief_tab.section_stage2"),
 572:               section_stage3: tDetail("brief_tab.section_stage3"),
 573:               field_project_name: tDetail("brief_tab.field_project_name"),
 574:               field_deliverable_types: tDetail("brief_tab.field_deliverable_types"),
 575:               field_description: tDetail("brief_tab.field_description"),
 576:               field_mood_keywords: tDetail("brief_tab.field_mood_keywords"),
 577:               field_channels: tDetail("brief_tab.field_channels"),
 578:               field_target_audience: tDetail("brief_tab.field_target_audience"),
 579:               field_visual_ratio: tDetail("brief_tab.field_visual_ratio"),
 580:               field_additional_notes: tDetail("brief_tab.field_additional_notes"),
 581:               field_budget_band: tDetail("brief_tab.field_budget_band"),
 582:               field_target_delivery_at: tDetail("brief_tab.field_target_delivery_at"),
 583:               field_meeting_preferred_at: tDetail("brief_tab.field_meeting_preferred_at"),
 584:               field_interested_in_twin: tDetail("brief_tab.field_interested_in_twin"),
 585:               field_submitted_at: tDetail("brief_tab.field_submitted_at"),
 586:               field_creator: tDetail("brief_tab.field_creator"),
 587:               empty_dash: tDetail("brief_tab.empty_dash"),
 588:               twin_interested: tDetail("brief_tab.twin_interested"),
 589:               twin_not_interested: tDetail("brief_tab.twin_not_interested"),
 590:               twin_not_answered: tDetail("brief_tab.twin_not_answered"),
 591:               budget_under_1m: tDetail("budget.under_1m"),
 592:               budget_1m_to_5m: tDetail("budget.1m_to_5m"),
 593:               budget_5m_to_10m: tDetail("budget.5m_to_10m"),
 594:               budget_negotiable: tDetail("budget.negotiable"),
 595:               mood_options: {
 596:                 emotional: tDetail("brief_tab.mood.emotional"),
 597:                 sophisticated: tDetail("brief_tab.mood.sophisticated"),
 598:                 humorous: tDetail("brief_tab.mood.humorous"),
 599:                 dynamic: tDetail("brief_tab.mood.dynamic"),
 600:                 minimal: tDetail("brief_tab.mood.minimal"),
 601:                 warm: tDetail("brief_tab.mood.warm"),
 602:                 luxurious: tDetail("brief_tab.mood.luxurious"),
 603:                 trendy: tDetail("brief_tab.mood.trendy"),
 604:                 friendly: tDetail("brief_tab.mood.friendly"),
 605:               },
 606:               channel_options: {
 607:                 instagram: tDetail("brief_tab.channel.instagram"),
 608:                 youtube: tDetail("brief_tab.channel.youtube"),
 609:                 tiktok: tDetail("brief_tab.channel.tiktok"),
 610:                 facebook: tDetail("brief_tab.channel.facebook"),

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'pnpm exec tsc --noEmit' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 3627ms:
codex
TypeScript passes, so the mojibake in `page.tsx` is terminal rendering rather than a build break. I’m moving through the presentation components next, especially whether owner-only CTA gating and disabled-tab behavior match the stated scope.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/project-detail/status-timeline.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/project-detail/status-tab.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/project-detail/brief-tab.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/project-detail/brief-summary-card.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/project-detail/attachment-summary.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 418ms:
// Phase 5 Wave C C_2 ??Status timeline (vertical stepper, 7 active states).
//
// Replaces the Phase 4.x horizontal pipeline component with a vertical
// stepper per SPEC 짠"Status wording (PRODUCT-MASTER 짠C.3 v1.2)".
//
// Design decisions:
// - in_revision is rendered as an inline badge on the in_progress step
//   (KICKOFF 짠C_2 ON_FAIL_LOOP loop 1 preferred pattern; avoids nested
//    sub-step which breaks timeline visual rhythm)
// - cancelled / archived are NOT in the timeline (those route to the
//   CancelledArchivedBanner already shipped in C_1)
// - Sage #71D083 only on the CURRENT step (dot + label bold)
// - Completed steps render with a check icon + muted foreground
// - Future steps render muted with no accent
// - Server component ??no client interaction needed for C_2
//
// 7 timeline steps:
//   1. draft        ???묒꽦 以?/ Drafting
//   2. submitted    ???섎ː ?묒닔 / Submitted
//   3. in_review    ??寃??以?/ In review
//   4. in_progress  ???묒뾽 吏꾪뻾 / In production  [in_revision badge if sub-state]
//   5. delivered    ???쒖븞 ?꾩갑 / Draft delivered
//   6. approved     ???뱀씤 ?꾨즺 / Approved (terminal)
//
// Design tokens (yagi-design-system v1.0):
// - sage #71D083 current step accent
// - border-border/40 for subtle borders
// - radius 24 (rounded-3xl) on container; 999 (rounded-full) on dots
// - zero shadow; Pretendard lh ~1.18 ls -0.01em

type StatusTimelineLabels = {
  draft: string;
  submitted: string;
  in_review: string;
  in_progress: string;
  in_revision: string;
  delivered: string;
  approved: string;
};

type Props = {
  status: string;
  labels: StatusTimelineLabels;
};

// Ordered list of the 7 timeline steps. in_revision maps to the same
// step index as in_progress (step 3, zero-based).
const TIMELINE_STEPS: Array<{ key: string; statusKeys: string[] }> = [
  { key: "draft", statusKeys: ["draft"] },
  { key: "submitted", statusKeys: ["submitted"] },
  { key: "in_review", statusKeys: ["in_review"] },
  { key: "in_progress", statusKeys: ["in_progress", "in_revision"] },
  { key: "delivered", statusKeys: ["delivered"] },
  { key: "approved", statusKeys: ["approved"] },
];

function deriveStepIndex(status: string): number {
  for (let i = 0; i < TIMELINE_STEPS.length; i++) {
    if (TIMELINE_STEPS[i].statusKeys.includes(status)) return i;
  }
  // cancelled / archived do not appear in timeline ??return -1 sentinel.
  // Callers should not render this component for those statuses.
  return -1;
}

function CheckIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M1.5 5L4 7.5L8.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatusTimeline({ status, labels }: Props) {
  const activeIndex = deriveStepIndex(status);
  const isInRevision = status === "in_revision";

  // For cancelled / archived: render nothing ??the CancelledArchivedBanner
  // handles those. The parent page should not render StatusTimeline for
  // those statuses, but guard defensively.
  if (activeIndex === -1) return null;

  return (
    <nav aria-label="Project status timeline">
      <ol className="flex flex-col gap-0" role="list">
        {TIMELINE_STEPS.map((step, i) => {
          const isCurrent = i === activeIndex;
          const isCompleted = i < activeIndex;
          const isLast = i === TIMELINE_STEPS.length - 1;
          const label = labels[step.key as keyof StatusTimelineLabels];
          const showRevisionBadge = isCurrent && isInRevision;

          return (
            <li key={step.key} className="flex gap-3 min-w-0">
              {/* Left track ??dot + connector line */}
              <div className="flex flex-col items-center shrink-0 w-5">
                {/* Dot */}
                <div
                  className={[
                    "flex items-center justify-center rounded-full shrink-0 mt-[2px]",
                    // Current: sage bg, white icon
                    isCurrent
                      ? "w-5 h-5 bg-[#71D083] text-black"
                      : // Completed: foreground bg, white checkmark
                      isCompleted
                      ? "w-5 h-5 bg-foreground/80 text-background"
                      : // Future: muted border, no fill
                        "w-3 h-3 mt-[5px] border border-border/40 bg-background",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                >
                  {isCurrent && (
                    <span className="block w-2 h-2 rounded-full bg-black/20" />
                  )}
                  {isCompleted && <CheckIcon />}
                </div>

                {/* Connector line (not on last item) */}
                {!isLast && (
                  <div
                    className={[
                      "flex-1 w-px my-1",
                      isCompleted
                        ? "bg-foreground/20"
                        : "bg-border/30",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Right side ??label + optional in_revision badge */}
              <div
                className={[
                  "flex-1 flex flex-col gap-1 pb-5",
                  isLast ? "pb-0" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={[
                      "text-sm leading-[1.18] tracking-[-0.01em] keep-all",
                      isCurrent
                        ? "font-semibold text-[#71D083]"
                        : isCompleted
                        ? "font-medium text-foreground/70"
                        : "font-normal text-muted-foreground/50",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {label}
                  </span>

                  {/* in_revision inline badge ??only on in_progress step when
                      actual status is in_revision (current step) */}
                  {showRevisionBadge && (
                    <span
                      className="inline-flex items-center rounded-full border border-[#71D083]/30 bg-[#71D083]/8 px-2 py-0.5 text-[11px] font-medium text-[#71D083] tracking-[0.02em] keep-all"
                      aria-label={`(${labels.in_revision})`}
                    >
                      {labels.in_revision}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

 succeeded in 437ms:
// Phase 5 Wave C C_3 ???꾪솴 (status) tab full content.
//
// Replaces the C_1 skeleton placeholders with the 5 real sub-sections
// per SPEC 짠"?꾪솴 tab 肄섑뀗痢?:
//   1. Status timeline (vertical stepper, left column)
//   2. Next action CTA (right column top, status-keyed)
//   3. Brief ?붿빟 移대뱶 (right column middle)
//   4. 泥⑤??먮즺 ?붿빟 (right column middle)
//   5. ?쇨린 肄붾찘??thread placeholder (right column bottom ??FU-Phase5-10)
//
// All five sub-sections receive their own props from page.tsx so this
// tab is a pure-composition server component (NextActionCTA + the modal
// inside it are the only "use client" descendants).

import { StatusTimeline } from "./status-timeline";
import {
  NextActionCTA,
  type MaterialAppendModalLabels,
} from "./next-action-cta";
import { BriefSummaryCard } from "./brief-summary-card";
import {
  AttachmentSummary,
  type AttachmentItem,
} from "./attachment-summary";

type Props = {
  status: string;
  isOwner: boolean;
  projectId: string;
  locale: string;
  // Stage 1 brief summary inputs
  title: string;
  deliverableTypes: string[];
  description: string | null;
  // Attachment summary inputs
  briefCount: number;
  referenceCount: number;
  topThree: AttachmentItem[];
  // i18n labels
  labels: {
    timeline: {
      draft: string;
      submitted: string;
      in_review: string;
      in_progress: string;
      in_revision: string;
      delivered: string;
      approved: string;
    };
    cta: {
      cta_draft: string;
      cta_in_review: string;
      cta_in_progress: string;
      cta_in_revision: string;
      cta_delivered: string;
      cta_approved: string;
      empty_state_submitted: string;
      delivered_placeholder: string;
      modal: MaterialAppendModalLabels;
    };
    brief: {
      deliverable_types: string;
      description: string;
      view_all: string;
      deliverable_options: Record<string, string>;
    };
    attachments: {
      section_heading: string;
      count_brief: (n: number) => string;
      count_reference: (n: number) => string;
      view_all: string;
      empty: string;
    };
    comments_placeholder: string;
    comments_section_heading: string;
  };
};

export function StatusTab({
  status,
  isOwner,
  projectId,
  locale,
  title,
  deliverableTypes,
  description,
  briefCount,
  referenceCount,
  topThree,
  labels,
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
      {/* Left column ??vertical status timeline (full height) */}
      <div className="md:row-span-4">
        <StatusTimeline status={status} labels={labels.timeline} />
      </div>

      {/* Right column 1: Next action CTA */}
      <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-3">
        <NextActionCTA
          projectId={projectId}
          status={status}
          isOwner={isOwner}
          locale={locale}
          labels={labels.cta}
        />
      </section>

      {/* Right column 2: Brief ?붿빟 移대뱶 */}
      <BriefSummaryCard
        projectId={projectId}
        locale={locale}
        title={title}
        deliverableTypes={deliverableTypes}
        description={description}
        labels={labels.brief}
      />

      {/* Right column 3: 泥⑤??먮즺 ?붿빟 */}
      <AttachmentSummary
        briefCount={briefCount}
        referenceCount={referenceCount}
        topThree={topThree}
        labels={labels.attachments}
      />

      {/* Right column 4: ?쇨린 肄붾찘??thread placeholder (FU-Phase5-10) */}
      <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
          {labels.comments_section_heading}
        </h3>
        <p className="text-sm text-muted-foreground/70 leading-relaxed keep-all">
          {labels.comments_placeholder}
        </p>
      </section>
    </div>
  );
}

 succeeded in 436ms:
// =============================================================================
// Phase 5 Wave C C_3 ??Brief ?붿빟 移대뱶 (?꾪솴 tab middle).
//
// 3-line preview per SPEC 짠"Brief ?붿빟 移대뱶":
//   - Project name (heading)
//   - deliverable_types (chips)
//   - description first 80 chars (truncate, multibyte-safe)
//   - "?꾩껜 釉뚮━??蹂닿린 ?? link ???tab=brief (same-page tab switch)
//
// Server component ??no client interaction.

import Link from "next/link";

type Props = {
  projectId: string;
  locale: string;
  title: string;
  deliverableTypes: string[];
  description: string | null;
  labels: {
    deliverable_types: string;
    description: string;
    view_all: string;
    deliverable_options: Record<string, string>;
  };
};

// Multibyte-safe truncate using Intl.Segmenter when available, falling
// back to Array.from for grapheme-aware iteration.
function truncate80(text: string): string {
  if (!text) return "";
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const segments = Array.from(segmenter.segment(text));
    if (segments.length <= 80) return text;
    return segments.slice(0, 80).map((s) => s.segment).join("") + "??;
  }
  const chars = Array.from(text);
  if (chars.length <= 80) return text;
  return chars.slice(0, 80).join("") + "??;
}

export function BriefSummaryCard({
  projectId: _projectId,
  locale: _locale,
  title,
  deliverableTypes,
  description,
  labels,
}: Props) {
  void _projectId;
  void _locale;
  return (
    <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-4">
      <h3 className="text-base font-semibold tracking-tight keep-all">
        {title}
      </h3>

      {deliverableTypes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
            {labels.deliverable_types}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {deliverableTypes.map((kind) => (
              <span
                key={kind}
                className="inline-flex items-center rounded-full border border-border/60 px-2.5 py-0.5 text-xs font-medium text-foreground/80 keep-all"
              >
                {labels.deliverable_options[kind] ?? kind}
              </span>
            ))}
          </div>
        </div>
      )}

      {description && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
            {labels.description}
          </span>
          <p className="text-sm text-foreground/80 leading-relaxed keep-all">
            {truncate80(description)}
          </p>
        </div>
      )}

      <div className="pt-1">
        <Link
          href="?tab=brief"
          scroll={false}
          className="text-xs font-medium text-foreground/70 underline-offset-4 hover:underline transition-colors keep-all"
        >
          {labels.view_all}
        </Link>
      </div>
    </section>
  );
}

 succeeded in 440ms:
// Phase 5 Wave C C_4 ??釉뚮━??tab read-only view + [釉뚮━???꾩꽦?섍린 ?? CTA.
//
// Renders 3 sections:
//   Stage 1 (Intent)   ??title, deliverable_types, description, mood_keywords,
//                         channels, target_audience, visual_ratio, additional_notes
//   Stage 2 (Commit)   ??budget_band, target_delivery_at, meeting_preferred_at,
//                         interested_in_twin (3-way: true/false/null)
//   Stage 3 (Submit)   ??submitted_at, creator display name
//
// All values are rendered via dt/dd semantic structure ??NO input controls.
// Banner + CTA gating per SPEC 짠"Edit affordance (D5)":
//   status='draft' ??banner + primary [釉뚮━???꾩꽦?섍린 ?? CTA
//   status!='draft' ??read-only only
//
// interested_in_twin 3-way:
//   true  ??"愿???덉쓬 / Interested"
//   false ??"愿???놁쓬 / Not interested"
//   null  ??"誘몄쓳??/ Not answered"
//
// Display value transformations:
//   - chips for text[] columns
//   - date-only for target_delivery_at (YYYY-MM-DD)
//   - date+time for meeting_preferred_at and submitted_at (YYYY-MM-DD HH:mm)
//   - visual_ratio enum translated + visual_ratio_custom alongside if 'custom'
//
// CTA href: /${locale}/app/projects/new?project={projectId}
//   Query-param hydration wired in Wave B.5 commit 0dfc641.

import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BriefTabProps = {
  locale: "ko" | "en";
  projectId: string;
  status: string;

  // Stage 1
  title: string;
  deliverable_types: string[];
  description: string | null; // projects.brief column
  mood_keywords: string[];
  mood_keywords_free: string | null;
  visual_ratio: string | null;
  visual_ratio_custom: string | null;
  channels: string[];
  target_audience: string | null;
  additional_notes: string | null;

  // Stage 2 (commit)
  budget_band: string | null;
  target_delivery_at: string | null;
  meeting_preferred_at: string | null;
  interested_in_twin: boolean | null;

  // Stage 3 (submit meta)
  submitted_at: string | null;
  creator_display_name: string | null;

  // i18n labels (passed from server page so no client i18n dependency)
  labels: BriefTabLabels;
};

export type BriefTabLabels = {
  // Draft banner
  banner_draft: string;
  cta_complete: string;
  // Section headings
  section_stage1: string;
  section_stage2: string;
  section_stage3: string;
  // Stage 1 field labels
  field_project_name: string;
  field_deliverable_types: string;
  field_description: string;
  field_mood_keywords: string;
  field_channels: string;
  field_target_audience: string;
  field_visual_ratio: string;
  field_additional_notes: string;
  // Stage 2 field labels
  field_budget_band: string;
  field_target_delivery_at: string;
  field_meeting_preferred_at: string;
  field_interested_in_twin: string;
  // Stage 3 field labels
  field_submitted_at: string;
  field_creator: string;
  // Empty / fallback
  empty_dash: string;
  // interested_in_twin 3-way
  twin_interested: string;
  twin_not_interested: string;
  twin_not_answered: string;
  // Budget band map
  budget_under_1m: string;
  budget_1m_to_5m: string;
  budget_5m_to_10m: string;
  budget_negotiable: string;
  // Mood options map (union of known keys + fallback)
  mood_options: Record<string, string>;
  // Channel options map
  channel_options: Record<string, string>;
  // Visual ratio options map
  visual_ratio_options: Record<string, string>;
  // Deliverable type options map
  deliverable_type_options: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Date formatting helpers (no external deps ??server component safe)
// ---------------------------------------------------------------------------

function formatDateOnly(isoString: string): string {
  // Input: ISO date string "YYYY-MM-DD" or full ISO datetime.
  // YYYY-MM-DD is the universal display format for both KO and EN.
  return isoString.slice(0, 10);
}

function formatDateTime(isoString: string, locale: "ko" | "en"): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    if (locale === "en") {
      return `${year}-${month}-${day} ${hours}:${mins}`;
    }
    return `${year}-${month}-${day} ${hours}:${mins}`;
  } catch {
    return isoString;
  }
}

// ---------------------------------------------------------------------------
// Chip display (read-only, non-interactive)
// ---------------------------------------------------------------------------

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/60 px-2.5 py-0.5 text-xs font-medium text-foreground/80 keep-all">
      {label}
    </span>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Chip key={item} label={item} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field row ??dt/dd pair with subtle hairline divider
// ---------------------------------------------------------------------------

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 border-b border-border/30 last:border-0 grid grid-cols-[160px_1fr] gap-4 items-start">
      <dt className="text-xs font-medium text-muted-foreground keep-all pt-0.5 shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-foreground keep-all leading-relaxed">
        {children}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section card
// ---------------------------------------------------------------------------

function SectionCard({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-0">
      <h3 className="text-sm font-semibold tracking-tight keep-all mb-4 text-foreground">
        {heading}
      </h3>
      <dl className="flex flex-col">{children}</dl>
    </section>
  );
}

// ---------------------------------------------------------------------------
// EmptyValue helper
// ---------------------------------------------------------------------------

function EmptyValue({ dash }: { dash: string }) {
  return <span className="text-muted-foreground/60">{dash}</span>;
}

// ---------------------------------------------------------------------------
// Main BriefTab component
// ---------------------------------------------------------------------------

export function BriefTab({
  locale,
  projectId,
  status,
  title,
  deliverable_types,
  description,
  mood_keywords,
  mood_keywords_free,
  visual_ratio,
  visual_ratio_custom,
  channels,
  target_audience,
  additional_notes,
  budget_band,
  target_delivery_at,
  meeting_preferred_at,
  interested_in_twin,
  submitted_at,
  creator_display_name,
  labels,
}: BriefTabProps) {
  const isDraft = status === "draft";

  // Resolve display values for mapped fields
  const resolvedDeliverableTypes = deliverable_types
    .map((k) => labels.deliverable_type_options[k] ?? k)
    .filter(Boolean);

  const resolvedMoodKeywords = mood_keywords
    .map((k) => labels.mood_options[k] ?? k)
    .filter(Boolean);

  const moodDisplay: string[] = [...resolvedMoodKeywords];
  if (mood_keywords_free?.trim()) {
    moodDisplay.push(mood_keywords_free.trim());
  }

  const resolvedChannels = channels
    .map((k) => labels.channel_options[k] ?? k)
    .filter(Boolean);

  const resolvedVisualRatio = visual_ratio
    ? visual_ratio === "custom"
      ? `${labels.visual_ratio_options["custom"] ?? "custom"}${visual_ratio_custom ? ` (${visual_ratio_custom})` : ""}`
      : (labels.visual_ratio_options[visual_ratio] ?? visual_ratio)
    : null;

  const resolvedBudgetBand = budget_band
    ? budget_band === "under_1m"
      ? labels.budget_under_1m
      : budget_band === "1m_to_5m"
        ? labels.budget_1m_to_5m
        : budget_band === "5m_to_10m"
          ? labels.budget_5m_to_10m
          : budget_band === "negotiable"
            ? labels.budget_negotiable
            : budget_band
    : null;

  const resolvedInterestedInTwin =
    interested_in_twin === null
      ? labels.twin_not_answered
      : interested_in_twin
        ? labels.twin_interested
        : labels.twin_not_interested;

  const dash = <EmptyValue dash={labels.empty_dash} />;

  return (
    <div className="flex flex-col gap-6">
      {/* Draft banner + CTA (D5 gate) */}
      {isDraft && (
        <div className="rounded-2xl border border-[#71D083]/40 bg-[#71D083]/8 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-foreground keep-all leading-relaxed">
            {labels.banner_draft}
          </p>
          <Link
            href={`/${locale}/app/projects/new?project=${projectId}`}
            className="shrink-0 inline-flex items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold px-5 py-2 hover:opacity-80 transition-opacity keep-all"
          >
            {labels.cta_complete}
          </Link>
        </div>
      )}

      {/* Stage 1 ??Intent */}
      <SectionCard heading={labels.section_stage1}>
        <FieldRow label={labels.field_project_name}>
          {title || dash}
        </FieldRow>
        <FieldRow label={labels.field_deliverable_types}>
          {resolvedDeliverableTypes.length > 0 ? (
            <ChipList items={resolvedDeliverableTypes} />
          ) : (
            dash
          )}
        </FieldRow>
        <FieldRow label={labels.field_description}>
          {description ? (
            <span className="whitespace-pre-wrap">{description}</span>
          ) : (
            dash
          )}
        </FieldRow>
        <FieldRow label={labels.field_mood_keywords}>
          {moodDisplay.length > 0 ? <ChipList items={moodDisplay} /> : dash}
        </FieldRow>
        <FieldRow label={labels.field_channels}>
          {resolvedChannels.length > 0 ? (
            <ChipList items={resolvedChannels} />
          ) : (
            dash
          )}
        </FieldRow>
        <FieldRow label={labels.field_target_audience}>
          {target_audience ? (
            <span className="whitespace-pre-wrap">{target_audience}</span>
          ) : (
            dash
          )}
        </FieldRow>
        <FieldRow label={labels.field_visual_ratio}>
          {resolvedVisualRatio || dash}
        </FieldRow>
        <FieldRow label={labels.field_additional_notes}>
          {additional_notes ? (
            <span className="whitespace-pre-wrap">{additional_notes}</span>
          ) : (
            dash
          )}
        </FieldRow>
      </SectionCard>

      {/* Stage 2 ??Commit */}
      <SectionCard heading={labels.section_stage2}>
        <FieldRow label={labels.field_budget_band}>
          {resolvedBudgetBand || dash}
        </FieldRow>
        <FieldRow label={labels.field_target_delivery_at}>
          {target_delivery_at
            ? formatDateOnly(target_delivery_at)
            : dash}
        </FieldRow>
        <FieldRow label={labels.field_meeting_preferred_at}>
          {meeting_preferred_at
            ? formatDateTime(meeting_preferred_at, locale)
            : dash}
        </FieldRow>
        <FieldRow label={labels.field_interested_in_twin}>
          <span
            className={
              interested_in_twin === true
                ? "text-[#71D083] font-medium"
                : interested_in_twin === false
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60"
            }
          >
            {resolvedInterestedInTwin}
          </span>
        </FieldRow>
      </SectionCard>

      {/* Stage 3 ??Submit metadata */}
      <SectionCard heading={labels.section_stage3}>
        <FieldRow label={labels.field_submitted_at}>
          {submitted_at ? formatDateTime(submitted_at, locale) : dash}
        </FieldRow>
        <FieldRow label={labels.field_creator}>
          {creator_display_name || dash}
        </FieldRow>
      </SectionCard>
    </div>
  );
}

 succeeded in 434ms:
// =============================================================================
// Phase 5 Wave C C_3 ??泥⑤??먮즺 ?붿빟 (?꾪솴 tab).
//
// Per SPEC 짠"泥⑤??먮즺 ?붿빟":
//   - Count header: "湲고쉷??N媛?쨌 ?덊띁?곗뒪 M媛?
//   - Top-3 thumbnail strip (~64px height, 湲고쉷???곗꽑 ???덊띁?곗뒪 thumbnail)
//   - "?꾩껜 蹂닿린 ?? link ???tab=board
//
// Server component (no interaction). Thumbnail source priority:
//   1. briefing_documents.thumbnail_url (set by Wave B oembed proxy for
//      youtube/vimeo, sometimes by client uploads)
//   2. (uploaded brief PDFs/PPTs) ??no auto-thumbnail; fallback to a
//      file-icon tile. PDF first-page rendering is FU (kickoff 짠C_3
//      ON_FAIL_LOOP loop 2).
// =============================================================================

import Link from "next/link";
import Image from "next/image";
import { FileText, Link as LinkIcon } from "lucide-react";

export type AttachmentItem = {
  id: string;
  kind: "brief" | "reference";
  source_type: "upload" | "url";
  thumbnail_url: string | null;
  filename: string | null;
  url: string | null;
};

type Props = {
  briefCount: number;
  referenceCount: number;
  topThree: AttachmentItem[];
  labels: {
    section_heading: string;
    count_brief: (n: number) => string;
    count_reference: (n: number) => string;
    view_all: string;
    empty: string;
  };
};

export function AttachmentSummary({
  briefCount,
  referenceCount,
  topThree,
  labels,
}: Props) {
  const total = briefCount + referenceCount;
  return (
    <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
          {labels.section_heading}
        </h3>
        {total > 0 ? (
          <p className="text-sm text-foreground/80 keep-all">
            {labels.count_brief(briefCount)}
            <span className="text-muted-foreground/60 mx-2">쨌</span>
            {labels.count_reference(referenceCount)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/70 keep-all">
            {labels.empty}
          </p>
        )}
      </header>

      {topThree.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {topThree.map((item) => (
            <ThumbnailTile key={item.id} item={item} />
          ))}
        </div>
      )}

      <div className="pt-1">
        <Link
          href="?tab=board"
          scroll={false}
          className="text-xs font-medium text-foreground/70 underline-offset-4 hover:underline transition-colors keep-all"
        >
          {labels.view_all}
        </Link>
      </div>
    </section>
  );
}

function ThumbnailTile({ item }: { item: AttachmentItem }) {
  // 64px height, aspect ~16:9 ??~110px wide. shrink-0 so the strip
  // scrolls horizontally rather than wrapping.
  const isUpload = item.source_type === "upload";
  const fallbackLabel = isUpload
    ? (item.filename ?? "")
    : (item.url ?? "");

  if (item.thumbnail_url) {
    return (
      <div
        className="shrink-0 h-16 w-[110px] rounded-lg overflow-hidden relative bg-muted"
        title={fallbackLabel}
      >
        <Image
          src={item.thumbnail_url}
          alt=""
          fill
          sizes="110px"
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 h-16 w-[110px] rounded-lg bg-muted flex items-center justify-center"
      title={fallbackLabel}
    >
      {isUpload ? (
        <FileText className="w-5 h-5 text-muted-foreground" />
      ) : (
        <LinkIcon className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
  );
}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-step2-actions.ts' | ForEach-Object { if (("'$i -ge 300 -and $i -le 390) -or ($i -ge 390 -and $i -le 455)) { '"'{0,4}: {1}' -f "'$i, $_ }; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/[id]/cta-actions.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/components/project-detail/material-append-modal.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 380ms:
   1: "use server";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave C C_3 ??Detail page next-action server actions.
   5: //
   6: // Two thin RPC wrappers, both invoking transition_project_status:
   7: //   - approveDeliveredAction   (delivered -> approved)   client-only matrix
   8: //   - requestRevisionAction    (delivered -> in_revision) client-only matrix
   9: //
  10: // Both transitions are already in the Phase 3.0 truth table (client actor),
  11: // so this Wave introduces no migration. The Wave B creator-first patch
  12: // (20260504200001) means the workspace creator is resolved as 'client'
  13: // even when they hold workspace_admin, so own-project recall + approve +
  14: // revision flow goes through the client matrix consistently.
  15: //
  16: // requestRevisionAction's p_comment ??0 chars rule is enforced by the
  17: // RPC itself (RAISE EXCEPTION 'comment_required_min_10_chars' USING
  18: // ERRCODE='22023'); the action layer also pre-validates so the user sees
  19: // an inline error before round-tripping to Postgres.
  20: //
  21: // in_review ??[?먮즺 異붽??섍린] modal calls the existing
  22: // addBriefingDocumentAction from briefing-step2-actions.ts (Wave B sub_5).
  23: // We do NOT duplicate that action here ??the SPEC's "appendBriefingDocumentAction"
  24: // shorthand maps to that pre-existing surface. NOTE: the briefing_documents
  25: // INSERT RLS policy (Wave A sub_5 fix F2) currently requires parent
  26: // status='draft'. An in_review caller will hit RLS denial and surface a
  27: // 'forbidden' return; loosening RLS to allow ('draft','in_review') is
  28: // FU-Phase5-16 (registered in Wave C result doc).
  29: // =============================================================================
  30: 
  31: import { z } from "zod";
  32: import { revalidatePath } from "next/cache";
  33: import { createSupabaseServer } from "@/lib/supabase/server";
  34: import { resolveActiveWorkspace } from "@/lib/workspace/active";
  35: 
  36: // ---------------------------------------------------------------------------
  37: // Shared error mapping ??same shape as recallProjectAction.
  38: // ---------------------------------------------------------------------------
  39: 
  40: type RpcErrorCode = "forbidden" | "invalid_transition" | "comment_required" | "unknown";
  41: 
  42: function mapRpcError(rpcErr: { code?: string; message?: string }): RpcErrorCode {
  43:   const code = (rpcErr.code ?? "") as string;
  44:   if (code === "42501" || code === "P0002") return "forbidden";
  45:   if (code === "23514") return "invalid_transition";
  46:   if (code === "22023") return "comment_required";
  47:   return "unknown";
  48: }
  49: 
  50: // ===========================================================================
  51: // 1. approveDeliveredAction ??delivered -> approved
  52: // ===========================================================================
  53: 
  54: const approveInput = z.object({
  55:   projectId: z.string().uuid(),
  56: });
  57: 
  58: export type ApproveDeliveredInput = z.input<typeof approveInput>;
  59: 
  60: export type ApproveDeliveredResult =
  61:   | { ok: true }
  62:   | {
  63:       ok: false;
  64:       error: "validation" | "unauthenticated" | "no_workspace" | RpcErrorCode;
  65:       message?: string;
  66:     };
  67: 
  68: export async function approveDeliveredAction(
  69:   input: unknown,
  70: ): Promise<ApproveDeliveredResult> {
  71:   const parsed = approveInput.safeParse(input);
  72:   if (!parsed.success) {
  73:     return { ok: false, error: "validation", message: parsed.error.message };
  74:   }
  75: 
  76:   const supabase = await createSupabaseServer();
  77:   const {
  78:     data: { user },
  79:     error: authErr,
  80:   } = await supabase.auth.getUser();
  81:   if (authErr || !user) return { ok: false, error: "unauthenticated" };
  82: 
  83:   const active = await resolveActiveWorkspace(user.id);
  84:   if (!active) return { ok: false, error: "no_workspace" };
  85: 
  86:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
  87:   const sb = supabase as any;
  88:   const { data: historyId, error: rpcErr } = await sb.rpc(
  89:     "transition_project_status",
  90:     {
  91:       p_project_id: parsed.data.projectId,
  92:       p_to_status: "approved",
  93:     },
  94:   );
  95:   if (rpcErr) {
  96:     console.error("[approveDeliveredAction] RPC error:", rpcErr);
  97:     return { ok: false, error: mapRpcError(rpcErr), message: rpcErr.message };
  98:   }
  99:   if (!historyId) {
 100:     return { ok: false, error: "unknown", message: "RPC returned null" };
 101:   }
 102: 
 103:   revalidatePath("/[locale]/app/projects/[id]", "page");
 104:   revalidatePath("/[locale]/app/projects", "page");
 105:   return { ok: true };
 106: }
 107: 
 108: // ===========================================================================
 109: // 2. requestRevisionAction ??delivered -> in_revision (comment ??10 chars)
 110: // ===========================================================================
 111: 
 112: const revisionInput = z.object({
 113:   projectId: z.string().uuid(),
 114:   comment: z.string().trim().min(10).max(2000),
 115: });
 116: 
 117: export type RequestRevisionInput = z.input<typeof revisionInput>;
 118: 
 119: export type RequestRevisionResult =
 120:   | { ok: true }
 121:   | {
 122:       ok: false;
 123:       error: "validation" | "unauthenticated" | "no_workspace" | RpcErrorCode;
 124:       message?: string;
 125:     };
 126: 
 127: export async function requestRevisionAction(
 128:   input: unknown,
 129: ): Promise<RequestRevisionResult> {
 130:   const parsed = revisionInput.safeParse(input);
 131:   if (!parsed.success) {
 132:     // zod min(10) catches comment_required at the action layer, mirroring
 133:     // the RPC's 22023 raise so the UX surface is identical.
 134:     const isCommentLength = parsed.error.issues.some(
 135:       (i) => i.path[0] === "comment",
 136:     );
 137:     return {
 138:       ok: false,
 139:       error: isCommentLength ? "comment_required" : "validation",
 140:       message: parsed.error.message,
 141:     };
 142:   }
 143: 
 144:   const supabase = await createSupabaseServer();
 145:   const {
 146:     data: { user },
 147:     error: authErr,
 148:   } = await supabase.auth.getUser();
 149:   if (authErr || !user) return { ok: false, error: "unauthenticated" };
 150: 
 151:   const active = await resolveActiveWorkspace(user.id);
 152:   if (!active) return { ok: false, error: "no_workspace" };
 153: 
 154:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
 155:   const sb = supabase as any;
 156:   const { data: historyId, error: rpcErr } = await sb.rpc(
 157:     "transition_project_status",
 158:     {
 159:       p_project_id: parsed.data.projectId,
 160:       p_to_status: "in_revision",
 161:       p_comment: parsed.data.comment,
 162:     },
 163:   );
 164:   if (rpcErr) {
 165:     console.error("[requestRevisionAction] RPC error:", rpcErr);
 166:     return { ok: false, error: mapRpcError(rpcErr), message: rpcErr.message };
 167:   }
 168:   if (!historyId) {
 169:     return { ok: false, error: "unknown", message: "RPC returned null" };
 170:   }
 171: 
 172:   revalidatePath("/[locale]/app/projects/[id]", "page");
 173:   revalidatePath("/[locale]/app/projects", "page");
 174:   return { ok: true };
 175: }

 succeeded in 382ms:
 300:   if (data.source_type === "upload") {
 301:     const requiredPrefix = `briefing-docs/${auth.userId}/${data.kind}/`;
 302:     if (!data.storage_key.startsWith(requiredPrefix)) {
 303:       return {
 304:         ok: false,
 305:         error: "forbidden",
 306:         message: `storage_key prefix must be ${requiredPrefix}`,
 307:       };
 308:     }
 309:     if (data.storage_key.includes("..") || data.storage_key.startsWith("/")) {
 310:       return {
 311:         ok: false,
 312:         error: "forbidden",
 313:         message: "storage_key contains forbidden characters",
 314:       };
 315:     }
 316:   }
 317: 
 318:   // Reference-only category. KICKOFF v1.3 짠task_05 says category is
 319:   // meaningful only for kind='reference'; reject mismatched payloads
 320:   // explicitly so the UI doesn't silently swallow.
 321:   if (data.kind === "brief" && data.category) {
 322:     return {
 323:       ok: false,
 324:       error: "validation",
 325:       message: "category is meaningful only for kind='reference'",
 326:     };
 327:   }
 328: 
 329:   const insertPayload =
 330:     data.source_type === "upload"
 331:       ? {
 332:           project_id: data.projectId,
 333:           kind: data.kind,
 334:           source_type: "upload",
 335:           storage_key: data.storage_key,
 336:           filename: data.filename,
 337:           size_bytes: data.size_bytes,
 338:           mime_type: data.mime_type,
 339:           note: data.note ?? null,
 340:           category: data.category ?? null,
 341:           created_by: auth.userId,
 342:         }
 343:       : {
 344:           project_id: data.projectId,
 345:           kind: data.kind,
 346:           source_type: "url",
 347:           url: data.url,
 348:           provider: data.provider ?? "generic",
 349:           thumbnail_url: data.thumbnail_url ?? null,
 350:           oembed_html: data.oembed_html ?? null,
 351:           note: data.note ?? null,
 352:           category:
 353:             data.kind === "reference"
 354:               ? (data.category ?? "general")
 355:               : null,
 356:           created_by: auth.userId,
 357:         };
 358: 
 359:   const { data: inserted, error: insErr } = await auth.sb
 360:     .from("briefing_documents")
 361:     .insert(insertPayload)
 362:     .select(
 363:       "id, kind, source_type, storage_key, filename, size_bytes, mime_type, url, provider, thumbnail_url, oembed_html, note, category, created_at, created_by",
 364:     )
 365:     .single();
 366:   if (insErr || !inserted) {
 367:     console.error("[addBriefingDocumentAction] INSERT error:", insErr);
 368:     return {
 369:       ok: false,
 370:       error: "db",
 371:       message: insErr?.message ?? "insert failed",
 372:     };
 373:   }
 374: 
 375:   revalidatePath("/[locale]/app/projects/new", "page");
 376:   return { ok: true, document: inserted };
 377: }
 378: 
 379: // ===========================================================================
 380: // 3. removeBriefingDocumentAction
 381: // ===========================================================================
 382: 
 383: const removeInput = z.object({
 384:   documentId: z.string().uuid(),
 385: });
 386: 
 387: export type RemoveBriefingDocumentResult =
 388:   | { ok: true }
 389:   | {
 390:       ok: false;
 391:       error:
 392:         | "validation"
 393:         | "unauthenticated"
 394:         | "not_found"
 395:         | "forbidden"
 396:         | "db";
 397:       message?: string;
 398:     };
 399: 
 400: export async function removeBriefingDocumentAction(
 401:   input: unknown,
 402: ): Promise<RemoveBriefingDocumentResult> {
 403:   const parsed = removeInput.safeParse(input);
 404:   if (!parsed.success) {
 405:     return { ok: false, error: "validation", message: parsed.error.message };
 406:   }
 407: 
 408:   const supabase = await createSupabaseServer();
 409:   const {
 410:     data: { user },
 411:   } = await supabase.auth.getUser();
 412:   if (!user) return { ok: false, error: "unauthenticated" };
 413: 
 414:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
 415:   const sb = supabase as any;
 416: 
 417:   const { data: doc } = await sb
 418:     .from("briefing_documents")
 419:     .select("id, project_id, created_by")
 420:     .eq("id", parsed.data.documentId)
 421:     .maybeSingle();
 422:   if (!doc) return { ok: false, error: "not_found" };
 423:   if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };
 424: 
 425:   // RLS DELETE policy gates created_by + workspace member + status='draft'.
 426:   // The redundant eq filter on created_by is defense-in-depth.
 427:   const { error: delErr } = await sb
 428:     .from("briefing_documents")
 429:     .delete()
 430:     .eq("id", parsed.data.documentId)
 431:     .eq("created_by", user.id);
 432:   if (delErr) {
 433:     return { ok: false, error: "db", message: delErr.message };
 434:   }
 435: 
 436:   revalidatePath("/[locale]/app/projects/new", "page");
 437:   return { ok: true };
 438: }
 439: 
 440: // ===========================================================================
 441: // 4. updateBriefingDocumentNoteAction (note + category only)
 442: // ===========================================================================
 443: 
 444: const updateNoteInput = z.object({
 445:   documentId: z.string().uuid(),
 446:   note: z.string().trim().max(500).optional().nullable(),
 447:   category: z.enum(CATEGORY_VALUES).optional().nullable(),
 448: });
 449: 
 450: export type UpdateBriefingNoteResult =
 451:   | { ok: true }
 452:   | {
 453:       ok: false;
 454:       error:
 455:         | "validation"

 succeeded in 357ms:
   1: "use client";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave C C_3 ??Material append modal (in_review status).
   5: //
   6: // Wires the in_review [?먮즺 異붽??섍린] CTA to:
   7: //   1. R2 presigned PUT URL via Wave B getBriefingDocumentPutUrlAction
   8: //   2. Direct PUT upload from the browser
   9: //   3. INSERT into briefing_documents via Wave B addBriefingDocumentAction
  10: //
  11: // kind selector: brief | reference
  12: // source selector: upload | url
  13: //
  14: // Note (FU-Phase5-16): briefing_documents INSERT RLS (Wave A sub_5 F2)
  15: // currently requires parent project status='draft'. An in_review caller
  16: // hits 'forbidden' ??the modal surfaces a clear toast pointing at the
  17: // FU. The action wiring + form structure remain shipped per SPEC, so
  18: // when FU-Phase5-16 extends the policy (status IN ('draft','in_review')),
  19: // this modal works end-to-end without UI changes.
  20: // =============================================================================
  21: 
  22: import { useState, useTransition } from "react";
  23: import { Loader2, FileText, Link as LinkIcon, Upload } from "lucide-react";
  24: import { toast } from "sonner";
  25: import { cn } from "@/lib/utils";
  26: import { Button } from "@/components/ui/button";
  27: import { Input } from "@/components/ui/input";
  28: import { Label } from "@/components/ui/label";
  29: import {
  30:   AlertDialog,
  31:   AlertDialogAction,
  32:   AlertDialogCancel,
  33:   AlertDialogContent,
  34:   AlertDialogDescription,
  35:   AlertDialogFooter,
  36:   AlertDialogHeader,
  37:   AlertDialogTitle,
  38:   AlertDialogTrigger,
  39: } from "@/components/ui/alert-dialog";
  40: import {
  41:   getBriefingDocumentPutUrlAction,
  42:   addBriefingDocumentAction,
  43: } from "@/app/[locale]/app/projects/new/briefing-step2-actions";
  44: import type { MaterialAppendModalLabels } from "./next-action-cta";
  45: 
  46: const ACCEPT_MIME =
  47:   "application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp,image/gif";
  48: 
  49: export function MaterialAppendModal({
  50:   projectId,
  51:   labels,
  52: }: {
  53:   projectId: string;
  54:   labels: MaterialAppendModalLabels;
  55: }) {
  56:   const [open, setOpen] = useState(false);
  57:   const [kind, setKind] = useState<"brief" | "reference">("brief");
  58:   const [source, setSource] = useState<"upload" | "url">("upload");
  59:   const [file, setFile] = useState<File | null>(null);
  60:   const [url, setUrl] = useState("");
  61:   const [pending, startTransition] = useTransition();
  62: 
  63:   function reset() {
  64:     setKind("brief");
  65:     setSource("upload");
  66:     setFile(null);
  67:     setUrl("");
  68:   }
  69: 
  70:   const submitAllowed =
  71:     (source === "upload" && !!file) ||
  72:     (source === "url" && url.trim().length > 0);
  73: 
  74:   async function handleSubmit() {
  75:     startTransition(async () => {
  76:       try {
  77:         if (source === "upload" && file) {
  78:           const presign = await getBriefingDocumentPutUrlAction({
  79:             projectId,
  80:             kind,
  81:             contentType: file.type,
  82:             sizeBytes: file.size,
  83:           });
  84:           if (!presign.ok) {
  85:             const key =
  86:               presign.error === "forbidden"
  87:                 ? "errorRlsPending"
  88:                 : "errorUnknown";
  89:             toast.error(labels[key as "errorRlsPending" | "errorUnknown"]);
  90:             return;
  91:           }
  92:           const putRes = await fetch(presign.putUrl, {
  93:             method: "PUT",
  94:             body: file,
  95:             headers: { "Content-Type": file.type },
  96:           });
  97:           if (!putRes.ok) {
  98:             toast.error(labels.errorUnknown);
  99:             return;
 100:           }
 101:           const insert = await addBriefingDocumentAction({
 102:             projectId,
 103:             kind,
 104:             source_type: "upload",
 105:             storage_key: presign.storageKey,
 106:             filename: file.name,
 107:             size_bytes: file.size,
 108:             mime_type: file.type,
 109:           });
 110:           if (!insert.ok) {
 111:             const key =
 112:               insert.error === "forbidden"
 113:                 ? "errorRlsPending"
 114:                 : "errorUnknown";
 115:             toast.error(labels[key as "errorRlsPending" | "errorUnknown"]);
 116:             return;
 117:           }
 118:         } else if (source === "url" && url.trim()) {
 119:           const insert = await addBriefingDocumentAction({
 120:             projectId,
 121:             kind,
 122:             source_type: "url",
 123:             url: url.trim(),
 124:           });
 125:           if (!insert.ok) {
 126:             const key =
 127:               insert.error === "forbidden"
 128:                 ? "errorRlsPending"
 129:                 : "errorUnknown";
 130:             toast.error(labels[key as "errorRlsPending" | "errorUnknown"]);
 131:             return;
 132:           }
 133:         }
 134:         toast.success(labels.successToast);
 135:         setOpen(false);
 136:         reset();
 137:       } catch (e) {
 138:         console.error("[MaterialAppendModal] submit threw:", e);
 139:         toast.error(labels.errorUnknown);
 140:       }
 141:     });
 142:   }
 143: 
 144:   return (
 145:     <AlertDialog
 146:       open={open}
 147:       onOpenChange={(next) => {
 148:         if (!pending) setOpen(next);
 149:       }}
 150:     >
 151:       <AlertDialogTrigger asChild>
 152:         <Button
 153:           type="button"
 154:           variant="outline"
 155:           size="sm"
 156:           className="text-sm rounded-full px-5"
 157:         >
 158:           <Upload className="w-3.5 h-3.5 mr-1.5" />
 159:           {labels.trigger}
 160:         </Button>
 161:       </AlertDialogTrigger>
 162:       <AlertDialogContent>
 163:         <AlertDialogHeader>
 164:           <AlertDialogTitle>{labels.title}</AlertDialogTitle>
 165:           <AlertDialogDescription className="keep-all leading-relaxed">
 166:             {labels.description}
 167:           </AlertDialogDescription>
 168:         </AlertDialogHeader>
 169: 
 170:         <div className="flex flex-col gap-5 py-2">
 171:           {/* kind selector */}
 172:           <div className="flex flex-col gap-2">
 173:             <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
 174:               {labels.kindLabel}
 175:             </Label>
 176:             <div className="flex gap-2">
 177:               {(["brief", "reference"] as const).map((opt) => {
 178:                 const selected = kind === opt;
 179:                 return (
 180:                   <button
 181:                     key={opt}
 182:                     type="button"
 183:                     onClick={() => setKind(opt)}
 184:                     aria-pressed={selected}
 185:                     className={cn(
 186:                       "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
 187:                       selected
 188:                         ? "bg-foreground text-background"
 189:                         : "border border-border/60 hover:border-border",
 190:                     )}
 191:                   >
 192:                     {opt === "brief" ? labels.kindBrief : labels.kindReference}
 193:                   </button>
 194:                 );
 195:               })}
 196:             </div>
 197:           </div>
 198: 
 199:           {/* source selector */}
 200:           <div className="flex flex-col gap-2">
 201:             <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
 202:               {labels.sourceLabel}
 203:             </Label>
 204:             <div className="flex gap-2">
 205:               {(["upload", "url"] as const).map((opt) => {
 206:                 const selected = source === opt;
 207:                 const Icon = opt === "upload" ? FileText : LinkIcon;
 208:                 return (
 209:                   <button
 210:                     key={opt}
 211:                     type="button"
 212:                     onClick={() => setSource(opt)}
 213:                     aria-pressed={selected}
 214:                     className={cn(
 215:                       "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all flex items-center gap-1.5",
 216:                       selected
 217:                         ? "bg-foreground text-background"
 218:                         : "border border-border/60 hover:border-border",
 219:                     )}
 220:                   >
 221:                     <Icon className="w-3.5 h-3.5" />
 222:                     {opt === "upload" ? labels.sourceUpload : labels.sourceUrl}
 223:                   </button>
 224:                 );
 225:               })}
 226:             </div>
 227:           </div>
 228: 
 229:           {/* file or url input */}
 230:           {source === "upload" ? (
 231:             <div className="flex flex-col gap-2">
 232:               <Label
 233:                 htmlFor="material-append-file"
 234:                 className="text-xs font-medium text-foreground keep-all"
 235:               >
 236:                 {labels.fileLabel}
 237:               </Label>
 238:               <Input
 239:                 id="material-append-file"
 240:                 type="file"
 241:                 accept={ACCEPT_MIME}
 242:                 onChange={(e) => setFile(e.target.files?.[0] ?? null)}
 243:                 className="text-sm"
 244:               />
 245:             </div>
 246:           ) : (
 247:             <div className="flex flex-col gap-2">
 248:               <Label
 249:                 htmlFor="material-append-url"
 250:                 className="text-xs font-medium text-foreground keep-all"
 251:               >
 252:                 {labels.urlLabel}
 253:               </Label>
 254:               <Input
 255:                 id="material-append-url"
 256:                 type="url"
 257:                 placeholder={labels.urlPlaceholder}
 258:                 value={url}
 259:                 onChange={(e) => setUrl(e.target.value)}
 260:                 className="text-sm"
 261:               />
 262:             </div>
 263:           )}
 264:         </div>
 265: 
 266:         <AlertDialogFooter>
 267:           <AlertDialogCancel disabled={pending} onClick={reset}>
 268:             {labels.cancel}
 269:           </AlertDialogCancel>
 270:           <AlertDialogAction
 271:             onClick={(e) => {
 272:               e.preventDefault();
 273:               if (!submitAllowed || pending) return;
 274:               void handleSubmit();
 275:             }}
 276:             disabled={!submitAllowed || pending}
 277:             className="bg-[#71D083] text-black hover:bg-[#71D083]/90 focus-visible:ring-[#71D083]/40"
 278:           >
 279:             {pending ? (
 280:               <Loader2 className="w-4 h-4 animate-spin" />
 281:             ) : (
 282:               labels.submit
 283:             )}
 284:           </AlertDialogAction>
 285:         </AlertDialogFooter>
 286:       </AlertDialogContent>
 287:     </AlertDialog>
 288:   );
 289: }

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-step2-actions.ts' | ForEach-Object { if ("'$i -ge 1 -and $i -le 180) { '"'{0,4}: {1}' -f "'$i, $_ }; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "error_rls_pending|error_forbidden|error_unknown|material_append" messages/ko.json messages/en.json -C 2' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-step2-actions.ts' | ForEach-Object { if ("'$i -ge 180 -and $i -le 300) { '"'{0,4}: {1}' -f "'$i, $_ }; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 346ms:
messages/ko.json-1963-    },
messages/ko.json-1964-    "delivered_placeholder": "시안 보기 화면은 다음 phase 에서 들어옵니다. (Phase 6+)",
messages/ko.json:1965:    "material_append": {
messages/ko.json-1966-      "trigger": "자료 추가하기",
messages/ko.json-1967-      "title": "자료를 추가할까요?",
--
messages/ko.json-1979-      "submit": "추가하기",
messages/ko.json-1980-      "success_toast": "자료를 추가했어요.",
messages/ko.json:1981:      "error_forbidden": "권한이 없어요. 다시 로그인해주세요.",
messages/ko.json:1982:      "error_rls_pending": "검토 단계에서의 자료 추가 기능은 곧 열릴 예정이에요. (FU-Phase5-16)",
messages/ko.json:1983:      "error_unknown": "추가 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요."
messages/ko.json-1984-    }
messages/ko.json-1985-  },
--
messages/en.json-1898-    },
messages/en.json-1899-    "delivered_placeholder": "The draft viewing surface lands in a future phase. (Phase 6+)",
messages/en.json:1900:    "material_append": {
messages/en.json-1901-      "trigger": "Add materials",
messages/en.json-1902-      "title": "Add materials?",
--
messages/en.json-1914-      "submit": "Add",
messages/en.json-1915-      "success_toast": "Material added.",
messages/en.json:1916:      "error_forbidden": "Not authorized. Please sign in again.",
messages/en.json:1917:      "error_rls_pending": "Adding materials during review is coming soon. (FU-Phase5-16)",
messages/en.json:1918:      "error_unknown": "Failed to add. Please try again."
messages/en.json-1919-    }
messages/en.json-1920-  },

 succeeded in 376ms:
   1: "use server";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave B task_05 v3 ??Step 2 workspace server actions
   5: //
   6: // Split from briefing-actions.ts to keep file sizes managable. The Step 1
   7: // transition action (ensureBriefingDraftProject) stays in briefing-actions.ts;
   8: // every Step 2 read/write surface lives here.
   9: //
  10: // 5 actions:
  11: //   - getBriefingDocumentPutUrlAction(input)    ??R2 presigned PUT (upload only)
  12: //   - addBriefingDocumentAction(input)          ??INSERT briefing_documents
  13: //   - removeBriefingDocumentAction(input)       ??DELETE briefing_documents
  14: //   - updateBriefingDocumentNoteAction(input)   ??UPDATE note + category only
  15: //   - updateProjectMetadataAction(input)        ??autosave 6 creative-
  16: //                                                  direction fields (mood,
  17: //                                                  visual_ratio, channels,
  18: //                                                  target_audience). Step 3
  19: //                                                  commit fields live in
  20: //                                                  briefing-step3-actions.ts.
  21: //
  22: // Authorization model ??Phase 4.x sub_03f_5 F4 pattern reused, plus the
  23: // briefing_documents column-grant lockdown landed in Wave A sub_4 F3:
  24: //   1. createSupabaseServer (user-scoped)
  25: //   2. resolveActiveWorkspace for active workspace id
  26: //   3. explicit project ownership + workspace-membership re-verify before
  27: //      any write, even though RLS already gates row scope
  28: //   4. status='draft' guard on every Step 2 write (no metadata changes
  29: //      after the project transitions to in_review)
  30: //   5. storage_key prefix bound to auth.uid() in the presign AND re-validated
  31: //      on INSERT (sub_03f_5 F2 pattern)
  32: //   6. UPDATE only writes (note, category) per Wave A sub_4 F3 column grant ??//      anything else fails at the privilege layer regardless of payload
  33: // =============================================================================
  34: 
  35: import { z } from "zod";
  36: import { revalidatePath } from "next/cache";
  37: import { createSupabaseServer } from "@/lib/supabase/server";
  38: import { resolveActiveWorkspace } from "@/lib/workspace/active";
  39: import {
  40:   createBriefAssetPutUrl,
  41:   briefObjectPublicUrl,
  42: } from "@/lib/r2/client";
  43: 
  44: // ---------------------------------------------------------------------------
  45: // Shared constants + helpers
  46: // ---------------------------------------------------------------------------
  47: 
  48: const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  49:   "application/pdf",
  50:   "application/vnd.ms-powerpoint",
  51:   "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  52:   "image/jpeg",
  53:   "image/png",
  54:   "image/webp",
  55:   "image/gif",
  56: ]);
  57: 
  58: const EXT_FOR_CONTENT_TYPE: Record<string, string> = {
  59:   "application/pdf": "pdf",
  60:   "application/vnd.ms-powerpoint": "ppt",
  61:   "application/vnd.openxmlformats-officedocument.presentationml.presentation":
  62:     "pptx",
  63:   "image/jpeg": "jpg",
  64:   "image/png": "png",
  65:   "image/webp": "webp",
  66:   "image/gif": "gif",
  67: };
  68: 
  69: const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
  70: const URL_MAX_LEN = 2000;
  71: const KIND_VALUES = ["brief", "reference"] as const;
  72: const CATEGORY_VALUES = ["mood", "composition", "pacing", "general"] as const;
  73: 
  74: /**
  75:  * Verifies the caller is a current workspace_member of the project's
  76:  * workspace AND that the project is still in 'draft' state. Defense-
  77:  * in-depth ??RLS policies on briefing_documents + projects already
  78:  * gate row scope, but every Step 2 write re-runs this check at the
  79:  * action layer so a status transition or workspace removal between
  80:  * SELECT and INSERT/UPDATE doesn't slip through.
  81:  */
  82: async function assertProjectMutationAuth(projectId: string): Promise<
  83:   | {
  84:       ok: true;
  85:       userId: string;
  86:       workspaceId: string;
  87:       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  88:       sb: any;
  89:     }
  90:   | {
  91:       ok: false;
  92:       error:
  93:         | "unauthenticated"
  94:         | "no_workspace"
  95:         | "not_found"
  96:         | "forbidden";
  97:       message?: string;
  98:     }
  99: > {
 100:   const supabase = await createSupabaseServer();
 101:   const {
 102:     data: { user },
 103:     error: authErr,
 104:   } = await supabase.auth.getUser();
 105:   if (authErr || !user) return { ok: false, error: "unauthenticated" };
 106: 
 107:   const active = await resolveActiveWorkspace(user.id);
 108:   if (!active) return { ok: false, error: "no_workspace" };
 109: 
 110:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
 111:   const sb = supabase as any;
 112: 
 113:   const { data: project, error: selErr } = await sb
 114:     .from("projects")
 115:     .select("id, workspace_id, status, created_by")
 116:     .eq("id", projectId)
 117:     .maybeSingle();
 118:   if (selErr) {
 119:     console.error("[assertProjectMutationAuth] SELECT error:", selErr);
 120:     return { ok: false, error: "forbidden", message: selErr.message };
 121:   }
 122:   if (!project) return { ok: false, error: "not_found" };
 123:   if (project.workspace_id !== active.id) {
 124:     return { ok: false, error: "forbidden", message: "workspace mismatch" };
 125:   }
 126:   if (project.status !== "draft") {
 127:     return {
 128:       ok: false,
 129:       error: "forbidden",
 130:       message: "project is no longer draft",
 131:     };
 132:   }
 133: 
 134:   const { data: member } = await sb
 135:     .from("workspace_members")
 136:     .select("user_id")
 137:     .eq("workspace_id", project.workspace_id)
 138:     .eq("user_id", user.id)
 139:     .maybeSingle();
 140:   if (!member) {
 141:     return { ok: false, error: "forbidden", message: "not a workspace member" };
 142:   }
 143: 
 144:   return { ok: true, userId: user.id, workspaceId: project.workspace_id, sb };
 145: }
 146: 
 147: // ===========================================================================
 148: // 1. getBriefingDocumentPutUrlAction
 149: // ===========================================================================
 150: 
 151: const getPutUrlInput = z.object({
 152:   projectId: z.string().uuid(),
 153:   kind: z.enum(KIND_VALUES),
 154:   contentType: z.string().min(1).max(200),
 155:   sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
 156: });
 157: 
 158: export type GetPutUrlResult =
 159:   | { ok: true; putUrl: string; storageKey: string; publicUrl: string }
 160:   | {
 161:       ok: false;
 162:       error:
 163:         | "validation"
 164:         | "unauthenticated"
 165:         | "no_workspace"
 166:         | "not_found"
 167:         | "forbidden"
 168:         | "content_type_not_allowed"
 169:         | "presign_failed";
 170:       message?: string;
 171:     };
 172: 
 173: export async function getBriefingDocumentPutUrlAction(
 174:   input: unknown,
 175: ): Promise<GetPutUrlResult> {
 176:   const parsed = getPutUrlInput.safeParse(input);
 177:   if (!parsed.success) {
 178:     return { ok: false, error: "validation", message: parsed.error.message };
 179:   }
 180:   if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(parsed.data.contentType)) {

 succeeded in 400ms:
 180:   if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(parsed.data.contentType)) {
 181:     return { ok: false, error: "content_type_not_allowed" };
 182:   }
 183:   const auth = await assertProjectMutationAuth(parsed.data.projectId);
 184:   if (!auth.ok) return auth;
 185: 
 186:   const ext = EXT_FOR_CONTENT_TYPE[parsed.data.contentType] ?? "bin";
 187:   const uuid = crypto.randomUUID();
 188:   // sub_03f_5 F2 pattern reused ??caller-bound prefix + kind segment.
 189:   const storageKey = `briefing-docs/${auth.userId}/${parsed.data.kind}/${uuid}.${ext}`;
 190: 
 191:   try {
 192:     const putUrl = await createBriefAssetPutUrl(
 193:       storageKey,
 194:       parsed.data.contentType,
 195:       600,
 196:     );
 197:     return {
 198:       ok: true,
 199:       putUrl,
 200:       storageKey,
 201:       publicUrl: briefObjectPublicUrl(storageKey),
 202:     };
 203:   } catch (err) {
 204:     console.error("[getBriefingDocumentPutUrlAction] presign failed:", err);
 205:     return { ok: false, error: "presign_failed" };
 206:   }
 207: }
 208: 
 209: // ===========================================================================
 210: // 2. addBriefingDocumentAction
 211: // ===========================================================================
 212: 
 213: const addInput = z.discriminatedUnion("source_type", [
 214:   z.object({
 215:     projectId: z.string().uuid(),
 216:     kind: z.enum(KIND_VALUES),
 217:     source_type: z.literal("upload"),
 218:     storage_key: z.string().min(1).max(500),
 219:     filename: z.string().trim().min(1).max(200),
 220:     size_bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
 221:     mime_type: z.string().min(1).max(200),
 222:     note: z.string().trim().max(500).optional().nullable(),
 223:     category: z.enum(CATEGORY_VALUES).optional().nullable(),
 224:   }),
 225:   z.object({
 226:     projectId: z.string().uuid(),
 227:     kind: z.enum(KIND_VALUES),
 228:     source_type: z.literal("url"),
 229:     url: z
 230:       .string()
 231:       .min(1)
 232:       .max(URL_MAX_LEN)
 233:       .refine(
 234:         (u) => {
 235:           try {
 236:             const p = new URL(u);
 237:             return p.protocol === "http:" || p.protocol === "https:";
 238:           } catch {
 239:             return false;
 240:           }
 241:         },
 242:         { message: "url must be http:// or https://" },
 243:       ),
 244:     provider: z
 245:       .enum(["youtube", "vimeo", "instagram", "generic"])
 246:       .optional()
 247:       .nullable(),
 248:     thumbnail_url: z.string().max(URL_MAX_LEN).optional().nullable(),
 249:     oembed_html: z.string().max(20_000).optional().nullable(),
 250:     note: z.string().trim().max(500).optional().nullable(),
 251:     category: z.enum(CATEGORY_VALUES).optional().nullable(),
 252:   }),
 253: ]);
 254: 
 255: export type AddBriefingDocumentResult =
 256:   | {
 257:       ok: true;
 258:       document: {
 259:         id: string;
 260:         kind: "brief" | "reference";
 261:         source_type: "upload" | "url";
 262:         storage_key: string | null;
 263:         filename: string | null;
 264:         size_bytes: number | null;
 265:         mime_type: string | null;
 266:         url: string | null;
 267:         provider: string | null;
 268:         thumbnail_url: string | null;
 269:         oembed_html: string | null;
 270:         note: string | null;
 271:         category: string | null;
 272:         created_at: string;
 273:         created_by: string;
 274:       };
 275:     }
 276:   | {
 277:       ok: false;
 278:       error:
 279:         | "validation"
 280:         | "unauthenticated"
 281:         | "no_workspace"
 282:         | "not_found"
 283:         | "forbidden"
 284:         | "db";
 285:       message?: string;
 286:     };
 287: 
 288: export async function addBriefingDocumentAction(
 289:   input: unknown,
 290: ): Promise<AddBriefingDocumentResult> {
 291:   const parsed = addInput.safeParse(input);
 292:   if (!parsed.success) {
 293:     return { ok: false, error: "validation", message: parsed.error.message };
 294:   }
 295:   const data = parsed.data;
 296:   const auth = await assertProjectMutationAuth(data.projectId);
 297:   if (!auth.ok) return auth;
 298: 
 299:   // sub_03f_5 F2 ??re-validate caller-bound prefix on the storage_key.
 300:   if (data.source_type === "upload") {

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "node -e \"JSON.parse(require('fs').readFileSync('messages/ko.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('json ok')\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'pnpm exec eslint src/app/[locale]/app/projects/[id]/cta-actions.ts src/app/[locale]/app/projects/[id]/page.tsx src/components/project-detail/status-timeline.tsx src/components/project-detail/status-tab.tsx src/components/project-detail/brief-tab.tsx src/components/project-detail/brief-summary-card.tsx src/components/project-detail/attachment-summary.tsx src/components/project-detail/next-action-cta.tsx src/components/project-detail/material-append-modal.tsx src/components/project-detail/cancelled-archived-banner.tsx src/components/project-detail/empty-state-tab.tsx src/components/project-detail/tabs.tsx' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 478ms:
json ok

 succeeded in 3674ms:
codex
The targeted TypeScript and ESLint checks pass for the scoped files, and both locale JSON files parse. I’m doing one final pass for behavior-level regressions now: status/action reachability, query scoping, and translation key collisions.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/project-detail/cancelled-archived-banner.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/project-detail/empty-state-tab.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "node - <<'NODE'
const fs=require('fs');
for (const f of ['messages/ko.json','messages/en.json']) {
 const j=JSON.parse(fs.readFileSync(f,'utf8'));
 const pd=j.project_detail, ps=j.projects;
 const keys=['tab','banner','status','summary_card','attachments','comments_thread','delivered_placeholder','material_append','brief_tab','empty_state'];
 console.log(f, keys.map(k=>"'`${k}:${pd && Object.prototype.hasOwnProperty.call(pd,k)}`).join('"' '), 'projects.status.label:', "'!!ps?.status?.label);
}
NODE' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "approveDeliveredAction|requestRevisionAction|cta-actions" src/components src/app -S' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 472ms:
// Phase 5 Wave C C_5 ??Cancelled / Archived banner (full styling).
//
// Per SPEC 짠"Cancelled / Archived banner":
//   - variant "cancelled": text + inline [???섎ː ?쒖옉] link ??/{locale}/app/projects/new
//   - variant "archived": text only, no link
//   - Sage subtle accent: 1px sage left-edge bar (border-l-2 style).
//   - Zero shadow. Does NOT block tab clicks (no fixed positioning).
//   - Renders above L1 breadcrumb, below the page wrapper padding.
//   - All tabs remain navigable for read-only inspection.
//
// Design compliance (yagi-design-system v1.0):
//   - Sage #71D083 at ~30% opacity via border-l-[3px] solid sage
//   - bg-sage-soft (rgba(113,208,131,0.18) light) for subtle tint
//   - No shadow. rounded-xl (softer than card-24 since it's a notice strip)
//   - text-sm, muted foreground, keep-all for Korean

import Link from "next/link";

type Props = {
  variant: "cancelled" | "archived";
  locale: string;
  labels: {
    cancelled: string;
    archived: string;
    cancelledLinkText?: string;
  };
};

export function CancelledArchivedBanner({ variant, locale, labels }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex items-start gap-0 overflow-hidden rounded-xl border border-border/40"
      style={{ borderLeft: "3px solid rgba(113,208,131,0.35)" }}
    >
      {/* Sage soft tint panel */}
      <div className="w-full px-5 py-3.5 bg-sage-soft">
        {variant === "cancelled" ? (
          <p className="text-sm text-muted-foreground keep-all">
            {labels.cancelled}{" "}
            <Link
              href={`/${locale}/app/projects/new`}
              className="inline font-medium text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity duration-[400ms]"
            >
              {labels.cancelledLinkText ?? "???섎ː ?쒖옉"}
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground keep-all">
            {labels.archived}
          </p>
        )}
      </div>
    </div>
  );
}

 succeeded in 476ms:
// Phase 5 Wave C C_5 ??EmptyStateTab: replaces PlaceholderTab for the
// 肄붾찘??and 寃곌낵臾?tabs. Rendered as a styled coming-soon card with a
// sage-muted Lucide icon, heading, and sub-text.
//
// Design compliance (yagi-design-system v1.0):
//   - White bg, zero shadow
//   - rounded-3xl (24px) border border-border/40
//   - Sage icon: #71D083 at low opacity (muted foreground ??not a fill)
//   - No warm tones, no extra accent colors
//   - keep-all on Korean text

import { type LucideIcon } from "lucide-react";

type Props = {
  heading: string;
  subtext: string;
  Icon?: LucideIcon;
};

export function EmptyStateTab({ heading, subtext, Icon }: Props) {
  return (
    <div
      className="border border-border/40 rounded-3xl p-12 min-h-[280px] flex flex-col items-center justify-center text-center"
      role="region"
      aria-label={heading}
    >
      {Icon && (
        <Icon
          className="mb-5 text-muted-foreground/40"
          size={32}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      )}
      <h3 className="text-base font-medium text-foreground keep-all">
        {heading}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground keep-all max-w-sm leading-relaxed">
        {subtext}
      </p>
    </div>
  );
}

2026-05-04T13:59:14.000581Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
At line:2 char:9
+ node - <<'NODE'
+         ~
Missing file specification after redirection operator.
At line:2 char:8
+ node - <<'NODE'
+        ~
The '<' operator is reserved for future use.
At line:2 char:9
+ node - <<'NODE'
+         ~
The '<' operator is reserved for future use.
At line:5 char:38
+  const j=JSON.parse(fs.readFileSync(f,'utf8'));
+                                      ~
Missing argument in parameter list.
At line:8 char:15
+  console.log(f, keys.map(k=>`${k}:${pd && Object.prototype.hasOwnProp ...
+               ~
Missing argument in parameter list.
At line:8 char:146
+ ... l(pd,k)}`).join(' '), 'projects.status.label:', !!ps?.status?.label);
+                                                                         ~
Missing closing ')' in expression.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : MissingFileSpecification
 

 exited 1 in 482ms:
At line:2 char:9
+ node - <<'NODE'
+         ~
Missing file specification after redirection operator.
At line:2 char:8
+ node - <<'NODE'
+        ~
The '<' operator is reserved for future use.
At line:2 char:9
+ node - <<'NODE'
+         ~
The '<' operator is reserved for future use.
At line:5 char:38
+  const j=JSON.parse(fs.readFileSync(f,'utf8'));
+                                      ~
Missing argument in parameter list.
At line:8 char:15
+  console.log(f, keys.map(k=>`${k}:${pd && Object.prototype.hasOwnProp ...
+               ~
Missing argument in parameter list.
At line:8 char:146
+ ... l(pd,k)}`).join(' '), 'projects.status.label:', !!ps?.status?.label);
+                                                                         ~
Missing closing ')' in expression.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : MissingFileSpecification
 

 succeeded in 542ms:
src/components\project-detail\next-action-cta.tsx:17://   - approveDeliveredAction / requestRevisionAction live in
src/components\project-detail\next-action-cta.tsx:18://     src/app/[locale]/app/projects/[id]/cta-actions.ts but are wired
src/components\projects\action-modals\revision-request-modal.tsx:9:import { requestRevisionAction } from '@/components/projects/project-actions';
src/components\projects\action-modals\revision-request-modal.tsx:63:        await requestRevisionAction(projectId, trimmed);
src/components\projects\project-actions.ts:46:export async function requestRevisionAction(id: string, comment: string) {
src/app\[locale]\app\projects\[id]\cta-actions.ts:7://   - approveDeliveredAction   (delivered -> approved)   client-only matrix
src/app\[locale]\app\projects\[id]\cta-actions.ts:8://   - requestRevisionAction    (delivered -> in_revision) client-only matrix
src/app\[locale]\app\projects\[id]\cta-actions.ts:16:// requestRevisionAction's p_comment ≥10 chars rule is enforced by the
src/app\[locale]\app\projects\[id]\cta-actions.ts:51:// 1. approveDeliveredAction — delivered -> approved
src/app\[locale]\app\projects\[id]\cta-actions.ts:68:export async function approveDeliveredAction(
src/app\[locale]\app\projects\[id]\cta-actions.ts:96:    console.error("[approveDeliveredAction] RPC error:", rpcErr);
src/app\[locale]\app\projects\[id]\cta-actions.ts:109:// 2. requestRevisionAction — delivered -> in_revision (comment ≥ 10 chars)
src/app\[locale]\app\projects\[id]\cta-actions.ts:127:export async function requestRevisionAction(
src/app\[locale]\app\projects\[id]\cta-actions.ts:165:    console.error("[requestRevisionAction] RPC error:", rpcErr);

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "node -e \"const fs=require('fs'); for (const f of ['messages/ko.json','messages/en.json']) { const j=JSON.parse(fs.readFileSync(f,'utf8')); const pd=j.project_detail, ps=j.projects; const keys=['tab','banner','status','summary_card','attachments','comments_thread','delivered_placeholder','material_append','brief_tab','empty_state']; console.log(f, keys.map(k=>k+':'+Object.prototype.hasOwnProperty.call(pd,k)).join(' '), 'projects.status.label:'+"'!!(ps&&ps.status&&ps.status.label)); }"' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 355ms:
messages/ko.json tab:true banner:true status:true summary_card:true attachments:true comments_thread:true delivered_placeholder:true material_append:true brief_tab:true empty_state:true projects.status.label:true
messages/en.json tab:true banner:true status:true summary_card:true attachments:true comments_thread:true delivered_placeholder:true material_append:true brief_tab:true empty_state:true projects.status.label:true

codex
The action-level guards line up with the stated assumptions: the new delivered actions defer to the RPC and only revalidate after success; the in-review material modal reaches the existing draft-only Step 2 guards and maps the resulting forbidden response to the pending-RLS toast. I’m running the broader build check now to catch any route/runtime issue that typecheck and scoped lint might miss.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'pnpm build' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 33411ms:

> yagi-workshop@0.1.0 build C:\Users\yout4\yagi-studio\yagi-workshop
> next build

Starting content-collections content-collections.ts
build started ...
... finished build of 1 collection and 3 documents in 10ms
   ▲ Next.js 15.5.0
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 8.6s
   Linting and checking validity of types ...

./src/app/[locale]/app/projects/new/new-project-wizard.tsx
288:11  Warning: '_brands' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/app/[locale]/app/projects/[id]/board-actions.ts
31:3  Warning: 'briefObjectPublicUrl' is defined but never used.  @typescript-eslint/no-unused-vars

./src/components/brief-board/editor.tsx
555:33  Warning: '_e' is defined but never used.  @typescript-eslint/no-unused-vars
566:28  Warning: '_e' is defined but never used.  @typescript-eslint/no-unused-vars

./src/components/project-board/attachments-section.tsx
74:10  Warning: 'detectProvider' is defined but never used.  @typescript-eslint/no-unused-vars

./src/components/project-board/brief-board-shell-client.tsx
71:9  Warning: 'canvasReadOnly' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/components/project-board/lock-button.tsx
102:39  Warning: '_boardId' is defined but never used.  @typescript-eslint/no-unused-vars

./src/components/project-board/project-board.tsx
157:9  Warning: '_mode' is defined but never used.  @typescript-eslint/no-unused-vars

./src/components/project-board/shapes/image-shape.ts
38:1  Warning: Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any').

./src/components/project-board/shapes/pdf-shape.ts
83:1  Warning: Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any').

./src/components/project-board/shapes/url-card-shape.ts
36:1  Warning: Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any').

./src/components/settings/avatar-upload.tsx
139:9  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
178:13  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/emails/projects/project_delivered.tsx
149:3  Warning: 'projectName' is defined but never used.  @typescript-eslint/no-unused-vars

./src/emails/projects/project_in_progress.tsx
103:3  Warning: 'projectName' is defined but never used.  @typescript-eslint/no-unused-vars

./src/emails/projects/project_revision_requested.tsx
117:3  Warning: 'projectName' is defined but never used.  @typescript-eslint/no-unused-vars

./src/emails/projects/project_submitted_admin.tsx
8:3  Warning: 'Link' is defined but never used.  @typescript-eslint/no-unused-vars

./src/emails/projects/project_submitted_client.tsx
94:3  Warning: 'projectName' is defined but never used.  @typescript-eslint/no-unused-vars

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
   Collecting page data ...
   Generating static pages (0/15) ...
   Generating static pages (3/15) 
   Generating static pages (7/15) 
   Generating static pages (11/15) 
 ✓ Generating static pages (15/15)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                            Size  First Load JS
┌ ○ /_not-found                                        1 kB         103 kB
├ ƒ /[locale]                                       1.88 kB         120 kB
├ ƒ /[locale]/app                                     172 B         102 kB
├ ƒ /[locale]/app/admin                             2.85 kB         129 kB
├ ƒ /[locale]/app/admin/challenges                   1.9 kB         120 kB
├ ƒ /[locale]/app/admin/challenges/[slug]/announce  8.64 kB         174 kB
├ ƒ /[locale]/app/admin/challenges/[slug]/edit      4.86 kB         150 kB
├ ƒ /[locale]/app/admin/challenges/[slug]/judge     3.71 kB         124 kB
├ ƒ /[locale]/app/admin/challenges/new              6.27 kB         175 kB
├ ƒ /[locale]/app/admin/commissions                 1.88 kB         120 kB
├ ƒ /[locale]/app/admin/commissions/[id]            5.59 kB         141 kB
├ ƒ /[locale]/app/admin/invoices                     1.9 kB         120 kB
├ ƒ /[locale]/app/admin/projects                    5.05 kB         131 kB
├ ƒ /[locale]/app/admin/projects/[id]               3.23 kB         121 kB
├ ƒ /[locale]/app/admin/support                      5.5 kB         203 kB
├ ƒ /[locale]/app/admin/trash                        1.9 kB         120 kB
├ ƒ /[locale]/app/commission                        1.88 kB         120 kB
├ ƒ /[locale]/app/commission/[id]                   2.41 kB         120 kB
├ ƒ /[locale]/app/commission/new                      172 B         102 kB
├ ƒ /[locale]/app/dashboard                         1.86 kB         120 kB
├ ƒ /[locale]/app/invoices                           1.9 kB         120 kB
├ ƒ /[locale]/app/invoices/[id]                     11.4 kB         216 kB
├ ƒ /[locale]/app/invoices/[id]/print               4.46 kB         131 kB
├ ƒ /[locale]/app/invoices/new                      5.89 kB         184 kB
├ ƒ /[locale]/app/meetings                          2.41 kB         120 kB
├ ƒ /[locale]/app/meetings/[id]                     6.71 kB         178 kB
├ ƒ /[locale]/app/meetings/new                      7.84 kB         220 kB
├ ƒ /[locale]/app/preprod                            1.9 kB         120 kB
├ ƒ /[locale]/app/preprod/[id]                      15.2 kB         264 kB
├ ƒ /[locale]/app/preprod/new                       5.54 kB         184 kB
├ ƒ /[locale]/app/projects                          47.2 kB         223 kB
├ ƒ /[locale]/app/projects/[id]                      482 kB         676 kB
├ ƒ /[locale]/app/projects/new                      13.2 kB         288 kB
├ ƒ /[locale]/app/settings                          7.81 kB         248 kB
├ ƒ /[locale]/app/settings/notifications            5.24 kB         187 kB
├ ƒ /[locale]/app/showcases                         4.19 kB         155 kB
├ ƒ /[locale]/app/showcases/[id]                    14.2 kB         180 kB
├ ƒ /[locale]/app/team                                172 B         102 kB
├ ƒ /[locale]/app/team/[slug]                       16.7 kB         230 kB
├ ƒ /[locale]/auth/expired                          5.06 kB         246 kB
├ ƒ /[locale]/auth/verify                           5.54 kB         203 kB
├ ƒ /[locale]/commission                              172 B         102 kB
├ ƒ /[locale]/forgot-password                       4.58 kB         245 kB
├ ƒ /[locale]/journal                                1.9 kB         120 kB
├ ● /[locale]/journal/[slug]                         1.9 kB         120 kB
├   ├ /en/journal/welcome-to-yagi-workshop
├   └ /ko/journal/welcome-to-yagi-workshop
├ ● /[locale]/journal/guide/[slug]                   1.9 kB         120 kB
├   └ /ko/journal/guide/challenge-creation
├ ƒ /[locale]/onboarding                             1.9 kB         120 kB
├ ƒ /[locale]/onboarding/brand                       2.3 kB         177 kB
├ ƒ /[locale]/onboarding/invite                     3.62 kB         136 kB
├ ƒ /[locale]/onboarding/profile                     1.9 kB         120 kB
├ ƒ /[locale]/onboarding/workspace                  2.24 kB         177 kB
├ ƒ /[locale]/reset-password                        4.58 kB         245 kB
├ ƒ /[locale]/signin                                4.85 kB         245 kB
├ ƒ /[locale]/signup                                5.28 kB         246 kB
├ ƒ /[locale]/work                                   1.9 kB         120 kB
├ ƒ /api/health/google                                172 B         102 kB
├ ƒ /api/oembed                                       172 B         102 kB
├ ƒ /api/og                                           172 B         102 kB
├ ƒ /api/share/[token]/approve                        172 B         102 kB
├ ƒ /api/share/[token]/comments                     1.92 kB         120 kB
├ ƒ /api/share/[token]/reactions                    1.92 kB         120 kB
├ ƒ /api/showcases/[id]/og                            172 B         102 kB
├ ƒ /api/unfurl                                       172 B         102 kB
├ ƒ /auth/callback                                    172 B         102 kB
├ ƒ /auth/confirm                                     172 B         102 kB
├ ƒ /challenges                                     1.87 kB         125 kB
├ ƒ /challenges/[slug]                              3.61 kB         132 kB
├ ƒ /challenges/[slug]/gallery                      2.77 kB         197 kB
├ ƒ /challenges/[slug]/submit                       7.94 kB         179 kB
├ ○ /icon.png                                           0 B            0 B
├ ƒ /journal/feed.xml                                 172 B         102 kB
├ ƒ /s/[token]                                      8.35 kB         144 kB
├ ƒ /showcase/[slug]                                4.57 kB         140 kB
├ ○ /sitemap.xml                                      172 B         102 kB
└ ƒ /unsubscribe/[token]                            1.88 kB         120 kB
+ First Load JS shared by all                        102 kB
  ├ chunks/4b89ee39-c6eec9851d0b5e5c.js             54.2 kB
  ├ chunks/8979-808eeae9fc1ffea5.js                   46 kB
  └ other shared chunks (total)                     2.08 kB


ƒ Middleware                                         170 kB

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand

[CC DEPRECATED]: The configuration property "collections" is deprecated.
Please use "content" instead.
For more information, see:
https://content-collections.dev/docs/deprecations/config-collections-property
[CC DEPRECATED]: The implicit addition of a content property to schemas is deprecated.
Please add an explicit content property to your schema.
For more information, see:
https://content-collections.dev/docs/deprecations/implicit-content-property

[1m[33mwarn[39m[22m - The class `duration-[400ms]` is ambiguous and matches multiple utilities.
[1m[33mwarn[39m[22m - If this is content and not a class, replace it with `duration-&lsqb;400ms&rsqb;` to silence this warning.
 ⚠ Using edge runtime on a page currently disables static generation for that page

codex
## VERDICT: CLEAN

VERDICT: CLEAN — Wave C ready for ff-merge to main.

No new HIGH/MED findings in the scoped files.

Verified:
- `pnpm exec tsc --noEmit` passes.
- Scoped ESLint pass for Wave C files passes.
- `pnpm build` passes, with only pre-existing/unrelated warnings.
- `messages/ko.json` and `messages/en.json` parse and include the new namespaces.
- Risk-surface checks for RPC action mapping, success-only revalidation, RLS-scoped reads, tab parsing, owner-only CTA gating, and in-review material append error surfacing look clean.

Run log summary: Wave C K-05 LOOP 1 review clean; no blocking findings, build green, ready for ff-merge.
tokens used
63,472
## VERDICT: CLEAN

VERDICT: CLEAN — Wave C ready for ff-merge to main.

No new HIGH/MED findings in the scoped files.

Verified:
- `pnpm exec tsc --noEmit` passes.
- Scoped ESLint pass for Wave C files passes.
- `pnpm build` passes, with only pre-existing/unrelated warnings.
- `messages/ko.json` and `messages/en.json` parse and include the new namespaces.
- Risk-surface checks for RPC action mapping, success-only revalidation, RLS-scoped reads, tab parsing, owner-only CTA gating, and in-review material append error surfacing look clean.

Run log summary: Wave C K-05 LOOP 1 review clean; no blocking findings, build green, ready for ff-merge.

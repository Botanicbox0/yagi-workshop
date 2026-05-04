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
session id: 019df277-b33c-7252-90a4-989b1925cdef
--------
user
Phase 5 Wave B task_06 v3 + task_05 v3 hotfix-5 K-05 Tier 2 medium LOOP 1.

This pass covers (a) Step 2 slim-down (6 fields removed from
updateProjectMetadataAction + sidebar UI) and (b) Step 3 net-new server
actions and UI for commit + atomic submit.

## Files in scope (6 total)

NEW:
- src/app/[locale]/app/projects/new/briefing-step3-actions.ts
  • updateProjectCommitAction (autosave 5 fields)
  • submitBriefingAction (atomic 'draft' → 'in_review' status flip)
  • assertProjectMutationAuth helper (duplicated from briefing-step2-actions.ts to avoid leaking it as a server action export)
- src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx
  • Step 3 UI: summary card + commit form + final notes + sticky CTA + AlertDialog confirm
  • 5s debounced autosave with single-flight queue (inFlightRef + pendingRef pattern from sub_5)
  • Submit handler flushes pending autosave before status flip

MODIFIED:
- src/app/[locale]/app/projects/new/briefing-step2-actions.ts
  • metadataInput zod: 12 → 6 fields (removed has_plan, additional_notes, budget_band, target_delivery_at, meeting_preferred_at, interested_in_twin)
  • payload field list: 12 → 6
- src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx
  • SidebarFormData type: 12 → 6 fields
  • runSave payload: 12 → 6
  • JSX: removed has_plan/additional_notes/budget/delivery/meeting/twin blocks
  • imports: dropped RadioGroup/RadioGroupItem
- src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx
  • ProjectMetadata type / EMPTY_SIDEBAR / sidebarInitial seed: 12 → 6 fields
  • SELECT projection trimmed
- src/app/[locale]/app/projects/new/briefing-canvas.tsx
  • Stage 3 mount: StagePlaceholder → BriefingCanvasStep3 (with projectId / onBack / onJumpToStep)

## Out of scope (do NOT review)

- briefing-actions.ts (Step 1 — already CLEAN at task_04 v3)
- briefing-canvas-step-1.tsx (already CLEAN)
- briefing-canvas-step-2-brief.tsx + briefing-canvas-step-2-reference.tsx (no changes)
- /api/oembed/route.ts (already CLEAN at sub_5)
- i18n keys (data-only)
- All migrations (no new migration this pass)

## Builder grep audit (do NOT redo — verify)

- assertProjectMutationAuth in briefing-step3-actions.ts adds a `created_by !== user.id` rejection that the briefing-step2-actions.ts copy lacks. The Step 2 helper relies on the policies + the project SELECT's RLS scope to enforce creator-bound writes. The Step 3 copy makes the creator check explicit because submitBriefingAction's blast radius is project-wide (status flip), not row-narrow.
- updateProjectCommitAction's UPDATE includes `.eq('status', 'draft')` for TOCTOU defense even though assertProjectMutationAuth already verified status. submitBriefingAction's UPDATE includes `.eq('created_by', auth.userId).eq('status', 'draft')` with `.select('id').maybeSingle()` so 0-row results are distinguishable from a successful flip and surface as wrong_status.
- Phase 5 Wave A sub_5 RLS migration (20260504180000) added `p.status='draft'` to briefing_documents INSERT/UPDATE policies. After submitBriefingAction flips status, every subsequent commit-write from the user-scoped client returns 0 rows at the RLS layer regardless of action-layer guards.
- projects RLS UPDATE policy (verified via SQL on 2026-05-03): `((auth.uid() = created_by) AND (status = 'draft') AND (deleted_at IS NULL)) OR is_ws_admin OR is_yagi_admin`. The status='draft' branch denies any creator-bound UPDATE after status flips to 'in_review'.

## Six focus areas

1. **submitBriefingAction atomicity.** The action does
   `assertProjectMutationAuth → UPDATE ... WHERE id=projectId AND created_by=auth.uid() AND status='draft' RETURNING id`.
   Verify:
   - Concurrent double-click from the same tab (button has `disabled={submitting}` via useTransition) cannot fire two parallel UPDATEs that both succeed.
   - Cross-tab double-submit (two tabs both still showing the draft) — the second UPDATE returns 0 rows because status is no longer 'draft' on re-evaluation. Verify the action layer correctly maps 0-row to `wrong_status` (not silent success).
   - submitted_at is set in the same UPDATE statement as the status flip, so they cannot diverge.
   - revalidatePath('/[locale]/app/projects', 'page') is called only on success path. Verify the locale param string `/[locale]/...` is the correct pattern for next/cache (Next.js 15 App Router) — confirm by grep against an established pattern in the repo.

2. **updateProjectCommitAction status guard chain.**
   - assertProjectMutationAuth checks `project.status !== 'draft'` and rejects.
   - The UPDATE adds `.eq('status', 'draft')` redundantly.
   - RLS projects_update policy enforces `(created_by AND status='draft') OR ws_admin OR yagi_admin`.
   Verify all three layers agree on the same invariant; verify there is no path where one layer accepts and another rejects (e.g., a yagi_admin caller using the regular updateProjectCommitAction — the action's `created_by !== user.id` rejection in assertProjectMutationAuth would block yagi_admin from using this surface, which is the intended behavior since admin support paths use service-role tooling).

3. **Autosave / submit race in briefing-canvas-step-3.tsx handleSubmit.**
   The handler does:
   ```
   clearTimeout(debounceRef)
   if (form !== lastCommitted) await runSave(form)
   while (inFlightRef.current) await sleep(50)
   await submitBriefingAction({ projectId })
   ```
   Verify:
   - A keystroke that fires AFTER handleSubmit reads `form` snapshot but BEFORE the await runSave completes — the post-handler keystroke's debounced runSave will queue at pendingRef, drain after the inFlightRef polling exits, but submitBriefingAction has already started or finished. If submit succeeds first, the post-keystroke commit-write runs against status='in_review' and silently fails (RLS + .eq('status','draft')). The user's last keystroke is lost. Is this acceptable? (Recommend: disabling form inputs during submitting=true, or accept the loss with the rationale that submit ends Step 3.)
   - The useTransition `submitting` state guards the button itself (`disabled={submitting}`). Verify it is the same boolean that gates the AlertDialog cancel/proceed sequence.
   - The polling loop `while (inFlightRef.current) sleep(50)` has no upper bound. If runSave hangs (network error → action returns error but inFlightRef is still true via the finally block? — verify that the finally block always sets inFlightRef.current = false even on action-error returns; the runSave try/finally pattern should handle this).

4. **assertProjectMutationAuth duplication risk.** The Step 3 copy and Step 2 copy diverge by one line (Step 3 adds `created_by !== user.id` rejection). Verify that future drift is documented, OR that the Step 2 copy is actually safe without the explicit creator check (RLS + .eq('id', projectId) on subsequent UPDATEs implicitly scope to creator via RLS). Recommend: extract to shared internal helper file (no 'use server'). NOT a blocker if the divergence is captured in a comment.

5. **AlertDialog re-entrancy.** The dialog's "확인" button onClick calls handleSubmit, which calls setConfirmOpen(false) before startSubmit. Verify:
   - The dialog cannot be re-opened during submitting=true.
   - Cancel during in-flight submit is impossible because Cancel is inside the dialog which is closed.
   - If submitBriefingAction returns wrong_status, the toast appears but the dialog stays closed; the button is no longer disabled (useTransition resolves) and clicking again re-opens the dialog → calls submit again → wrong_status again. Verify this is acceptable UX (or recommend a one-shot guard).

6. **SessionStorage cleanup.** sessionStorage.removeItem(SESSION_STORAGE_KEY) only runs on success. On wrong_status / unauthorized / db error, the key persists. Verify:
   - On wrong_status (already submitted), should the key be cleared anyway? (Recommend: yes — the user can't recover from this state by re-submitting.)
   - The try/catch around removeItem swallows errors silently. Verify nothing downstream depends on the cleanup actually completing (the redirect happens after).

## Already-deferred (do NOT flag again)

- FU-Phase5-3: generic OG scrape with undici dispatcher (sub_5 closed F1)
- FU-Phase5-4: projects table column-grant lockdown for the 11 commit/metadata fields (Phase 5 ff-merge batch sweep candidate)
- FU-Phase5-1: data migration FK risk (Wave A LOOP 1 MED-C)
- has_plan column drop / projects.purpose column drop — yagi explicitly opted to keep both columns

## Scale-aware rule reminder

Phase 5 < 100 user, all-trusted. MED-B/C with no direct user input + no external < 30d delivery + not 3rd-repeat → defer. MED-B/C otherwise → inline fix. HIGH always inline.

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — task_06 v3 + hotfix-5 ready for yagi visual review and Wave B → Wave C transition."

End with one-line summary suitable for the run log.

codex
I’ll review the touched files against the six focus areas and use the repo’s existing patterns for the `revalidatePath` check. I’ll keep this in review mode and avoid changing files.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"revalidatePath\\(|BriefingCanvasStep3|updateProjectCommitAction|submitBriefingAction|assertProjectMutationAuth|inFlightRef|pendingRef|SESSION_STORAGE_KEY|AlertDialog|submitting|lastCommitted\" src/app/[locale]/app/projects/new src -g \"*.ts\" -g \"*.tsx\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"created_by|status|metadataInput|SidebarFormData|EMPTY_SIDEBAR|select\\(\" src/app/[locale]/app/projects/new/briefing-step2-actions.ts src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 415ms:
src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx:16://   [← 이전]  ·  자동 저장 status indicator  ·  [확인 →]
src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx:39:  type SidebarFormData,
src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx:52:const EMPTY_SIDEBAR: SidebarFormData = {
src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx:83:  const [sidebarInitial, setSidebarInitial] = useState<SidebarFormData | null>(
src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx:100:          .select(
src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx:107:          .select(
src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx:153:        ...EMPTY_SIDEBAR,
src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx:26:// updateProjectMetadataAction. Visible status indicator in the sticky
src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx:98:export type SidebarFormData = {
src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx:227:  initial: SidebarFormData;
src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx:231:  const [form, setForm] = useState<SidebarFormData>(initial);
src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx:235:  const pendingRef = useRef<SidebarFormData | null>(null);
src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx:241:  const runSave = async (snapshot: SidebarFormData): Promise<void> => {
src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx:297:  const set = <K extends keyof SidebarFormData>(
src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx:299:    value: SidebarFormData[K],
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:28://   4. status='draft' guard on every Step 2 write (no metadata changes
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:80: * action layer so a status transition or workspace removal between
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:116:    .select("id, workspace_id, status, created_by")
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:127:  if (project.status !== "draft") {
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:137:    .select("user_id")
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:274:        created_by: string;
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:342:          created_by: auth.userId,
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:357:          created_by: auth.userId,
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:363:    .select(
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:364:      "id, kind, source_type, storage_key, filename, size_bytes, mime_type, url, provider, thumbnail_url, oembed_html, note, category, created_at, created_by",
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:420:    .select("id, project_id, created_by")
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:424:  if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:426:  // RLS DELETE policy gates created_by + workspace member + status='draft'.
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:427:  // The redundant eq filter on created_by is defense-in-depth.
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:432:    .eq("created_by", user.id);
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:483:    .select("id, kind, created_by")
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:487:  if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:512:    .eq("created_by", user.id);
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:532:const metadataInput = z.object({
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:559:  const parsed = metadataInput.safeParse(input);
src/app/[locale]/app/projects/new/briefing-step2-actions.ts:587:    .eq("status", "draft");

 succeeded in 496ms:
src/app/[locale]/app/projects/new\briefing-canvas-step-1.tsx:148:  submitting,
src/app/[locale]/app/projects/new\briefing-canvas-step-1.tsx:152:  submitting: boolean;
src/app/[locale]/app/projects/new\briefing-canvas-step-1.tsx:261:            disabled={submitting}
src/app/[locale]/app/projects/new\briefing-canvas-step-1.tsx:264:            {submitting ? (
src/app/[locale]/app/projects/new\briefing-actions.ts:145:    revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\briefing-actions.ts:194:    revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\briefing-actions.ts:226:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\new-project-wizard.tsx:406:  // Validate admin fields before submitting from Step 3
src/app/[locale]/app/projects/new\new-project-wizard.tsx:835:              // Validate admin fields before submitting
src/app/[locale]/app/projects/new\actions.ts:191:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\actions.ts:423:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\actions.ts:509:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\actions.ts:510:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src/app/[locale]/app/projects/new\actions.ts:726://   6. Emit in-app notification to the submitting user (best-effort, not
src/app/[locale]/app/projects/new\actions.ts:1131:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\actions.ts:1132:  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:7://   - updateProjectCommitAction(input)  — autosave 5 commit fields
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:12://   - submitBriefingAction(input)       — atomic status transition
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:16://   Same assertProjectMutationAuth pattern as briefing-step2-actions:
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:26:// member-creator branch). After submitBriefingAction flips status, every
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:42:async function assertProjectMutationAuth(projectId: string): Promise<
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:75:    console.error("[step3 assertProjectMutationAuth] SELECT error:", selErr);
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:101:// 1. updateProjectCommitAction — Step 3 autosave for 5 commit fields
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:131:export async function updateProjectCommitAction(
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:138:  const auth = await assertProjectMutationAuth(parsed.data.projectId);
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:158:  // status flip between assertProjectMutationAuth and this UPDATE is
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:167:    console.error("[updateProjectCommitAction] UPDATE error:", updErr);
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:175:// 2. submitBriefingAction — atomic status flip 'draft' → 'in_review'
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:197:export async function submitBriefingAction(
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:204:  const auth = await assertProjectMutationAuth(parsed.data.projectId);
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:210:  // between the assertProjectMutationAuth SELECT and this UPDATE all collapse
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:226:    console.error("[submitBriefingAction] UPDATE error:", updErr);
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:236:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:12://   3. [의뢰하기 →] CTA → AlertDialog confirm → submitBriefingAction
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:17:// for inFlightRef to drain before calling submitBriefingAction. Even if a
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:36:  AlertDialog,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:37:  AlertDialogAction,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:38:  AlertDialogCancel,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:39:  AlertDialogContent,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:40:  AlertDialogDescription,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:41:  AlertDialogFooter,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:42:  AlertDialogHeader,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:43:  AlertDialogTitle,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:44:  AlertDialogTrigger,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:53:  updateProjectCommitAction,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:54:  submitBriefingAction,
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:68:const SESSION_STORAGE_KEY = "briefing_canvas_v3_state";
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:133:export function BriefingCanvasStep3({
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:150:  const [submitting, startSubmit] = useTransition();
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:153:  const lastCommittedRef = useRef<string>(JSON.stringify(EMPTY_COMMIT));
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:154:  const inFlightRef = useRef(false);
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:155:  const pendingRef = useRef<CommitFormData | null>(null);
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:210:      lastCommittedRef.current = JSON.stringify(seed);
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:220:    if (inFlightRef.current) {
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:221:      pendingRef.current = snapshot;
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:224:    inFlightRef.current = true;
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:227:      const res = await updateProjectCommitAction({
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:239:        lastCommittedRef.current = JSON.stringify(snapshot);
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:246:      inFlightRef.current = false;
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:247:      const next = pendingRef.current;
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:249:        pendingRef.current = null;
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:259:    if (serialized === lastCommittedRef.current) return;
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:286:      if (serialized !== lastCommittedRef.current) {
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:290:      while (inFlightRef.current) {
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:294:      const result = await submitBriefingAction({ projectId });
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:306:        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:604:            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:605:              <AlertDialogTrigger asChild>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:609:                  disabled={submitting}
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:612:                  {submitting ? (
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:618:              </AlertDialogTrigger>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:619:              <AlertDialogContent>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:620:                <AlertDialogHeader>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:621:                  <AlertDialogTitle>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:623:                  </AlertDialogTitle>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:624:                  <AlertDialogDescription className="keep-all leading-relaxed">
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:626:                  </AlertDialogDescription>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:627:                </AlertDialogHeader>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:628:                <AlertDialogFooter>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:629:                  <AlertDialogCancel>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:631:                  </AlertDialogCancel>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:632:                  <AlertDialogAction onClick={handleSubmit}>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:634:                  </AlertDialogAction>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:635:                </AlertDialogFooter>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:636:              </AlertDialogContent>
src/app/[locale]/app/projects/new\briefing-canvas-step-3.tsx:637:            </AlertDialog>
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:83:async function assertProjectMutationAuth(projectId: string): Promise<
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:120:    console.error("[assertProjectMutationAuth] SELECT error:", selErr);
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:184:  const auth = await assertProjectMutationAuth(parsed.data.projectId);
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:297:  const auth = await assertProjectMutationAuth(data.projectId);
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:376:  revalidatePath("/[locale]/app/projects/new", "page");
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:437:  revalidatePath("/[locale]/app/projects/new", "page");
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:517:  revalidatePath("/[locale]/app/projects/new", "page");
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:527:// additional_notes) live in updateProjectCommitAction in
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:563:  const auth = await assertProjectMutationAuth(parsed.data.projectId);
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:40://       snapshot is parked in pendingRef.
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:41://     - When the running save completes, runSave drains pendingRef and
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:233:  const lastCommittedRef = useRef<string>(JSON.stringify(initial));
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:234:  const inFlightRef = useRef<boolean>(false);
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:235:  const pendingRef = useRef<SidebarFormData | null>(null);
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:239:  // Single-flight save runner. Drains pendingRef on completion so the
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:242:    if (inFlightRef.current) {
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:243:      pendingRef.current = snapshot;
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:246:    inFlightRef.current = true;
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:264:        lastCommittedRef.current = JSON.stringify(snapshot);
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:270:      inFlightRef.current = false;
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:271:      const next = pendingRef.current;
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:273:        pendingRef.current = null;
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:283:    if (serialized === lastCommittedRef.current) return;
src/app/[locale]/app/projects/new\briefing-canvas.tsx:39:import { BriefingCanvasStep3 } from "./briefing-canvas-step-3";
src/app/[locale]/app/projects/new\briefing-canvas.tsx:57:const SESSION_STORAGE_KEY = "briefing_canvas_v3_state";
src/app/[locale]/app/projects/new\briefing-canvas.tsx:87:  const [submitting, setSubmitting] = useState(false);
src/app/[locale]/app/projects/new\briefing-canvas.tsx:93:      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
src/app/[locale]/app/projects/new\briefing-canvas.tsx:136:        SESSION_STORAGE_KEY,
src/app/[locale]/app/projects/new\briefing-canvas.tsx:203:            submitting={submitting}
src/app/[locale]/app/projects/new\briefing-canvas.tsx:223:          <BriefingCanvasStep3
src\app\challenges\[slug]\submit\actions.ts:304:  revalidatePath(`/challenges/${slug}/gallery`);
src\app\challenges\[slug]\gallery\actions.ts:46:  revalidatePath(`/challenges/${slug}/gallery`);
src\lib\commission\actions.ts:74:  revalidatePath("/app/commission");
src\lib\commission\actions.ts:127:  revalidatePath("/app/admin/commissions");
src\lib\commission\actions.ts:128:  revalidatePath(`/app/admin/commissions/${parsed.data.intake_id}`);
src\lib\commission\actions.ts:129:  revalidatePath("/app/commission");
src\lib\commission\actions.ts:130:  revalidatePath(`/app/commission/${parsed.data.intake_id}`);
src\lib\commission\actions.ts:153:  revalidatePath("/app/commission");
src\lib\commission\actions.ts:154:  revalidatePath(`/app/commission/${intakeId}`);
src\lib\workspace\actions.ts:67:  revalidatePath("/[locale]/app", "layout");
src\app\[locale]\onboarding\workspace\page.tsx:41:  const [submitting, setSubmitting] = useState(false);
src\app\[locale]\onboarding\workspace\page.tsx:113:        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
src\app\[locale]\onboarding\workspace\page.tsx:114:          {submitting ? "..." : c("continue")}
src\app\[locale]\onboarding\invite\page.tsx:24:  const [submitting, setSubmitting] = useState(false);
src\app\[locale]\onboarding\invite\page.tsx:104:        <Button size="lg" onClick={onSend} disabled={submitting || emails.length === 0}>
src\app\[locale]\onboarding\invite\page.tsx:105:          {submitting ? "..." : t("invite_send")}
src\components\ui\alert-dialog.tsx:4:import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
src\components\ui\alert-dialog.tsx:9:const AlertDialog = AlertDialogPrimitive.Root
src\components\ui\alert-dialog.tsx:11:const AlertDialogTrigger = AlertDialogPrimitive.Trigger
src\components\ui\alert-dialog.tsx:13:const AlertDialogPortal = AlertDialogPrimitive.Portal
src\components\ui\alert-dialog.tsx:15:const AlertDialogOverlay = React.forwardRef<
src\components\ui\alert-dialog.tsx:16:  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
src\components\ui\alert-dialog.tsx:17:  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
src\components\ui\alert-dialog.tsx:19:  <AlertDialogPrimitive.Overlay
src\components\ui\alert-dialog.tsx:28:AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName
src\components\ui\alert-dialog.tsx:30:const AlertDialogContent = React.forwardRef<
src\components\ui\alert-dialog.tsx:31:  React.ElementRef<typeof AlertDialogPrimitive.Content>,
src\components\ui\alert-dialog.tsx:32:  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
src\components\ui\alert-dialog.tsx:34:  <AlertDialogPortal>
src\components\ui\alert-dialog.tsx:35:    <AlertDialogOverlay />
src\components\ui\alert-dialog.tsx:36:    <AlertDialogPrimitive.Content
src\components\ui\alert-dialog.tsx:44:  </AlertDialogPortal>
src\components\ui\alert-dialog.tsx:46:AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName
src\components\ui\alert-dialog.tsx:48:const AlertDialogHeader = ({
src\components\ui\alert-dialog.tsx:60:AlertDialogHeader.displayName = "AlertDialogHeader"
src\components\ui\alert-dialog.tsx:62:const AlertDialogFooter = ({
src\components\ui\alert-dialog.tsx:74:AlertDialogFooter.displayName = "AlertDialogFooter"
src\components\ui\alert-dialog.tsx:76:const AlertDialogTitle = React.forwardRef<
src\components\ui\alert-dialog.tsx:77:  React.ElementRef<typeof AlertDialogPrimitive.Title>,
src\components\ui\alert-dialog.tsx:78:  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
src\components\ui\alert-dialog.tsx:80:  <AlertDialogPrimitive.Title
src\components\ui\alert-dialog.tsx:86:AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName
src\components\ui\alert-dialog.tsx:88:const AlertDialogDescription = React.forwardRef<
src\components\ui\alert-dialog.tsx:89:  React.ElementRef<typeof AlertDialogPrimitive.Description>,
src\components\ui\alert-dialog.tsx:90:  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
src\components\ui\alert-dialog.tsx:92:  <AlertDialogPrimitive.Description
src\components\ui\alert-dialog.tsx:98:AlertDialogDescription.displayName =
src\components\ui\alert-dialog.tsx:99:  AlertDialogPrimitive.Description.displayName
src\components\ui\alert-dialog.tsx:101:const AlertDialogAction = React.forwardRef<
src\components\ui\alert-dialog.tsx:102:  React.ElementRef<typeof AlertDialogPrimitive.Action>,
src\components\ui\alert-dialog.tsx:103:  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
src\components\ui\alert-dialog.tsx:105:  <AlertDialogPrimitive.Action
src\components\ui\alert-dialog.tsx:111:AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName
src\components\ui\alert-dialog.tsx:113:const AlertDialogCancel = React.forwardRef<
src\components\ui\alert-dialog.tsx:114:  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
src\components\ui\alert-dialog.tsx:115:  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
src\components\ui\alert-dialog.tsx:117:  <AlertDialogPrimitive.Cancel
src\components\ui\alert-dialog.tsx:127:AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName
src\components\ui\alert-dialog.tsx:130:  AlertDialog,
src\components\ui\alert-dialog.tsx:131:  AlertDialogPortal,
src\components\ui\alert-dialog.tsx:132:  AlertDialogOverlay,
src\components\ui\alert-dialog.tsx:133:  AlertDialogTrigger,
src\components\ui\alert-dialog.tsx:134:  AlertDialogContent,
src\components\ui\alert-dialog.tsx:135:  AlertDialogHeader,
src\components\ui\alert-dialog.tsx:136:  AlertDialogFooter,
src\components\ui\alert-dialog.tsx:137:  AlertDialogTitle,
src\components\ui\alert-dialog.tsx:138:  AlertDialogDescription,
src\components\ui\alert-dialog.tsx:139:  AlertDialogAction,
src\components\ui\alert-dialog.tsx:140:  AlertDialogCancel,
src\app\[locale]\onboarding\brand\page.tsx:37:  const [submitting, setSubmitting] = useState(false);
src\app\[locale]\onboarding\brand\page.tsx:106:          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
src\app\[locale]\onboarding\brand\page.tsx:107:            {submitting ? "..." : c("continue")}
src\app\[locale]\(auth)\forgot-password\page.tsx:23:  const [submitting, setSubmitting] = useState(false);
src\app\[locale]\(auth)\forgot-password\page.tsx:79:          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
src\app\[locale]\(auth)\forgot-password\page.tsx:80:            {submitting ? t("sending") : t("send_link")}
src\app\showcase\[slug]\actions.ts:104:  if (slug) revalidatePath(`/showcase/${slug}`);
src\app\[locale]\(auth)\signup\page.tsx:59:  const [submitting, setSubmitting] = useState(false);
src\app\[locale]\(auth)\signup\page.tsx:251:        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
src\app\[locale]\(auth)\signup\page.tsx:252:          {submitting ? t("sending") : c("signup")}
src\components\team\edit-channel-dialog.tsx:16:  AlertDialog,
src\components\team\edit-channel-dialog.tsx:17:  AlertDialogAction,
src\components\team\edit-channel-dialog.tsx:18:  AlertDialogCancel,
src\components\team\edit-channel-dialog.tsx:19:  AlertDialogContent,
src\components\team\edit-channel-dialog.tsx:20:  AlertDialogDescription,
src\components\team\edit-channel-dialog.tsx:21:  AlertDialogFooter,
src\components\team\edit-channel-dialog.tsx:22:  AlertDialogHeader,
src\components\team\edit-channel-dialog.tsx:23:  AlertDialogTitle,
src\components\team\edit-channel-dialog.tsx:183:      <AlertDialog
src\components\team\edit-channel-dialog.tsx:187:        <AlertDialogContent>
src\components\team\edit-channel-dialog.tsx:188:          <AlertDialogHeader>
src\components\team\edit-channel-dialog.tsx:189:            <AlertDialogTitle className="keep-all">
src\components\team\edit-channel-dialog.tsx:193:            </AlertDialogTitle>
src\components\team\edit-channel-dialog.tsx:194:            <AlertDialogDescription className="keep-all">
src\components\team\edit-channel-dialog.tsx:198:            </AlertDialogDescription>
src\components\team\edit-channel-dialog.tsx:199:          </AlertDialogHeader>
src\components\team\edit-channel-dialog.tsx:200:          <AlertDialogFooter>
src\components\team\edit-channel-dialog.tsx:201:            <AlertDialogCancel disabled={archivePending}>
src\components\team\edit-channel-dialog.tsx:203:            </AlertDialogCancel>
src\components\team\edit-channel-dialog.tsx:204:            <AlertDialogAction
src\components\team\edit-channel-dialog.tsx:218:            </AlertDialogAction>
src\components\team\edit-channel-dialog.tsx:219:          </AlertDialogFooter>
src\components\team\edit-channel-dialog.tsx:220:        </AlertDialogContent>
src\components\team\edit-channel-dialog.tsx:221:      </AlertDialog>
src\components\team\channel-view.tsx:28:  AlertDialog,
src\components\team\channel-view.tsx:29:  AlertDialogAction,
src\components\team\channel-view.tsx:30:  AlertDialogCancel,
src\components\team\channel-view.tsx:31:  AlertDialogContent,
src\components\team\channel-view.tsx:32:  AlertDialogDescription,
src\components\team\channel-view.tsx:33:  AlertDialogFooter,
src\components\team\channel-view.tsx:34:  AlertDialogHeader,
src\components\team\channel-view.tsx:35:  AlertDialogTitle,
src\components\team\channel-view.tsx:610:        <AlertDialog
src\components\team\channel-view.tsx:614:          <AlertDialogContent>
src\components\team\channel-view.tsx:615:            <AlertDialogHeader>
src\components\team\channel-view.tsx:616:              <AlertDialogTitle className="keep-all">
src\components\team\channel-view.tsx:618:              </AlertDialogTitle>
src\components\team\channel-view.tsx:619:              <AlertDialogDescription className="sr-only">
src\components\team\channel-view.tsx:621:              </AlertDialogDescription>
src\components\team\channel-view.tsx:622:            </AlertDialogHeader>
src\components\team\channel-view.tsx:623:            <AlertDialogFooter>
src\components\team\channel-view.tsx:624:              <AlertDialogCancel disabled={deleting}>
src\components\team\channel-view.tsx:626:              </AlertDialogCancel>
src\components\team\channel-view.tsx:627:              <AlertDialogAction
src\components\team\channel-view.tsx:639:              </AlertDialogAction>
src\components\team\channel-view.tsx:640:            </AlertDialogFooter>
src\components\team\channel-view.tsx:641:          </AlertDialogContent>
src\components\team\channel-view.tsx:642:        </AlertDialog>
src\app\[locale]\app\team\[slug]\actions.ts:158:    revalidatePath(`/${data.locale}/app/team/${data.channelSlug}`);
src\app\[locale]\app\team\[slug]\actions.ts:424:    revalidatePath(`/ko/app/team/${inserted.slug}`);
src\app\[locale]\app\team\[slug]\actions.ts:425:    revalidatePath(`/en/app/team/${inserted.slug}`);
src\app\[locale]\app\team\[slug]\actions.ts:467:    revalidatePath(`/ko/app/team/${updated.slug}`);
src\app\[locale]\app\team\[slug]\actions.ts:468:    revalidatePath(`/en/app/team/${updated.slug}`);
src\app\[locale]\app\team\[slug]\actions.ts:506:    revalidatePath(`/ko/app/team/${updated.slug}`);
src\app\[locale]\app\team\[slug]\actions.ts:507:    revalidatePath(`/en/app/team/${updated.slug}`);
src\app\[locale]\(auth)\reset-password\page.tsx:31:  const [submitting, setSubmitting] = useState(false);
src\app\[locale]\(auth)\reset-password\page.tsx:89:        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
src\app\[locale]\(auth)\reset-password\page.tsx:90:          {submitting ? t("sending") : c("save")}
src\app\[locale]\(auth)\signin\page.tsx:48:  const [submitting, setSubmitting] = useState(false);
src\app\[locale]\(auth)\signin\page.tsx:118:        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
src\app\[locale]\(auth)\signin\page.tsx:119:          {submitting ? t("sending") : c("signin")}
src\app\[locale]\app\support\actions.ts:124:  revalidatePath("/[locale]/app/admin/support", "page");
src\app\[locale]\app\support\actions.ts:156:  revalidatePath("/[locale]/app/admin/support", "page");
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:17:    revalidatePath(`/${locale}/app/invoices`);
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:18:    revalidatePath(`/${locale}/app/invoices/${invoiceId}`);
src\app\[locale]\app\invoices\[id]\actions.ts:22:    revalidatePath(`/${locale}/app/invoices`);
src\app\[locale]\app\invoices\[id]\actions.ts:23:    revalidatePath(`/${locale}/app/invoices/${invoiceId}`);
src\components\meetings\meeting-request-card.tsx:260:          {pending ? t("request_submitting") : t("request_submit")}
src\app\[locale]\app\notifications\actions.ts:76:  revalidatePath("/[locale]/app", "layout");
src\app\[locale]\app\notifications\actions.ts:98:  revalidatePath("/[locale]/app", "layout");
src\app\[locale]\app\invoices\actions.ts:74:    revalidatePath(`/${locale}/app/invoices`);
src\app\[locale]\app\admin\challenges\actions.ts:44:    revalidatePath(`/${locale}/app/admin/challenges`);
src\app\[locale]\app\admin\challenges\actions.ts:45:    if (slug) revalidatePath(`/${locale}/app/admin/challenges/${slug}/edit`);
src\app\[locale]\app\preprod\actions.ts:63:    revalidatePath(`/${locale}/app/preprod`);
src\app\[locale]\app\admin\commissions\[id]\actions.ts:89:  revalidatePath(
src\app\[locale]\app\admin\commissions\[id]\actions.ts:93:  revalidatePath("/[locale]/app/admin/commissions", "page");
src\app\[locale]\app\admin\commissions\[id]\actions.ts:94:  revalidatePath(`/[locale]/app/projects/${result.projectId}`, "page");
src\app\[locale]\app\meetings\actions.ts:296:    revalidatePath(`/${locale}/app/meetings`);
src\app\[locale]\app\meetings\actions.ts:298:      revalidatePath(`/${locale}/app/projects/${projectId}`);
src\app\[locale]\app\meetings\actions.ts:305:    revalidatePath(`/${locale}/app/meetings/${meetingId}`);
src\app\[locale]\app\meetings\actions.ts:306:    revalidatePath(`/${locale}/app/meetings`);
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:150:    revalidatePath(`/${locale}/app/admin/challenges`);
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:151:    revalidatePath(`/${locale}/app/admin/challenges/${challenge.slug}/announce`);
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:153:  revalidatePath(`/challenges/${challenge.slug}`);
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:154:  revalidatePath(`/challenges/${challenge.slug}/gallery`);
src\app\[locale]\app\preprod\[id]\share-actions.ts:35:  revalidatePath("/app/preprod")
src\app\[locale]\app\preprod\[id]\share-actions.ts:36:  revalidatePath(`/app/preprod/${boardId}`)
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:83:  revalidatePath(`/app/admin/challenges/${slug}/judge`);
src\app\[locale]\app\showcases\actions.ts:54:    revalidatePath(`/${locale}/app/showcases`);
src\app\[locale]\app\showcases\actions.ts:55:    revalidatePath(`/${locale}/app/showcases/${showcaseId}`);
src\app\[locale]\app\showcases\actions.ts:57:  if (slug) revalidatePath(`/showcase/${slug}`);
src\app\[locale]\app\meetings\request-actions.ts:184:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\meetings\request-actions.ts:185:  revalidatePath("/[locale]/app/meetings", "page");
src\app\[locale]\app\meetings\request-actions.ts:219:  revalidatePath("/[locale]/app/meetings", "page");
src\app\[locale]\app\meetings\request-actions.ts:220:  revalidatePath(`/[locale]/app/meetings/${parsed.data.meetingId}`, "page");
src\app\[locale]\app\meetings\request-actions.ts:276:  revalidatePath("/[locale]/app/meetings", "page");
src\app\[locale]\app\meetings\request-actions.ts:277:  revalidatePath(`/[locale]/app/meetings/${meeting.id}`, "page");
src\app\[locale]\app\meetings\request-actions.ts:324:  revalidatePath("/[locale]/app/meetings", "page");
src\app\[locale]\app\meetings\request-actions.ts:325:  revalidatePath(`/[locale]/app/meetings/${meeting.id}`, "page");
src\app\[locale]\app\preprod\[id]\actions.ts:15:    revalidatePath(`/${locale}/app/preprod`);
src\app\[locale]\app\preprod\[id]\actions.ts:16:    revalidatePath(`/${locale}/app/preprod/${boardId}`);
src\app\[locale]\app\preprod\[id]\actions.ts:278:    revalidatePath(`/${locale}/app/preprod`);
src\app\[locale]\app\settings\actions.ts:92:  revalidatePath(`/[locale]/app/settings`, "page");
src\app\[locale]\app\settings\actions.ts:116:  revalidatePath(`/[locale]/app/settings`, "page");
src\app\[locale]\app\settings\actions.ts:148:  revalidatePath(`/[locale]/app/settings`, "page");
src\app\[locale]\app\settings\actions.ts:190:  revalidatePath(`/[locale]/app/settings`, "page");
src\components\commission\intake-form.tsx:50:  const [submitting, setSubmitting] = useState(false);
src\components\commission\intake-form.tsx:280:          <Button type="submit" size="lg" disabled={submitting}>
src\components\commission\intake-form.tsx:281:            {submitting ? t("submitting") : t("submit_cta")}
src\components\commission\admin-response-form.tsx:19:  const [submitting, setSubmitting] = useState(false);
src\components\commission\admin-response-form.tsx:55:        <Button type="submit" disabled={submitting}>
src\components\commission\admin-response-form.tsx:56:          {submitting ? t("response_submitting") : t("response_submit")}
src\components\invoices\invoice-editor.tsx:37:  AlertDialog,
src\components\invoices\invoice-editor.tsx:38:  AlertDialogAction,
src\components\invoices\invoice-editor.tsx:39:  AlertDialogCancel,
src\components\invoices\invoice-editor.tsx:40:  AlertDialogContent,
src\components\invoices\invoice-editor.tsx:41:  AlertDialogDescription,
src\components\invoices\invoice-editor.tsx:42:  AlertDialogFooter,
src\components\invoices\invoice-editor.tsx:43:  AlertDialogHeader,
src\components\invoices\invoice-editor.tsx:44:  AlertDialogTitle,
src\components\invoices\invoice-editor.tsx:45:  AlertDialogTrigger,
src\components\invoices\invoice-editor.tsx:595:            <AlertDialog>
src\components\invoices\invoice-editor.tsx:596:              <AlertDialogTrigger asChild>
src\components\invoices\invoice-editor.tsx:607:              </AlertDialogTrigger>
src\components\invoices\invoice-editor.tsx:608:              <AlertDialogContent>
src\components\invoices\invoice-editor.tsx:609:                <AlertDialogHeader>
src\components\invoices\invoice-editor.tsx:610:                  <AlertDialogTitle>
src\components\invoices\invoice-editor.tsx:612:                  </AlertDialogTitle>
src\components\invoices\invoice-editor.tsx:613:                  <AlertDialogDescription className="keep-all">
src\components\invoices\invoice-editor.tsx:615:                  </AlertDialogDescription>
src\components\invoices\invoice-editor.tsx:616:                </AlertDialogHeader>
src\components\invoices\invoice-editor.tsx:617:                <AlertDialogFooter>
src\components\invoices\invoice-editor.tsx:618:                  <AlertDialogCancel className="rounded-full">
src\components\invoices\invoice-editor.tsx:620:                  </AlertDialogCancel>
src\components\invoices\invoice-editor.tsx:621:                  <AlertDialogAction
src\components\invoices\invoice-editor.tsx:626:                  </AlertDialogAction>
src\components\invoices\invoice-editor.tsx:627:                </AlertDialogFooter>
src\components\invoices\invoice-editor.tsx:628:              </AlertDialogContent>
src\components\invoices\invoice-editor.tsx:629:            </AlertDialog>
src\components\invoices\invoice-editor.tsx:715:          <AlertDialog>
src\components\invoices\invoice-editor.tsx:716:            <AlertDialogTrigger asChild>
src\components\invoices\invoice-editor.tsx:727:            </AlertDialogTrigger>
src\components\invoices\invoice-editor.tsx:728:            <AlertDialogContent>
src\components\invoices\invoice-editor.tsx:729:              <AlertDialogHeader>
src\components\invoices\invoice-editor.tsx:730:                <AlertDialogTitle>{t("issue_confirm_title")}</AlertDialogTitle>
src\components\invoices\invoice-editor.tsx:731:                <AlertDialogDescription className="keep-all">
src\components\invoices\invoice-editor.tsx:733:                </AlertDialogDescription>
src\components\invoices\invoice-editor.tsx:734:              </AlertDialogHeader>
src\components\invoices\invoice-editor.tsx:735:              <AlertDialogFooter>
src\components\invoices\invoice-editor.tsx:736:                <AlertDialogCancel className="rounded-full">
src\components\invoices\invoice-editor.tsx:738:                </AlertDialogCancel>
src\components\invoices\invoice-editor.tsx:739:                <AlertDialogAction
src\components\invoices\invoice-editor.tsx:744:                </AlertDialogAction>
src\components\invoices\invoice-editor.tsx:745:              </AlertDialogFooter>
src\components\invoices\invoice-editor.tsx:746:            </AlertDialogContent>
src\components\invoices\invoice-editor.tsx:747:          </AlertDialog>
src\components\invoices\invoice-editor.tsx:767:          <AlertDialog>
src\components\invoices\invoice-editor.tsx:768:            <AlertDialogTrigger asChild>
src\components\invoices\invoice-editor.tsx:777:            </AlertDialogTrigger>
src\components\invoices\invoice-editor.tsx:778:            <AlertDialogContent>
src\components\invoices\invoice-editor.tsx:779:              <AlertDialogHeader>
src\components\invoices\invoice-editor.tsx:780:                <AlertDialogTitle>{t("void_confirm_title")}</AlertDialogTitle>
src\components\invoices\invoice-editor.tsx:781:                <AlertDialogDescription className="keep-all">
src\components\invoices\invoice-editor.tsx:783:                </AlertDialogDescription>
src\components\invoices\invoice-editor.tsx:784:              </AlertDialogHeader>
src\components\invoices\invoice-editor.tsx:792:              <AlertDialogFooter>
src\components\invoices\invoice-editor.tsx:793:                <AlertDialogCancel className="rounded-full">
src\components\invoices\invoice-editor.tsx:795:                </AlertDialogCancel>
src\components\invoices\invoice-editor.tsx:796:                <AlertDialogAction
src\components\invoices\invoice-editor.tsx:801:                </AlertDialogAction>
src\components\invoices\invoice-editor.tsx:802:              </AlertDialogFooter>
src\components\invoices\invoice-editor.tsx:803:            </AlertDialogContent>
src\components\invoices\invoice-editor.tsx:804:          </AlertDialog>
src\components\share\fast-feedback-bar.tsx:71:  const [submitting, setSubmitting] = useState(false);
src\components\share\fast-feedback-bar.tsx:173:            disabled={submitting}
src\components\share\comment-form.tsx:51:  const [submitting, setSubmitting] = useState(false);
src\components\share\comment-form.tsx:118:          disabled={submitting || !body.trim() || !name.trim() || !email.trim()}
src\app\[locale]\app\settings\notifications\actions.ts:57:  revalidatePath("/[locale]/app/settings/notifications", "page");
src\components\share\approve-button.tsx:36:  const [submitting, setSubmitting] = useState(false);
src\components\share\approve-button.tsx:103:              <Button type="submit" size="pill" disabled={submitting} className="flex-1">
src\components\brief-board\yagi-request-modal.tsx:81:              submitting; yagi_request_sent stays reserved for the toast
src\components\brief-board\editor.tsx:139:  const inFlightRef = useRef<boolean>(false);
src\components\brief-board\editor.tsx:247:      if (inFlightRef.current) {
src\components\brief-board\editor.tsx:252:      inFlightRef.current = true;
src\components\brief-board\editor.tsx:323:        inFlightRef.current = false;
src\app\[locale]\app\projects\[id]\board-actions.ts:227:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\board-actions.ts:332:    revalidatePath(
src\app\[locale]\app\projects\[id]\board-actions.ts:447:    revalidatePath(
src\app\[locale]\app\projects\[id]\board-actions.ts:498:    revalidatePath(`/[locale]/app/projects/${board.project_id}`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:97:  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:98:  revalidatePath(`/[locale]/app/projects`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:149:  revalidatePath(`/[locale]/app/projects`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:150:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:151:  revalidatePath(`/[locale]/app/admin/trash`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:169:  revalidatePath(`/[locale]/app/projects`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:170:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:171:  revalidatePath(`/[locale]/app/admin/trash`, "page");
src\app\[locale]\app\projects\[id]\actions.ts:202:  revalidatePath(`/[locale]/app/admin/trash`, "page");
src\components\project-board\brief-board-client.tsx:36:  const inFlightRef = useRef<boolean>(false);
src\components\project-board\brief-board-client.tsx:46:        if (inFlightRef.current) return;
src\components\project-board\brief-board-client.tsx:47:        inFlightRef.current = true;
src\components\project-board\brief-board-client.tsx:63:            inFlightRef.current = false;
src\app\[locale]\app\projects\[id]\thread-actions.ts:79:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\thread-actions.ts:263:  revalidatePath(`/[locale]/app/projects/${d.projectId}`, "page");
src\components\projects\admin-delete-button.tsx:8:  AlertDialog,
src\components\projects\admin-delete-button.tsx:9:  AlertDialogAction,
src\components\projects\admin-delete-button.tsx:10:  AlertDialogCancel,
src\components\projects\admin-delete-button.tsx:11:  AlertDialogContent,
src\components\projects\admin-delete-button.tsx:12:  AlertDialogDescription,
src\components\projects\admin-delete-button.tsx:13:  AlertDialogFooter,
src\components\projects\admin-delete-button.tsx:14:  AlertDialogHeader,
src\components\projects\admin-delete-button.tsx:15:  AlertDialogTitle,
src\components\projects\admin-delete-button.tsx:16:  AlertDialogTrigger,
src\components\projects\admin-delete-button.tsx:54:    <AlertDialog open={open} onOpenChange={setOpen}>
src\components\projects\admin-delete-button.tsx:67:          <AlertDialogTrigger asChild>
src\components\projects\admin-delete-button.tsx:77:          </AlertDialogTrigger>
src\components\projects\admin-delete-button.tsx:81:      <AlertDialogContent>
src\components\projects\admin-delete-button.tsx:82:        <AlertDialogHeader>
src\components\projects\admin-delete-button.tsx:83:          <AlertDialogTitle>{t("delete_confirm_title")}</AlertDialogTitle>
src\components\projects\admin-delete-button.tsx:84:          <AlertDialogDescription className="keep-all">
src\components\projects\admin-delete-button.tsx:86:          </AlertDialogDescription>
src\components\projects\admin-delete-button.tsx:87:        </AlertDialogHeader>
src\components\projects\admin-delete-button.tsx:88:        <AlertDialogFooter>
src\components\projects\admin-delete-button.tsx:89:          <AlertDialogCancel>{t("delete_cancel")}</AlertDialogCancel>
src\components\projects\admin-delete-button.tsx:90:          <AlertDialogAction
src\components\projects\admin-delete-button.tsx:95:          </AlertDialogAction>
src\components\projects\admin-delete-button.tsx:96:        </AlertDialogFooter>
src\components\projects\admin-delete-button.tsx:97:      </AlertDialogContent>
src\components\projects\admin-delete-button.tsx:98:    </AlertDialog>
src\app\[locale]\app\projects\[id]\ref-actions.ts:114:  revalidatePath(`/[locale]/app/projects/${d.projectId}`, "page");
src\app\[locale]\app\projects\[id]\ref-actions.ts:161:    revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src\app\[locale]\app\projects\[id]\ref-actions.ts:181:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src\app\[locale]\app\projects\[id]\ref-actions.ts:219:  revalidatePath(`/[locale]/app/projects/${ref.project_id}`, "page");
src\app\[locale]\app\projects\[id]\brief\actions.ts:313:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\brief\actions.ts:381:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\brief\actions.ts:424:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\app\[locale]\app\projects\[id]\brief\actions.ts:465:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src\components\projects\project-actions.ts:24:  revalidatePath('/[locale]/app/admin/projects', 'page');
src\components\projects\project-actions.ts:25:  revalidatePath(`/[locale]/app/projects/${id}`, 'page');
src\app\[locale]\app\projects\new\briefing-canvas-step-1.tsx:148:  submitting,
src\app\[locale]\app\projects\new\briefing-canvas-step-1.tsx:152:  submitting: boolean;
src\app\[locale]\app\projects\new\briefing-canvas-step-1.tsx:261:            disabled={submitting}
src\app\[locale]\app\projects\new\briefing-canvas-step-1.tsx:264:            {submitting ? (
src\app\[locale]\app\projects\new\actions.ts:191:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\actions.ts:423:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\actions.ts:509:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\actions.ts:510:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src\app\[locale]\app\projects\new\actions.ts:726://   6. Emit in-app notification to the submitting user (best-effort, not
src\app\[locale]\app\projects\new\actions.ts:1131:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\actions.ts:1132:  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
src\app\[locale]\app\projects\new\briefing-actions.ts:145:    revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\briefing-actions.ts:194:    revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\briefing-actions.ts:226:  revalidatePath("/[locale]/app/projects", "page");
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:40://       snapshot is parked in pendingRef.
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:41://     - When the running save completes, runSave drains pendingRef and
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:233:  const lastCommittedRef = useRef<string>(JSON.stringify(initial));
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:234:  const inFlightRef = useRef<boolean>(false);
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:235:  const pendingRef = useRef<SidebarFormData | null>(null);
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:239:  // Single-flight save runner. Drains pendingRef on completion so the
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:242:    if (inFlightRef.current) {
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:243:      pendingRef.current = snapshot;
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:246:    inFlightRef.current = true;
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:264:        lastCommittedRef.current = JSON.stringify(snapshot);
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:270:      inFlightRef.current = false;
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:271:      const next = pendingRef.current;
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:273:        pendingRef.current = null;
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx:283:    if (serialized === lastCommittedRef.current) return;
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:12://   3. [의뢰하기 →] CTA → AlertDialog confirm → submitBriefingAction
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:17:// for inFlightRef to drain before calling submitBriefingAction. Even if a
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:36:  AlertDialog,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:37:  AlertDialogAction,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:38:  AlertDialogCancel,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:39:  AlertDialogContent,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:40:  AlertDialogDescription,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:41:  AlertDialogFooter,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:42:  AlertDialogHeader,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:43:  AlertDialogTitle,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:44:  AlertDialogTrigger,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:53:  updateProjectCommitAction,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:54:  submitBriefingAction,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:68:const SESSION_STORAGE_KEY = "briefing_canvas_v3_state";
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:133:export function BriefingCanvasStep3({
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:150:  const [submitting, startSubmit] = useTransition();
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:153:  const lastCommittedRef = useRef<string>(JSON.stringify(EMPTY_COMMIT));
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:154:  const inFlightRef = useRef(false);
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:155:  const pendingRef = useRef<CommitFormData | null>(null);
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:210:      lastCommittedRef.current = JSON.stringify(seed);
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:220:    if (inFlightRef.current) {
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:221:      pendingRef.current = snapshot;
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:224:    inFlightRef.current = true;
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:227:      const res = await updateProjectCommitAction({
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:239:        lastCommittedRef.current = JSON.stringify(snapshot);
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:246:      inFlightRef.current = false;
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:247:      const next = pendingRef.current;
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:249:        pendingRef.current = null;
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:259:    if (serialized === lastCommittedRef.current) return;
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:286:      if (serialized !== lastCommittedRef.current) {
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:290:      while (inFlightRef.current) {
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:294:      const result = await submitBriefingAction({ projectId });
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:306:        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:604:            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:605:              <AlertDialogTrigger asChild>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:609:                  disabled={submitting}
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:612:                  {submitting ? (
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:618:              </AlertDialogTrigger>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:619:              <AlertDialogContent>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:620:                <AlertDialogHeader>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:621:                  <AlertDialogTitle>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:623:                  </AlertDialogTitle>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:624:                  <AlertDialogDescription className="keep-all leading-relaxed">
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:626:                  </AlertDialogDescription>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:627:                </AlertDialogHeader>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:628:                <AlertDialogFooter>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:629:                  <AlertDialogCancel>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:631:                  </AlertDialogCancel>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:632:                  <AlertDialogAction onClick={handleSubmit}>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:634:                  </AlertDialogAction>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:635:                </AlertDialogFooter>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:636:              </AlertDialogContent>
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:637:            </AlertDialog>
src\app\[locale]\app\projects\new\briefing-canvas.tsx:39:import { BriefingCanvasStep3 } from "./briefing-canvas-step-3";
src\app\[locale]\app\projects\new\briefing-canvas.tsx:57:const SESSION_STORAGE_KEY = "briefing_canvas_v3_state";
src\app\[locale]\app\projects\new\briefing-canvas.tsx:87:  const [submitting, setSubmitting] = useState(false);
src\app\[locale]\app\projects\new\briefing-canvas.tsx:93:      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
src\app\[locale]\app\projects\new\briefing-canvas.tsx:136:        SESSION_STORAGE_KEY,
src\app\[locale]\app\projects\new\briefing-canvas.tsx:203:            submitting={submitting}
src\app\[locale]\app\projects\new\briefing-canvas.tsx:223:          <BriefingCanvasStep3
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:83:async function assertProjectMutationAuth(projectId: string): Promise<
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:120:    console.error("[assertProjectMutationAuth] SELECT error:", selErr);
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:184:  const auth = await assertProjectMutationAuth(parsed.data.projectId);
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:297:  const auth = await assertProjectMutationAuth(data.projectId);
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:376:  revalidatePath("/[locale]/app/projects/new", "page");
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:437:  revalidatePath("/[locale]/app/projects/new", "page");
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:517:  revalidatePath("/[locale]/app/projects/new", "page");
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:527:// additional_notes) live in updateProjectCommitAction in
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:563:  const auth = await assertProjectMutationAuth(parsed.data.projectId);
src\app\[locale]\app\projects\new\new-project-wizard.tsx:406:  // Validate admin fields before submitting from Step 3
src\app\[locale]\app\projects\new\new-project-wizard.tsx:835:              // Validate admin fields before submitting
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:7://   - updateProjectCommitAction(input)  — autosave 5 commit fields
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:12://   - submitBriefingAction(input)       — atomic status transition
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:16://   Same assertProjectMutationAuth pattern as briefing-step2-actions:
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:26:// member-creator branch). After submitBriefingAction flips status, every
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:42:async function assertProjectMutationAuth(projectId: string): Promise<
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:75:    console.error("[step3 assertProjectMutationAuth] SELECT error:", selErr);
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:101:// 1. updateProjectCommitAction — Step 3 autosave for 5 commit fields
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:131:export async function updateProjectCommitAction(
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:138:  const auth = await assertProjectMutationAuth(parsed.data.projectId);
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:158:  // status flip between assertProjectMutationAuth and this UPDATE is
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:167:    console.error("[updateProjectCommitAction] UPDATE error:", updErr);
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:175:// 2. submitBriefingAction — atomic status flip 'draft' → 'in_review'
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:197:export async function submitBriefingAction(
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:204:  const auth = await assertProjectMutationAuth(parsed.data.projectId);
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:210:  // between the assertProjectMutationAuth SELECT and this UPDATE all collapse
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:226:    console.error("[submitBriefingAction] UPDATE error:", updErr);
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:236:  revalidatePath("/[locale]/app/projects", "page");

 succeeded in 502ms:
 M messages/en.json
 M messages/ko.json
 M src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx
 M src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx
 M src/app/[locale]/app/projects/new/briefing-canvas.tsx
 M src/app/[locale]/app/projects/new/briefing-step2-actions.ts
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop1.md
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop2.md
?? .yagi-autobuild/phase-5/_wave_a_task_01_result.md
?? .yagi-autobuild/phase-5/_wave_b_sub_5_codex_loop2_full.md
?? .yagi-autobuild/phase-5/_wave_b_task_04v3_codex_review.md
?? .yagi-autobuild/phase-5/_wave_b_task_06v3_codex_loop1_full.md
?? .yagi-autobuild/phase-5/_wave_b_task_06v3_codex_loop1_prompt.md
?? src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx
?? src/app/[locale]/app/projects/new/briefing-step3-actions.ts

codex
The initial scan confirms the new Step 3 files are present, and `revalidatePath("/[locale]/app/projects", "page")` is already an established local pattern in the project creation actions. I’m reading the exact action and UI blocks now to check the race and re-entrancy behavior.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-step3-actions.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx' | ForEach-Object { "'$i++; if (($i -ge 1 -and $i -le 340) -or ($i -ge 560 -and $i -le 650)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-step2-actions.ts' | ForEach-Object { "'$i++; if (($i -ge 70 -and $i -le 155) -or ($i -ge 520 -and $i -le 600)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx' | ForEach-Object { "'$i++; if (($i -ge 90 -and $i -le 125) -or ($i -ge 250 -and $i -le 285) -or ($i -ge 300 -and $i -le 520)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 524ms:
   1: "use server";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave B task_06 v3 ??Step 3 commit + submit server actions
   5: //
   6: // Two actions:
   7: //   - updateProjectCommitAction(input)  ??autosave 5 commit fields
   8: //                                          (budget_band, target_delivery_at,
   9: //                                           meeting_preferred_at,
  10: //                                           interested_in_twin,
  11: //                                           additional_notes)
  12: //   - submitBriefingAction(input)       ??atomic status transition
  13: //                                          'draft' ??'in_review'
  14: //
  15: // Authorization:
  16: //   Same assertProjectMutationAuth pattern as briefing-step2-actions:
  17: //     1. createSupabaseServer (user-scoped)
  18: //     2. resolveActiveWorkspace
  19: //     3. SELECT project + verify workspace + status='draft' + creator
  20: //     4. UPDATE with explicit eq('status', 'draft') for TOCTOU defense
  21: //
  22: // status='draft' enforcement on commit-field UPDATE is doubled at the RLS
  23: // layer (sub_5 migration adds parent-status='draft' predicate to the
  24: // briefing_documents policies; projects RLS already requires
  25: // (created_by AND status='draft') OR ws_admin OR yagi_admin for the
  26: // member-creator branch). After submitBriefingAction flips status, every
  27: // subsequent commit-field UPDATE from the user-scoped client returns 0
  28: // rows ??no separate revoke needed.
  29: // =============================================================================
  30: 
  31: import { z } from "zod";
  32: import { revalidatePath } from "next/cache";
  33: import { createSupabaseServer } from "@/lib/supabase/server";
  34: import { resolveActiveWorkspace } from "@/lib/workspace/active";
  35: 
  36: // ---------------------------------------------------------------------------
  37: // Auth helper ??duplicated from briefing-step2-actions to keep that file's
  38: // "use server" surface minimal (every export from a "use server" file is a
  39: // server action; we don't want this helper exposed as one).
  40: // ---------------------------------------------------------------------------
  41: 
  42: async function assertProjectMutationAuth(projectId: string): Promise<
  43:   | {
  44:       ok: true;
  45:       userId: string;
  46:       workspaceId: string;
  47:       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  48:       sb: any;
  49:     }
  50:   | {
  51:       ok: false;
  52:       error: "unauthenticated" | "no_workspace" | "not_found" | "forbidden";
  53:       message?: string;
  54:     }
  55: > {
  56:   const supabase = await createSupabaseServer();
  57:   const {
  58:     data: { user },
  59:     error: authErr,
  60:   } = await supabase.auth.getUser();
  61:   if (authErr || !user) return { ok: false, error: "unauthenticated" };
  62: 
  63:   const active = await resolveActiveWorkspace(user.id);
  64:   if (!active) return { ok: false, error: "no_workspace" };
  65: 
  66:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  67:   const sb = supabase as any;
  68: 
  69:   const { data: project, error: selErr } = await sb
  70:     .from("projects")
  71:     .select("id, workspace_id, status, created_by")
  72:     .eq("id", projectId)
  73:     .maybeSingle();
  74:   if (selErr) {
  75:     console.error("[step3 assertProjectMutationAuth] SELECT error:", selErr);
  76:     return { ok: false, error: "forbidden", message: selErr.message };
  77:   }
  78:   if (!project) return { ok: false, error: "not_found" };
  79:   if (project.workspace_id !== active.id) {
  80:     return { ok: false, error: "forbidden", message: "workspace mismatch" };
  81:   }
  82:   if (project.created_by !== user.id) {
  83:     return { ok: false, error: "forbidden", message: "not creator" };
  84:   }
  85:   if (project.status !== "draft") {
  86:     return {
  87:       ok: false,
  88:       error: "forbidden",
  89:       message: "project is no longer draft",
  90:     };
  91:   }
  92:   return {
  93:     ok: true,
  94:     userId: user.id,
  95:     workspaceId: active.id,
  96:     sb,
  97:   };
  98: }
  99: 
 100: // ===========================================================================
 101: // 1. updateProjectCommitAction ??Step 3 autosave for 5 commit fields
 102: // ===========================================================================
 103: 
 104: const commitInput = z.object({
 105:   projectId: z.string().uuid(),
 106:   // All 5 fields optional. undefined = "don't change", null = "clear".
 107:   budget_band: z
 108:     .enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"])
 109:     .optional()
 110:     .nullable(),
 111:   target_delivery_at: z.string().nullable().optional(),
 112:   meeting_preferred_at: z.string().datetime().nullable().optional(),
 113:   interested_in_twin: z.boolean().optional(),
 114:   additional_notes: z.string().trim().max(2000).optional().nullable(),
 115: });
 116: 
 117: export type UpdateProjectCommitResult =
 118:   | { ok: true; savedAt: string }
 119:   | {
 120:       ok: false;
 121:       error:
 122:         | "validation"
 123:         | "unauthenticated"
 124:         | "no_workspace"
 125:         | "not_found"
 126:         | "forbidden"
 127:         | "db";
 128:       message?: string;
 129:     };
 130: 
 131: export async function updateProjectCommitAction(
 132:   input: unknown,
 133: ): Promise<UpdateProjectCommitResult> {
 134:   const parsed = commitInput.safeParse(input);
 135:   if (!parsed.success) {
 136:     return { ok: false, error: "validation", message: parsed.error.message };
 137:   }
 138:   const auth = await assertProjectMutationAuth(parsed.data.projectId);
 139:   if (!auth.ok) return auth;
 140: 
 141:   const payload: Record<string, unknown> = {};
 142:   const fields = [
 143:     "budget_band",
 144:     "target_delivery_at",
 145:     "meeting_preferred_at",
 146:     "interested_in_twin",
 147:     "additional_notes",
 148:   ] as const;
 149:   for (const f of fields) {
 150:     const v = parsed.data[f];
 151:     if (v !== undefined) payload[f] = v;
 152:   }
 153:   if (Object.keys(payload).length === 0) {
 154:     return { ok: false, error: "validation", message: "no field to update" };
 155:   }
 156: 
 157:   // Defense-in-depth: WHERE status='draft' inside the UPDATE itself, so a
 158:   // status flip between assertProjectMutationAuth and this UPDATE is
 159:   // caught at the row layer. RLS would also reject it, but we belt-and-
 160:   // suspenders to keep the action layer's contract observable.
 161:   const { error: updErr } = await auth.sb
 162:     .from("projects")
 163:     .update(payload)
 164:     .eq("id", parsed.data.projectId)
 165:     .eq("status", "draft");
 166:   if (updErr) {
 167:     console.error("[updateProjectCommitAction] UPDATE error:", updErr);
 168:     return { ok: false, error: "db", message: updErr.message };
 169:   }
 170: 
 171:   return { ok: true, savedAt: new Date().toISOString() };
 172: }
 173: 
 174: // ===========================================================================
 175: // 2. submitBriefingAction ??atomic status flip 'draft' ??'in_review'
 176: // ===========================================================================
 177: 
 178: const submitInput = z.object({
 179:   projectId: z.string().uuid(),
 180: });
 181: 
 182: export type SubmitBriefingResult =
 183:   | { ok: true; projectId: string }
 184:   | {
 185:       ok: false;
 186:       error:
 187:         | "validation"
 188:         | "unauthenticated"
 189:         | "no_workspace"
 190:         | "not_found"
 191:         | "forbidden"
 192:         | "wrong_status"
 193:         | "db";
 194:       message?: string;
 195:     };
 196: 
 197: export async function submitBriefingAction(
 198:   input: unknown,
 199: ): Promise<SubmitBriefingResult> {
 200:   const parsed = submitInput.safeParse(input);
 201:   if (!parsed.success) {
 202:     return { ok: false, error: "validation", message: parsed.error.message };
 203:   }
 204:   const auth = await assertProjectMutationAuth(parsed.data.projectId);
 205:   if (!auth.ok) return auth;
 206: 
 207:   // Atomic status transition. WHERE status='draft' AND created_by=auth.uid()
 208:   // both encode the precondition into the UPDATE itself: a double-click,
 209:   // concurrent submit from another tab, or a status flip via support tooling
 210:   // between the assertProjectMutationAuth SELECT and this UPDATE all collapse
 211:   // to "0 rows affected" rather than overwriting an in_review project. We
 212:   // request the updated row back via .select() so a 0-row result is
 213:   // distinguishable from a successful flip.
 214:   const { data: updated, error: updErr } = await auth.sb
 215:     .from("projects")
 216:     .update({
 217:       status: "in_review",
 218:       submitted_at: new Date().toISOString(),
 219:     })
 220:     .eq("id", parsed.data.projectId)
 221:     .eq("created_by", auth.userId)
 222:     .eq("status", "draft")
 223:     .select("id")
 224:     .maybeSingle();
 225:   if (updErr) {
 226:     console.error("[submitBriefingAction] UPDATE error:", updErr);
 227:     return { ok: false, error: "db", message: updErr.message };
 228:   }
 229:   if (!updated) {
 230:     // No row matched ??either status already flipped (double-submit /
 231:     // concurrent tab) or RLS denied the update silently. Surface as
 232:     // wrong_status; the client toast points the user back to the list.
 233:     return { ok: false, error: "wrong_status" };
 234:   }
 235: 
 236:   revalidatePath("/[locale]/app/projects", "page");
 237:   return { ok: true, projectId: updated.id };
 238: }

 succeeded in 536ms:
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
 520: // ===========================================================================
 521: // 5. updateProjectMetadataAction ??Step 2 sidebar autosave
 522: // ===========================================================================
 523: 
 524: // Step 2 owns 6 creative-direction fields. The remaining 5 commit fields
 525: // (budget_band, target_delivery_at, meeting_preferred_at, interested_in_twin,
 526: // additional_notes) live in updateProjectCommitAction in
 527: // briefing-step3-actions.ts ??kept on a separate action so each surface
 528: // is responsible for exactly its own write set, no cross-step partials.
 529: // has_plan was deleted entirely in hotfix-5; the DB column stays but is
 530: // never touched by the briefing canvas anymore.
 531: const metadataInput = z.object({
 532:   projectId: z.string().uuid(),
 533:   mood_keywords: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
 534:   mood_keywords_free: z.string().trim().max(200).optional().nullable(),
 535:   visual_ratio: z.string().trim().max(60).optional().nullable(),
 536:   visual_ratio_custom: z.string().trim().max(60).optional().nullable(),
 537:   channels: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
 538:   target_audience: z.string().trim().max(500).optional().nullable(),
 539: });
 540: 
 541: export type UpdateProjectMetadataResult =
 542:   | { ok: true; savedAt: string }
 543:   | {
 544:       ok: false;
 545:       error:
 546:         | "validation"
 547:         | "unauthenticated"
 548:         | "no_workspace"
 549:         | "not_found"
 550:         | "forbidden"
 551:         | "db";
 552:       message?: string;
 553:     };
 554: 
 555: export async function updateProjectMetadataAction(
 556:   input: unknown,
 557: ): Promise<UpdateProjectMetadataResult> {
 558:   const parsed = metadataInput.safeParse(input);
 559:   if (!parsed.success) {
 560:     return { ok: false, error: "validation", message: parsed.error.message };
 561:   }
 562:   const auth = await assertProjectMutationAuth(parsed.data.projectId);
 563:   if (!auth.ok) return auth;
 564: 
 565:   const payload: Record<string, unknown> = {};
 566:   const fields = [
 567:     "mood_keywords",
 568:     "mood_keywords_free",
 569:     "visual_ratio",
 570:     "visual_ratio_custom",
 571:     "channels",
 572:     "target_audience",
 573:   ] as const;
 574:   for (const f of fields) {
 575:     const v = parsed.data[f];
 576:     if (v !== undefined) payload[f] = v;
 577:   }
 578:   if (Object.keys(payload).length === 0) {
 579:     return { ok: false, error: "validation", message: "no field to update" };
 580:   }
 581: 
 582:   const { error: updErr } = await auth.sb
 583:     .from("projects")
 584:     .update(payload)
 585:     .eq("id", parsed.data.projectId)
 586:     .eq("status", "draft");
 587:   if (updErr) {
 588:     console.error("[updateProjectMetadataAction] UPDATE error:", updErr);
 589:     return { ok: false, error: "db", message: updErr.message };
 590:   }
 591: 
 592:   // No revalidatePath on autosave ??the user is mid-edit and a
 593:   // server-component refresh would visually thrash. Revalidation runs
 594:   // on Step 2 ??Step 3 transition.
 595:   return { ok: true, savedAt: new Date().toISOString() };
 596: }

 succeeded in 536ms:
   1: "use client";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave B task_06 v3 ??Step 3 Commit & Confirm
   5: //
   6: // Three responsibilities:
   7: //   1. Read-only summary of Step 1 + Step 2 inputs (with [Step 1 ?섏젙] /
   8: //      [Step 2 ?섏젙] jumps).
   9: //   2. Commit form (5 fields) with 5s autosave + single-flight queue:
  10: //      budget_band / target_delivery_at / meeting_preferred_at /
  11: //      interested_in_twin / additional_notes.
  12: //   3. [?섎ː?섍린 ?? CTA ??AlertDialog confirm ??submitBriefingAction
  13: //      atomic status flip 'draft' ??'in_review'. On success: clear
  14: //      sessionStorage, toast, redirect to /app/projects.
  15: //
  16: // Autosave/submit race: handleSubmit flushes any pending debounce + waits
  17: // for inFlightRef to drain before calling submitBriefingAction. Even if a
  18: // commit-write somehow lands after the status flip, the row-level
  19: // status='draft' filter on the commit UPDATE catches it (0 rows). The
  20: // submit UPDATE itself is guarded by .eq('status','draft'), so a
  21: // double-click resolves to wrong_status.
  22: // =============================================================================
  23: 
  24: import { useState, useEffect, useRef, useTransition } from "react";
  25: import { useTranslations } from "next-intl";
  26: import { useRouter } from "@/i18n/routing";
  27: import { Loader2, HelpCircle } from "lucide-react";
  28: import { toast } from "sonner";
  29: import { createSupabaseBrowser } from "@/lib/supabase/client";
  30: import { cn } from "@/lib/utils";
  31: import { Button } from "@/components/ui/button";
  32: import { Input } from "@/components/ui/input";
  33: import { Label } from "@/components/ui/label";
  34: import { Textarea } from "@/components/ui/textarea";
  35: import {
  36:   AlertDialog,
  37:   AlertDialogAction,
  38:   AlertDialogCancel,
  39:   AlertDialogContent,
  40:   AlertDialogDescription,
  41:   AlertDialogFooter,
  42:   AlertDialogHeader,
  43:   AlertDialogTitle,
  44:   AlertDialogTrigger,
  45: } from "@/components/ui/alert-dialog";
  46: import {
  47:   Tooltip,
  48:   TooltipContent,
  49:   TooltipProvider,
  50:   TooltipTrigger,
  51: } from "@/components/ui/tooltip";
  52: import {
  53:   updateProjectCommitAction,
  54:   submitBriefingAction,
  55: } from "./briefing-step3-actions";
  56: 
  57: // ---------------------------------------------------------------------------
  58: // Constants
  59: // ---------------------------------------------------------------------------
  60: 
  61: const BUDGET_OPTIONS = [
  62:   "under_1m",
  63:   "1m_to_5m",
  64:   "5m_to_10m",
  65:   "negotiable",
  66: ] as const;
  67: 
  68: const SESSION_STORAGE_KEY = "briefing_canvas_v3_state";
  69: 
  70: // ---------------------------------------------------------------------------
  71: // Types
  72: // ---------------------------------------------------------------------------
  73: 
  74: type CommitFormData = {
  75:   budget_band: "under_1m" | "1m_to_5m" | "5m_to_10m" | "negotiable" | "";
  76:   target_delivery_at: string;
  77:   meeting_preferred_at: string;
  78:   interested_in_twin: boolean;
  79:   additional_notes: string;
  80: };
  81: 
  82: type AutosaveState = "idle" | "saving" | "saved" | "error";
  83: 
  84: type SummarySnapshot = {
  85:   name: string | null;
  86:   deliverable_types: string[];
  87:   description: string | null;
  88:   briefDocsCount: number;
  89:   refDocsCount: number;
  90:   mood_keywords: string[];
  91:   visual_ratio: string | null;
  92:   channels: string[];
  93:   target_audience: string | null;
  94: };
  95: 
  96: type ProjectRow = {
  97:   title: string | null;
  98:   deliverable_types: string[] | null;
  99:   brief: string | null;
 100:   mood_keywords: string[] | null;
 101:   visual_ratio: string | null;
 102:   channels: string[] | null;
 103:   target_audience: string | null;
 104:   budget_band: string | null;
 105:   target_delivery_at: string | null;
 106:   meeting_preferred_at: string | null;
 107:   interested_in_twin: boolean | null;
 108:   additional_notes: string | null;
 109: };
 110: 
 111: const EMPTY_COMMIT: CommitFormData = {
 112:   budget_band: "",
 113:   target_delivery_at: "",
 114:   meeting_preferred_at: "",
 115:   interested_in_twin: false,
 116:   additional_notes: "",
 117: };
 118: 
 119: function formatSavedAt(iso?: string): string {
 120:   if (!iso) return "";
 121:   const d = new Date(iso);
 122:   return d.toLocaleTimeString("ko-KR", {
 123:     hour: "2-digit",
 124:     minute: "2-digit",
 125:     hour12: false,
 126:   });
 127: }
 128: 
 129: // ---------------------------------------------------------------------------
 130: // Step 3 main component
 131: // ---------------------------------------------------------------------------
 132: 
 133: export function BriefingCanvasStep3({
 134:   projectId,
 135:   onBack,
 136:   onJumpToStep,
 137: }: {
 138:   projectId: string;
 139:   onBack: () => void;
 140:   onJumpToStep: (s: 1 | 2) => void;
 141: }) {
 142:   const t = useTranslations("projects");
 143:   const router = useRouter();
 144:   const [summary, setSummary] = useState<SummarySnapshot | null>(null);
 145:   const [form, setForm] = useState<CommitFormData>(EMPTY_COMMIT);
 146:   const [loading, setLoading] = useState(true);
 147:   const [autosave, setAutosave] = useState<AutosaveState>("idle");
 148:   const [savedAt, setSavedAt] = useState<string | undefined>();
 149:   const [confirmOpen, setConfirmOpen] = useState(false);
 150:   const [submitting, startSubmit] = useTransition();
 151: 
 152:   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 153:   const lastCommittedRef = useRef<string>(JSON.stringify(EMPTY_COMMIT));
 154:   const inFlightRef = useRef(false);
 155:   const pendingRef = useRef<CommitFormData | null>(null);
 156: 
 157:   // Initial fetch: projects row + briefing_documents counts.
 158:   useEffect(() => {
 159:     let cancelled = false;
 160:     (async () => {
 161:       const supabase = createSupabaseBrowser();
 162:       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
 163:       const sb = supabase as any;
 164:       const [projRes, docsRes] = await Promise.all([
 165:         sb
 166:           .from("projects")
 167:           .select(
 168:             "title, deliverable_types, brief, mood_keywords, visual_ratio, channels, target_audience, budget_band, target_delivery_at, meeting_preferred_at, interested_in_twin, additional_notes",
 169:           )
 170:           .eq("id", projectId)
 171:           .maybeSingle(),
 172:         sb
 173:           .from("briefing_documents")
 174:           .select("id, kind")
 175:           .eq("project_id", projectId),
 176:       ]);
 177:       if (cancelled) return;
 178:       const proj = (projRes.data as ProjectRow | null) ?? null;
 179:       const docs = (docsRes.data ?? []) as Array<{
 180:         id: string;
 181:         kind: "brief" | "reference";
 182:       }>;
 183:       const briefCount = docs.filter((d) => d.kind === "brief").length;
 184:       const refCount = docs.filter((d) => d.kind === "reference").length;
 185: 
 186:       setSummary({
 187:         name: proj?.title ?? null,
 188:         deliverable_types: proj?.deliverable_types ?? [],
 189:         description: proj?.brief ?? null,
 190:         briefDocsCount: briefCount,
 191:         refDocsCount: refCount,
 192:         mood_keywords: proj?.mood_keywords ?? [],
 193:         visual_ratio: proj?.visual_ratio ?? null,
 194:         channels: proj?.channels ?? [],
 195:         target_audience: proj?.target_audience ?? null,
 196:       });
 197:       const seed: CommitFormData = {
 198:         budget_band:
 199:           (proj?.budget_band as CommitFormData["budget_band"]) ?? "",
 200:         target_delivery_at: proj?.target_delivery_at
 201:           ? proj.target_delivery_at.slice(0, 10)
 202:           : "",
 203:         meeting_preferred_at: proj?.meeting_preferred_at
 204:           ? proj.meeting_preferred_at.slice(0, 16)
 205:           : "",
 206:         interested_in_twin: proj?.interested_in_twin ?? false,
 207:         additional_notes: proj?.additional_notes ?? "",
 208:       };
 209:       setForm(seed);
 210:       lastCommittedRef.current = JSON.stringify(seed);
 211:       setLoading(false);
 212:     })();
 213:     return () => {
 214:       cancelled = true;
 215:     };
 216:   }, [projectId]);
 217: 
 218:   // Single-flight save runner ??same pattern as Step 2 sidebar.
 219:   const runSave = async (snapshot: CommitFormData): Promise<void> => {
 220:     if (inFlightRef.current) {
 221:       pendingRef.current = snapshot;
 222:       return;
 223:     }
 224:     inFlightRef.current = true;
 225:     try {
 226:       setAutosave("saving");
 227:       const res = await updateProjectCommitAction({
 228:         projectId,
 229:         budget_band: snapshot.budget_band || null,
 230:         target_delivery_at: snapshot.target_delivery_at || null,
 231:         meeting_preferred_at:
 232:           snapshot.meeting_preferred_at && snapshot.meeting_preferred_at !== ""
 233:             ? new Date(snapshot.meeting_preferred_at).toISOString()
 234:             : null,
 235:         interested_in_twin: snapshot.interested_in_twin,
 236:         additional_notes: snapshot.additional_notes || null,
 237:       });
 238:       if (res.ok) {
 239:         lastCommittedRef.current = JSON.stringify(snapshot);
 240:         setAutosave("saved");
 241:         setSavedAt(res.savedAt);
 242:       } else {
 243:         setAutosave("error");
 244:       }
 245:     } finally {
 246:       inFlightRef.current = false;
 247:       const next = pendingRef.current;
 248:       if (next) {
 249:         pendingRef.current = null;
 250:         void runSave(next);
 251:       }
 252:     }
 253:   };
 254: 
 255:   // 5s debounced autosave on form changes.
 256:   useEffect(() => {
 257:     if (loading) return;
 258:     const serialized = JSON.stringify(form);
 259:     if (serialized === lastCommittedRef.current) return;
 260:     if (debounceRef.current) clearTimeout(debounceRef.current);
 261:     debounceRef.current = setTimeout(() => {
 262:       void runSave(form);
 263:     }, 5_000);
 264:     return () => {
 265:       if (debounceRef.current) clearTimeout(debounceRef.current);
 266:     };
 267:     // eslint-disable-next-line react-hooks/exhaustive-deps -- runSave is stable via refs
 268:   }, [form, projectId, loading]);
 269: 
 270:   const set = <K extends keyof CommitFormData>(
 271:     key: K,
 272:     value: CommitFormData[K],
 273:   ) => setForm((f) => ({ ...f, [key]: value }));
 274: 
 275:   // Submit handler ??flush any pending autosave first, then atomic status flip.
 276:   const handleSubmit = () => {
 277:     setConfirmOpen(false);
 278:     startSubmit(async () => {
 279:       // Cancel pending debounce + force-save any uncommitted delta. The
 280:       // submit UPDATE's WHERE status='draft' would also catch a stale
 281:       // commit-write that lands after the flip, but flushing first means
 282:       // every keystroke up to "?섎ː?섍린" is persisted before the status
 283:       // transition.
 284:       if (debounceRef.current) clearTimeout(debounceRef.current);
 285:       const serialized = JSON.stringify(form);
 286:       if (serialized !== lastCommittedRef.current) {
 287:         await runSave(form);
 288:       }
 289:       // Drain any queued save.
 290:       while (inFlightRef.current) {
 291:         await new Promise((r) => setTimeout(r, 50));
 292:       }
 293: 
 294:       const result = await submitBriefingAction({ projectId });
 295:       if (!result.ok) {
 296:         const key =
 297:           result.error === "unauthenticated"
 298:             ? "briefing.step3.toast.submit_unauthorized"
 299:             : result.error === "wrong_status"
 300:               ? "briefing.step3.toast.submit_wrong_status"
 301:               : "briefing.step3.toast.submit_failed";
 302:         toast.error(t(key));
 303:         return;
 304:       }
 305:       try {
 306:         window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
 307:       } catch {
 308:         // sessionStorage failure shouldn't block the redirect
 309:       }
 310:       toast.success(t("briefing.step3.toast.submit_success"));
 311:       router.push("/app/projects");
 312:     });
 313:   };
 314: 
 315:   if (loading || !summary) {
 316:     return (
 317:       <div className="min-h-dvh flex items-center justify-center">
 318:         <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
 319:       </div>
 320:     );
 321:   }
 322: 
 323:   const labelDeliverable = (k: string) =>
 324:     t(
 325:       `briefing.step1.field.deliverable_types.options.${k}` as Parameters<
 326:         typeof t
 327:       >[0],
 328:     );
 329:   const labelMood = (k: string) =>
 330:     t(
 331:       `briefing.step2.sections.detail.mood.options.${k}` as Parameters<
 332:         typeof t
 333:       >[0],
 334:     );
 335:   const labelVisualRatio = (k: string) =>
 336:     t(
 337:       `briefing.step2.sections.detail.visual_ratio.options.${k}` as Parameters<
 338:         typeof t
 339:       >[0],
 340:     );
 560:               {t("briefing.step3.notes.label")}
 561:             </Label>
 562:             <Textarea
 563:               value={form.additional_notes}
 564:               onChange={(e) => set("additional_notes", e.target.value)}
 565:               placeholder={t("briefing.step3.notes.placeholder")}
 566:               rows={4}
 567:               className="resize-none text-sm"
 568:             />
 569:           </section>
 570:         </div>
 571: 
 572:         {/* Sticky bottom CTA */}
 573:         <div className="fixed bottom-0 left-0 right-0 md:left-[240px] border-t border-border/40 bg-background/95 backdrop-blur-md">
 574:           <div className="max-w-3xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between gap-3">
 575:             <Button
 576:               type="button"
 577:               variant="ghost"
 578:               size="sm"
 579:               onClick={onBack}
 580:               className="text-sm"
 581:             >
 582:               {t("briefing.step3.cta.back")}
 583:             </Button>
 584:             <div className="text-xs text-muted-foreground keep-all flex items-center gap-2">
 585:               {autosave === "saving" && (
 586:                 <>
 587:                   <Loader2 className="w-3 h-3 animate-spin" />
 588:                   <span>{t("briefing.step3.autosave.saving")}</span>
 589:                 </>
 590:               )}
 591:               {autosave === "saved" && (
 592:                 <span className="text-emerald-600">
 593:                   {t("briefing.step3.autosave.saved_at", {
 594:                     time: formatSavedAt(savedAt),
 595:                   })}
 596:                 </span>
 597:               )}
 598:               {autosave === "error" && (
 599:                 <span className="text-destructive">
 600:                   {t("briefing.step3.autosave.error")}
 601:                 </span>
 602:               )}
 603:             </div>
 604:             <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
 605:               <AlertDialogTrigger asChild>
 606:                 <Button
 607:                   type="button"
 608:                   size="sm"
 609:                   disabled={submitting}
 610:                   className="text-sm rounded-full px-6"
 611:                 >
 612:                   {submitting ? (
 613:                     <Loader2 className="w-4 h-4 animate-spin" />
 614:                   ) : (
 615:                     t("briefing.step3.cta.submit")
 616:                   )}
 617:                 </Button>
 618:               </AlertDialogTrigger>
 619:               <AlertDialogContent>
 620:                 <AlertDialogHeader>
 621:                   <AlertDialogTitle>
 622:                     {t("briefing.step3.confirm.title")}
 623:                   </AlertDialogTitle>
 624:                   <AlertDialogDescription className="keep-all leading-relaxed">
 625:                     {t("briefing.step3.confirm.body")}
 626:                   </AlertDialogDescription>
 627:                 </AlertDialogHeader>
 628:                 <AlertDialogFooter>
 629:                   <AlertDialogCancel>
 630:                     {t("briefing.step3.confirm.cancel")}
 631:                   </AlertDialogCancel>
 632:                   <AlertDialogAction onClick={handleSubmit}>
 633:                     {t("briefing.step3.confirm.proceed")}
 634:                   </AlertDialogAction>
 635:                 </AlertDialogFooter>
 636:               </AlertDialogContent>
 637:             </AlertDialog>
 638:           </div>
 639:         </div>
 640:       </div>
 641:     </TooltipProvider>
 642:   );
 643: }
 644: 
 645: // ---------------------------------------------------------------------------
 646: // Subcomponents
 647: // ---------------------------------------------------------------------------
 648: 
 649: function SummaryRow({
 650:   label,

 succeeded in 550ms:
  90: ] as const;
  91: 
  92: // ---------------------------------------------------------------------------
  93: // Form state shape ??4 fields after hotfix-5. The remaining DB columns
  94: // (has_plan, additional_notes, budget_band, target_delivery_at,
  95: // meeting_preferred_at, interested_in_twin) ship in Step 3.
  96: // ---------------------------------------------------------------------------
  97: 
  98: export type SidebarFormData = {
  99:   mood_keywords: string[];
 100:   mood_keywords_free: string;
 101:   visual_ratio: string;
 102:   visual_ratio_custom: string;
 103:   channels: string[];
 104:   target_audience: string;
 105: };
 106: 
 107: export type AutosaveState = "idle" | "saving" | "saved" | "error";
 108: 
 109: // ---------------------------------------------------------------------------
 110: // Multi-select chip
 111: // ---------------------------------------------------------------------------
 112: 
 113: function ChipMulti({
 114:   options,
 115:   value,
 116:   onChange,
 117:   labelOf,
 118: }: {
 119:   options: readonly string[];
 120:   value: string[];
 121:   onChange: (next: string[]) => void;
 122:   labelOf: (opt: string) => string;
 123: }) {
 124:   return (
 125:     <div className="flex flex-wrap gap-1.5">
 250:       // 6 (has_plan, additional_notes, budget_band, target_delivery_at,
 251:       // meeting_preferred_at, interested_in_twin). The action's metadata
 252:       // schema treats every field as optional / partial-update safe, so
 253:       // omitting them here leaves their stored values untouched.
 254:       const res = await updateProjectMetadataAction({
 255:         projectId,
 256:         mood_keywords: snapshot.mood_keywords,
 257:         mood_keywords_free: snapshot.mood_keywords_free || null,
 258:         visual_ratio: snapshot.visual_ratio || null,
 259:         visual_ratio_custom: snapshot.visual_ratio_custom || null,
 260:         channels: snapshot.channels,
 261:         target_audience: snapshot.target_audience || null,
 262:       });
 263:       if (res.ok) {
 264:         lastCommittedRef.current = JSON.stringify(snapshot);
 265:         onAutosaveStateRef.current("saved", res.savedAt);
 266:       } else {
 267:         onAutosaveStateRef.current("error");
 268:       }
 269:     } finally {
 270:       inFlightRef.current = false;
 271:       const next = pendingRef.current;
 272:       if (next) {
 273:         pendingRef.current = null;
 274:         void runSave(next);
 275:       }
 276:     }
 277:   };
 278: 
 279:   // Autosave: 5s debounce after each form change. Skip if value matches
 280:   // the last successful commit (prevents idle re-saves).
 281:   useEffect(() => {
 282:     const serialized = JSON.stringify(form);
 283:     if (serialized === lastCommittedRef.current) return;
 284: 
 285:     if (debounceRef.current) clearTimeout(debounceRef.current);
 300:   ) => setForm((f) => ({ ...f, [key]: value }));
 301: 
 302:   return (
 303:     <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-8">
 304:       <header>
 305:         <h2 className="text-base font-semibold tracking-tight keep-all">
 306:           {t("briefing.step2.sections.detail.title")}
 307:         </h2>
 308:       </header>
 309: 
 310:       {/* Internal 2-col form grid (full-width row). Mood / channels /
 311:           textareas span single cells; the divider span the full row. */}
 312:       <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
 313:         <FieldBlock
 314:           title={t("briefing.step2.sections.detail.mood.label")}
 315:           helper={t("briefing.step2.sections.detail.mood.helper")}
 316:         >
 317:           <ChipMulti
 318:             options={MOOD_OPTIONS}
 319:             value={form.mood_keywords}
 320:             onChange={(v) => set("mood_keywords", v)}
 321:             labelOf={(k) =>
 322:               t(
 323:                 `briefing.step2.sections.detail.mood.options.${k}` as Parameters<
 324:                   typeof t
 325:                 >[0],
 326:               )
 327:             }
 328:           />
 329:           <Input
 330:             value={form.mood_keywords_free}
 331:             onChange={(e) => set("mood_keywords_free", e.target.value)}
 332:             placeholder={t(
 333:               "briefing.step2.sections.detail.mood.free_input_placeholder",
 334:             )}
 335:             className="text-sm"
 336:           />
 337:         </FieldBlock>
 338: 
 339:         <FieldBlock
 340:           title={t("briefing.step2.sections.detail.visual_ratio.label")}
 341:         >
 342:           <ChipSingle
 343:             options={VISUAL_RATIO_OPTIONS}
 344:             value={form.visual_ratio}
 345:             onChange={(v) => set("visual_ratio", v)}
 346:             labelOf={(k) =>
 347:               t(
 348:                 `briefing.step2.sections.detail.visual_ratio.options.${k}` as Parameters<
 349:                   typeof t
 350:                 >[0],
 351:               )
 352:             }
 353:           />
 354:           {form.visual_ratio === "custom" && (
 355:             <Input
 356:               value={form.visual_ratio_custom}
 357:               onChange={(e) => set("visual_ratio_custom", e.target.value)}
 358:               placeholder={t(
 359:                 "briefing.step2.sections.detail.visual_ratio.custom_placeholder",
 360:               )}
 361:               className="text-sm max-w-xs"
 362:             />
 363:           )}
 364:         </FieldBlock>
 365: 
 366:         <FieldBlock
 367:           title={t("briefing.step2.sections.detail.channels.label")}
 368:           helper={t("briefing.step2.sections.detail.channels.helper")}
 369:         >
 370:           <ChipMulti
 371:             options={CHANNEL_OPTIONS}
 372:             value={form.channels}
 373:             onChange={(v) => set("channels", v)}
 374:             labelOf={(k) =>
 375:               t(
 376:                 `briefing.step2.sections.detail.channels.options.${k}` as Parameters<
 377:                   typeof t
 378:                 >[0],
 379:               )
 380:             }
 381:           />
 382:         </FieldBlock>
 383: 
 384:         <FieldBlock title={t("briefing.step2.sections.detail.target.label")}>
 385:           <Textarea
 386:             value={form.target_audience}
 387:             onChange={(e) => set("target_audience", e.target.value)}
 388:             placeholder={t(
 389:               "briefing.step2.sections.detail.target.placeholder",
 390:             )}
 391:             rows={3}
 392:             className="resize-none text-sm"
 393:           />
 394:         </FieldBlock>
 395:       </div>
 396:     </section>
 397:   );
 398: }

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx' | ForEach-Object { "'$i++; if ($i -ge 340 -and $i -le 560) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx' | ForEach-Object { "'$i++; if ($i -ge 45 -and $i -le 175) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-canvas.tsx' | ForEach-Object { "'$i++; if ($i -ge 210 -and $i -le 235) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 534ms:
 340:     );
 341:   const labelChannel = (k: string) =>
 342:     t(
 343:       `briefing.step2.sections.detail.channels.options.${k}` as Parameters<
 344:         typeof t
 345:       >[0],
 346:     );
 347: 
 348:   return (
 349:     <TooltipProvider>
 350:       <div className="pb-32">
 351:         {/* Header */}
 352:         <div className="max-w-3xl mx-auto px-6 lg:px-12 pt-12 pb-8">
 353:           <p className="text-xs font-semibold tracking-[0.18em] text-foreground/40 mb-3">
 354:             {t("briefing.step3.header.eyebrow")}
 355:           </p>
 356:           <h1 className="font-display text-3xl tracking-tight mb-3 keep-all">
 357:             {t("briefing.step3.header.title")}
 358:           </h1>
 359:           <p className="text-sm text-muted-foreground leading-relaxed keep-all max-w-2xl">
 360:             {t("briefing.step3.header.subtitle")}
 361:           </p>
 362:         </div>
 363: 
 364:         <div className="max-w-3xl mx-auto px-6 lg:px-12 flex flex-col gap-6">
 365:           {/* Summary card */}
 366:           <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-5">
 367:             <h2 className="text-base font-semibold tracking-tight keep-all">
 368:               {t("briefing.step3.summary.title")}
 369:             </h2>
 370: 
 371:             <SummaryRow
 372:               label={t("briefing.step3.summary.project_name")}
 373:               value={
 374:                 summary.name ?? t("briefing.step3.summary.empty_placeholder")
 375:               }
 376:             />
 377:             <SummaryRow
 378:               label={t("briefing.step3.summary.deliverable_types")}
 379:               value={
 380:                 summary.deliverable_types.length === 0
 381:                   ? t("briefing.step3.summary.empty_placeholder")
 382:                   : summary.deliverable_types.map(labelDeliverable).join(", ")
 383:               }
 384:             />
 385:             {summary.description && (
 386:               <SummaryRow
 387:                 label={t("briefing.step3.summary.description")}
 388:                 value={summary.description}
 389:               />
 390:             )}
 391:             <SummaryRow
 392:               label={`${t("briefing.step3.summary.documents_brief", { count: summary.briefDocsCount })} 쨌 ${t("briefing.step3.summary.documents_reference", { count: summary.refDocsCount })}`}
 393:               value=""
 394:               labelOnly
 395:             />
 396:             {summary.mood_keywords.length > 0 && (
 397:               <SummaryRow
 398:                 label={t("briefing.step3.summary.mood")}
 399:                 value={summary.mood_keywords.map(labelMood).join(", ")}
 400:               />
 401:             )}
 402:             {summary.visual_ratio && (
 403:               <SummaryRow
 404:                 label={t("briefing.step3.summary.visual_ratio")}
 405:                 value={
 406:                   summary.visual_ratio === "custom"
 407:                     ? summary.visual_ratio
 408:                     : labelVisualRatio(summary.visual_ratio)
 409:                 }
 410:               />
 411:             )}
 412:             {summary.channels.length > 0 && (
 413:               <SummaryRow
 414:                 label={t("briefing.step3.summary.channels")}
 415:                 value={summary.channels.map(labelChannel).join(", ")}
 416:               />
 417:             )}
 418:             {summary.target_audience && (
 419:               <SummaryRow
 420:                 label={t("briefing.step3.summary.target_audience")}
 421:                 value={summary.target_audience}
 422:               />
 423:             )}
 424: 
 425:             <div className="flex justify-end gap-4 border-t border-border/40 mt-3 pt-3">
 426:               <button
 427:                 type="button"
 428:                 onClick={() => onJumpToStep(1)}
 429:                 className="text-xs text-muted-foreground underline-offset-4 hover:underline transition-colors"
 430:               >
 431:                 {t("briefing.step3.summary.edit_step1")}
 432:               </button>
 433:               <button
 434:                 type="button"
 435:                 onClick={() => onJumpToStep(2)}
 436:                 className="text-xs text-muted-foreground underline-offset-4 hover:underline transition-colors"
 437:               >
 438:                 {t("briefing.step3.summary.edit_step2")}
 439:               </button>
 440:             </div>
 441:           </section>
 442: 
 443:           {/* Commit form (2x2 grid) */}
 444:           <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-8">
 445:             <h2 className="text-base font-semibold tracking-tight keep-all">
 446:               {t("briefing.step3.commit.title")}
 447:             </h2>
 448: 
 449:             <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
 450:               <FieldBlock title={t("briefing.step3.commit.budget.label")}>
 451:                 <div className="flex flex-wrap gap-1.5">
 452:                   {BUDGET_OPTIONS.map((opt) => {
 453:                     const selected = form.budget_band === opt;
 454:                     return (
 455:                       <button
 456:                         key={opt}
 457:                         type="button"
 458:                         onClick={() =>
 459:                           set(
 460:                             "budget_band",
 461:                             selected
 462:                               ? ""
 463:                               : (opt as CommitFormData["budget_band"]),
 464:                           )
 465:                         }
 466:                         aria-pressed={selected}
 467:                         className={cn(
 468:                           "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
 469:                           selected
 470:                             ? "bg-foreground text-background"
 471:                             : "border border-border/60 hover:border-border",
 472:                         )}
 473:                       >
 474:                         {t(
 475:                           `briefing.step3.commit.budget.options.${opt}` as Parameters<
 476:                             typeof t
 477:                           >[0],
 478:                         )}
 479:                       </button>
 480:                     );
 481:                   })}
 482:                 </div>
 483:               </FieldBlock>
 484: 
 485:               <FieldBlock title={t("briefing.step3.commit.delivery.label")}>
 486:                 <Input
 487:                   type="date"
 488:                   value={form.target_delivery_at}
 489:                   onChange={(e) => set("target_delivery_at", e.target.value)}
 490:                   className="text-sm max-w-xs"
 491:                 />
 492:               </FieldBlock>
 493: 
 494:               <FieldBlock
 495:                 title={t("briefing.step3.commit.meeting.label")}
 496:                 helper={t("briefing.step3.commit.meeting.helper")}
 497:               >
 498:                 <Input
 499:                   type="datetime-local"
 500:                   value={form.meeting_preferred_at}
 501:                   onChange={(e) => set("meeting_preferred_at", e.target.value)}
 502:                   className="text-sm max-w-xs"
 503:                 />
 504:               </FieldBlock>
 505: 
 506:               <div
 507:                 className={cn(
 508:                   "rounded-2xl p-4 flex items-start gap-3 self-start",
 509:                   form.interested_in_twin
 510:                     ? "bg-emerald-50 border border-emerald-200"
 511:                     : "border border-border/40",
 512:                 )}
 513:               >
 514:                 <input
 515:                   type="checkbox"
 516:                   id="twin-toggle"
 517:                   checked={form.interested_in_twin}
 518:                   onChange={(e) => set("interested_in_twin", e.target.checked)}
 519:                   className="mt-1"
 520:                 />
 521:                 <div className="flex flex-col gap-1 min-w-0">
 522:                   <div className="flex items-center gap-1.5">
 523:                     <Label
 524:                       htmlFor="twin-toggle"
 525:                       className="text-sm font-semibold cursor-pointer keep-all"
 526:                     >
 527:                       {t("briefing.step3.commit.twin.label")}
 528:                     </Label>
 529:                     <Tooltip>
 530:                       <TooltipTrigger asChild>
 531:                         <button
 532:                           type="button"
 533:                           aria-label={t(
 534:                             "briefing.step3.commit.twin.tooltip_aria",
 535:                           )}
 536:                           className="text-muted-foreground hover:text-foreground transition-colors"
 537:                         >
 538:                           <HelpCircle className="w-3.5 h-3.5" />
 539:                         </button>
 540:                       </TooltipTrigger>
 541:                       <TooltipContent
 542:                         side="top"
 543:                         className="max-w-xs whitespace-pre-line text-xs leading-relaxed"
 544:                       >
 545:                         {t("briefing.step3.commit.twin.tooltip")}
 546:                       </TooltipContent>
 547:                     </Tooltip>
 548:                   </div>
 549:                   <p className="text-xs text-muted-foreground keep-all leading-relaxed">
 550:                     {t("briefing.step3.commit.twin.helper")}
 551:                   </p>
 552:                 </div>
 553:               </div>
 554:             </div>
 555:           </section>
 556: 
 557:           {/* Final notes */}
 558:           <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-4">
 559:             <Label className="text-sm font-semibold tracking-tight keep-all">
 560:               {t("briefing.step3.notes.label")}

 succeeded in 539ms:
 210:           />
 211:         )}
 212:         {stage === 2 && !projectId && (
 213:           <StagePlaceholder
 214:             stepLabel={t("briefing.step2.placeholder.eyebrow")}
 215:             title={t("briefing.step2.placeholder.title_no_project")}
 216:             description={t("briefing.step2.placeholder.description_no_project")}
 217:             onBack={() => handleBackFromStage(1)}
 218:             backLabel={t("briefing.step2.placeholder.back")}
 219:           />
 220:         )}
 221:         {stage === 3 && projectId && (
 222:           <BriefingCanvasStep3
 223:             projectId={projectId}
 224:             onBack={() => handleBackFromStage(2)}
 225:             onJumpToStep={(s) => handleBackFromStage(s)}
 226:           />
 227:         )}
 228:         {stage === 3 && !projectId && (
 229:           <StagePlaceholder
 230:             stepLabel={t("briefing.step3.placeholder.eyebrow")}
 231:             title={t("briefing.step3.placeholder.title")}
 232:             description={t("briefing.step3.placeholder.description")}
 233:             onBack={() => handleBackFromStage(2)}
 234:             backLabel={t("briefing.step3.placeholder.back")}
 235:           />

 succeeded in 560ms:
  45:   mood_keywords_free: string | null;
  46:   visual_ratio: string | null;
  47:   visual_ratio_custom: string | null;
  48:   channels: string[] | null;
  49:   target_audience: string | null;
  50: };
  51: 
  52: const EMPTY_SIDEBAR: SidebarFormData = {
  53:   mood_keywords: [],
  54:   mood_keywords_free: "",
  55:   visual_ratio: "",
  56:   visual_ratio_custom: "",
  57:   channels: [],
  58:   target_audience: "",
  59: };
  60: 
  61: function formatSavedAt(iso?: string): string {
  62:   if (!iso) return "";
  63:   const d = new Date(iso);
  64:   return d.toLocaleTimeString("ko-KR", {
  65:     hour: "2-digit",
  66:     minute: "2-digit",
  67:     hour12: false,
  68:   });
  69: }
  70: 
  71: export function BriefingCanvasStep2({
  72:   projectId,
  73:   onBack,
  74:   onNext,
  75: }: {
  76:   projectId: string;
  77:   onBack: () => void;
  78:   onNext: () => void;
  79: }) {
  80:   const t = useTranslations("projects");
  81:   const [briefDocs, setBriefDocs] = useState<BriefDoc[]>([]);
  82:   const [refDocs, setRefDocs] = useState<ReferenceDoc[]>([]);
  83:   const [sidebarInitial, setSidebarInitial] = useState<SidebarFormData | null>(
  84:     null,
  85:   );
  86:   const [loading, setLoading] = useState(true);
  87:   const [autosave, setAutosave] = useState<AutosaveState>("idle");
  88:   const [savedAt, setSavedAt] = useState<string | undefined>(undefined);
  89: 
  90:   // Initial fetch of briefing_documents + projects metadata.
  91:   useEffect(() => {
  92:     let cancelled = false;
  93:     (async () => {
  94:       const supabase = createSupabaseBrowser();
  95:       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  96:       const sb = supabase as any;
  97:       const [docsRes, projRes] = await Promise.all([
  98:         sb
  99:           .from("briefing_documents")
 100:           .select(
 101:             "id, kind, source_type, storage_key, filename, size_bytes, mime_type, url, provider, thumbnail_url, oembed_html, note, category, created_at",
 102:           )
 103:           .eq("project_id", projectId)
 104:           .order("created_at", { ascending: true }),
 105:         sb
 106:           .from("projects")
 107:           .select(
 108:             "mood_keywords, mood_keywords_free, visual_ratio, visual_ratio_custom, channels, target_audience",
 109:           )
 110:           .eq("id", projectId)
 111:           .maybeSingle(),
 112:       ]);
 113:       if (cancelled) return;
 114:       const docs = (docsRes.data ?? []) as Array<{
 115:         id: string;
 116:         kind: "brief" | "reference";
 117:         source_type: "upload" | "url";
 118:         storage_key: string | null;
 119:         filename: string | null;
 120:         size_bytes: number | null;
 121:         url: string | null;
 122:         provider: string | null;
 123:         thumbnail_url: string | null;
 124:         note: string | null;
 125:         category: string | null;
 126:       }>;
 127:       setBriefDocs(
 128:         docs
 129:           .filter((d) => d.kind === "brief")
 130:           .map((d) => ({
 131:             id: d.id,
 132:             source_type: d.source_type,
 133:             storage_key: d.storage_key,
 134:             filename: d.filename,
 135:             url: d.url,
 136:             size_bytes: d.size_bytes,
 137:           })),
 138:       );
 139:       setRefDocs(
 140:         docs
 141:           .filter((d) => d.kind === "reference")
 142:           .map((d) => ({
 143:             id: d.id,
 144:             url: d.url,
 145:             provider: d.provider,
 146:             thumbnail_url: d.thumbnail_url,
 147:             note: d.note,
 148:             category: d.category,
 149:           })),
 150:       );
 151:       const meta = (projRes.data as ProjectMetadata | null) ?? null;
 152:       setSidebarInitial({
 153:         ...EMPTY_SIDEBAR,
 154:         mood_keywords: meta?.mood_keywords ?? [],
 155:         mood_keywords_free: meta?.mood_keywords_free ?? "",
 156:         visual_ratio: meta?.visual_ratio ?? "",
 157:         visual_ratio_custom: meta?.visual_ratio_custom ?? "",
 158:         channels: meta?.channels ?? [],
 159:         target_audience: meta?.target_audience ?? "",
 160:       });
 161:       setLoading(false);
 162:     })();
 163:     return () => {
 164:       cancelled = true;
 165:     };
 166:   }, [projectId]);
 167: 
 168:   if (loading || !sidebarInitial) {
 169:     return (
 170:       <div className="min-h-dvh flex items-center justify-center">
 171:         <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
 172:       </div>
 173:     );
 174:   }
 175: 

codex
One concrete race is visible in the Step 3 client: the commit inputs remain editable while `submitting` is true, so a post-confirm edit can be queued after the submit flush snapshot. I’m checking whether that rises to a blocking finding under the pass rules and whether there are any server-side correctness issues beyond UX/data freshness.
codex
## VERDICT: NEEDS-ATTENTION

[FINDING 1] MED: `src/app/[locale]/app/projects/new/briefing-step3-actions.ts:204` — Cross-tab already-submitted path often returns `forbidden`, not `wrong_status`. `assertProjectMutationAuth` rejects non-draft before `submitBriefingAction` reaches the atomic `UPDATE ... status='draft' RETURNING id`, so a second tab submitting after the first commit sees generic failure instead of `wrong_status`. Recommended fix: for submit, allow auth to pass creator/workspace checks without pre-rejecting non-draft, then let the guarded UPDATE map 0-row to `wrong_status`, or explicitly translate the helper’s non-draft rejection to `wrong_status`.

[FINDING 2] MED: `src/app/[locale]/app/projects/new/briefing-step3-actions.ts:161` — `updateProjectCommitAction` can report `ok: true` on a 0-row UPDATE after a status flip. The `.eq("status", "draft")` guard prevents the write, but without `.select("id").maybeSingle()` the action cannot distinguish “updated” from “matched no rows,” so the client can mark unsaved commit fields as saved. Recommended fix: request the updated id and return `forbidden` or `wrong_status` when no row is returned.

[FINDING 3] MED: `src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:455` — Commit fields remain editable while `submitting` is true, so edits made after the submit snapshot but before the status flip can be queued behind the flush and then dropped/reported saved incorrectly once the project is `in_review`. Recommended fix: disable Step 3 inputs, chip buttons, checkbox, edit-step links, back button, and dialog controls while submitting, or add a one-shot submitted/submitting guard that freezes the form before flushing.

Run log summary: Step 3 submit atomic UPDATE is solid, but pre-submit status rejection plus autosave 0-row success handling leave cross-tab and late-keystroke paths needing a small inline fix before Wave C.
tokens used
36,457
## VERDICT: NEEDS-ATTENTION

[FINDING 1] MED: `src/app/[locale]/app/projects/new/briefing-step3-actions.ts:204` — Cross-tab already-submitted path often returns `forbidden`, not `wrong_status`. `assertProjectMutationAuth` rejects non-draft before `submitBriefingAction` reaches the atomic `UPDATE ... status='draft' RETURNING id`, so a second tab submitting after the first commit sees generic failure instead of `wrong_status`. Recommended fix: for submit, allow auth to pass creator/workspace checks without pre-rejecting non-draft, then let the guarded UPDATE map 0-row to `wrong_status`, or explicitly translate the helper’s non-draft rejection to `wrong_status`.

[FINDING 2] MED: `src/app/[locale]/app/projects/new/briefing-step3-actions.ts:161` — `updateProjectCommitAction` can report `ok: true` on a 0-row UPDATE after a status flip. The `.eq("status", "draft")` guard prevents the write, but without `.select("id").maybeSingle()` the action cannot distinguish “updated” from “matched no rows,” so the client can mark unsaved commit fields as saved. Recommended fix: request the updated id and return `forbidden` or `wrong_status` when no row is returned.

[FINDING 3] MED: `src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:455` — Commit fields remain editable while `submitting` is true, so edits made after the submit snapshot but before the status flip can be queued behind the flush and then dropped/reported saved incorrectly once the project is `in_review`. Recommended fix: disable Step 3 inputs, chip buttons, checkbox, edit-step links, back button, and dialog controls while submitting, or add a one-shot submitted/submitting guard that freezes the form before flushing.

Run log summary: Step 3 submit atomic UPDATE is solid, but pre-submit status rejection plus autosave 0-row success handling leave cross-tab and late-keystroke paths needing a small inline fix before Wave C.

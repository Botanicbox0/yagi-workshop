Reading prompt from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: low
reasoning summaries: none
session id: 019df27f-c4a0-7ca0-b770-68ac1663879b
--------
user
Phase 5 Wave B task_06 v3 sub_2 patch — K-05 Tier 3 low LOOP 2. Narrow verify of LOOP 1 finding closures only.

LOOP 1 was NEEDS-ATTENTION with 3 MED findings:

- F1 MED: submitBriefingAction's cross-tab "already submitted" path returned generic forbidden via assertProjectMutationAuth's pre-reject of non-draft, instead of the explicit wrong_status the toast layer expects.
- F2 MED: updateProjectCommitAction returned ok:true on a 0-row UPDATE after a status flip — the .eq('status','draft') guard prevented the write but the action couldn't tell, so the autosave indicator showed "saved" when nothing was saved.
- F3 MED: Step 3 form inputs remained editable while submitting=true, so edits between [의뢰하기 →] and the status flip would queue behind the flush and silently drop after status='in_review'.

Files in scope (2 total — verify only):

- src/app/[locale]/app/projects/new/briefing-step3-actions.ts
  • F1: submitBriefingAction no longer calls assertProjectMutationAuth. Inline auth flow: getUser → resolveActiveWorkspace → SELECT id, status, created_by → if (!project || created_by !== user.id) return not_owner → if (status !== 'draft') return wrong_status → atomic UPDATE WHERE status='draft' AND created_by=user.id → if no row return wrong_status → revalidatePath. SubmitBriefingResult error union: 'validation' | 'unauthenticated' | 'no_workspace' | 'not_owner' | 'wrong_status' | 'db' (dropped 'not_found' + 'forbidden').
  • F2: updateProjectCommitAction's UPDATE chain now ends with `.select('id')`. Result type adds 'wrong_status'. If updatedRows is empty, returns wrong_status. The action still uses assertProjectMutationAuth for pre-check (cross-tab where status is already in_review at SELECT time → forbidden, that's fine — the F2 case is the race window where status was draft at the SELECT but flips before UPDATE).

- src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx
  • F3: <fieldset disabled={submitting || autosave === "stale"} className="contents"> wraps both the commit form section and the final-notes section. className="contents" so layout is unchanged; disabled propagates to all input/button/textarea descendants and blocks IME composition + chip clicks.
  • F2 client side: staleRef + new "stale" autosave state. When updateProjectCommitAction returns wrong_status, runSave sets staleRef.current=true, clears pendingRef, sets autosave="stale". Subsequent runSave invocations early-return on staleRef. New i18n key briefing.step3.autosave.stale ("이미 의뢰된 프로젝트" / "Already submitted") rendered in amber-600 in the sticky CTA bar.
  • Pending autosave flush in handleSubmit unchanged (already correct in LOOP 1 review): clearTimeout debounceRef → if dirty await runSave(form) → drain inFlightRef → submitBriefingAction → on success clear sessionStorage + redirect.

Out of scope (do NOT review): briefing-canvas-step-2-sidebar.tsx, briefing-canvas-step-2.tsx, briefing-canvas.tsx, briefing-step2-actions.ts, briefing-actions.ts, briefing-canvas-step-1.tsx, all i18n keys (data-only verify), all migrations.

LOOP 2 verify only:

1. F1 closure — confirm submitBriefingAction does NOT call assertProjectMutationAuth; confirm the inline auth flow returns not_owner on missing-row OR creator-mismatch and wrong_status on non-draft; confirm the atomic UPDATE WHERE status='draft' is still present as the race net; confirm 0-row UPDATE result returns wrong_status; confirm SubmitBriefingResult type union accurately reflects the new returns; confirm the client toast switch in briefing-canvas-step-3.tsx handles wrong_status correctly (it was already handling wrong_status before LOOP 1 — verify it still routes to submit_wrong_status).

2. F2 closure — confirm updateProjectCommitAction's UPDATE includes `.select('id')` and returns wrong_status when updatedRows is empty; confirm UpdateProjectCommitResult adds 'wrong_status'; confirm runSave sets staleRef + autosave="stale" on wrong_status; confirm the autosave UI renders the new stale state with the new i18n key.

3. F3 closure — confirm the fieldset wraps both the commit form section AND the final-notes section (not just one); confirm className="contents" preserves the existing flex layout; confirm `disabled={submitting || autosave === "stale"}` triggers on both submit-in-flight and post-stale. Note: the [← 이전] back button + AlertDialog cancel/proceed buttons are intentionally outside the fieldset (yagi spec narrows scope to "조건 form + notes textarea") — verify this is the case.

Already-deferred (do NOT flag again):
- FU-Phase5-3 / FU-Phase5-4 (sub_5 carry-overs)
- assertProjectMutationAuth duplication between briefing-step2-actions and briefing-step3-actions (LOOP 1 already noted as intentional divergence)
- has_plan / projects.purpose column drops (yagi opted to keep)

Scale-aware rule reminder: Phase 5 < 100 user, all-trusted. MED-B/C 3 conditions check before fix vs FU.

Output format:

## VERDICT: <CLEAN | NEEDS-ATTENTION | PARTIAL>

CLEAN = all 3 LOOP 1 findings (F1 / F2 / F3) closed by sub_2; no NEW HIGH/MED introduced.

PARTIAL = some closure but a residual gap on the same axis (single-line miss → Builder closes inline + commits without LOOP 3).

NEEDS-ATTENTION = a closure regressed OR a new HIGH/MED introduced → STOP + escalate.

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

End with one-line summary suitable for the run log.

codex
I’ll verify only the two scoped files against the LOOP 1 closure criteria and avoid reviewing the deferred or out-of-scope areas. I’m going to read the relevant action and component code with line numbers, then report only residual/new HIGH/MED issues if any.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/app/[locale]/app/projects/new/briefing-step3-actions.ts'; Get-Content -LiteralPath "'$p | ForEach-Object -Begin {$i=1} -Process { '"'{0,5}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx'; Get-Content -LiteralPath "'$p | ForEach-Object -Begin {$i=1} -Process { '"'{0,5}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 379ms:
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
  127:         | "wrong_status"
  128:         | "db";
  129:       message?: string;
  130:     };
  131: 
  132: export async function updateProjectCommitAction(
  133:   input: unknown,
  134: ): Promise<UpdateProjectCommitResult> {
  135:   const parsed = commitInput.safeParse(input);
  136:   if (!parsed.success) {
  137:     return { ok: false, error: "validation", message: parsed.error.message };
  138:   }
  139:   const auth = await assertProjectMutationAuth(parsed.data.projectId);
  140:   if (!auth.ok) return auth;
  141: 
  142:   const payload: Record<string, unknown> = {};
  143:   const fields = [
  144:     "budget_band",
  145:     "target_delivery_at",
  146:     "meeting_preferred_at",
  147:     "interested_in_twin",
  148:     "additional_notes",
  149:   ] as const;
  150:   for (const f of fields) {
  151:     const v = parsed.data[f];
  152:     if (v !== undefined) payload[f] = v;
  153:   }
  154:   if (Object.keys(payload).length === 0) {
  155:     return { ok: false, error: "validation", message: "no field to update" };
  156:   }
  157: 
  158:   // Defense-in-depth: WHERE status='draft' inside the UPDATE itself, so a
  159:   // status flip between assertProjectMutationAuth and this UPDATE is
  160:   // caught at the row layer. RLS would also reject it.
  161:   //
  162:   // F2 fix (K-05 LOOP 1 MED): .select('id') + length check distinguishes
  163:   // "0 rows matched" (status flipped between auth and UPDATE ??caller
  164:   // should see wrong_status, not the lying ok:true that the previous
  165:   // code returned and that was being rendered as "saved" on the autosave
  166:   // indicator). RLS-denied UPDATEs return [] without an error too ??same
  167:   // wrong_status surface.
  168:   const { data: updatedRows, error: updErr } = await auth.sb
  169:     .from("projects")
  170:     .update(payload)
  171:     .eq("id", parsed.data.projectId)
  172:     .eq("status", "draft")
  173:     .select("id");
  174:   if (updErr) {
  175:     console.error("[updateProjectCommitAction] UPDATE error:", updErr);
  176:     return { ok: false, error: "db", message: updErr.message };
  177:   }
  178:   if (!updatedRows || updatedRows.length === 0) {
  179:     return { ok: false, error: "wrong_status" };
  180:   }
  181: 
  182:   return { ok: true, savedAt: new Date().toISOString() };
  183: }
  184: 
  185: // ===========================================================================
  186: // 2. submitBriefingAction ??atomic status flip 'draft' ??'in_review'
  187: // ===========================================================================
  188: 
  189: const submitInput = z.object({
  190:   projectId: z.string().uuid(),
  191: });
  192: 
  193: export type SubmitBriefingResult =
  194:   | { ok: true; projectId: string }
  195:   | {
  196:       ok: false;
  197:       error:
  198:         | "validation"
  199:         | "unauthenticated"
  200:         | "no_workspace"
  201:         | "not_owner"
  202:         | "wrong_status"
  203:         | "db";
  204:       message?: string;
  205:     };
  206: 
  207: export async function submitBriefingAction(
  208:   input: unknown,
  209: ): Promise<SubmitBriefingResult> {
  210:   const parsed = submitInput.safeParse(input);
  211:   if (!parsed.success) {
  212:     return { ok: false, error: "validation", message: parsed.error.message };
  213:   }
  214: 
  215:   // F1 fix (K-05 LOOP 1 MED): submitBriefingAction does NOT use the
  216:   // shared assertProjectMutationAuth helper because that helper rejects
  217:   // non-draft with `forbidden` before reaching the atomic UPDATE ??which
  218:   // collapses cross-tab "already submitted" cases into a generic submit_failed
  219:   // toast instead of the explicit submit_wrong_status copy. Inline the
  220:   // status branch here so wrong_status surfaces honestly on:
  221:   //   (a) cross-tab double-submit (status='in_review' at SELECT time)
  222:   //   (b) concurrent same-tab race (status='draft' at SELECT, flips before
  223:   //       UPDATE ??0-row UPDATE ??wrong_status)
  224:   const supabase = await createSupabaseServer();
  225:   const {
  226:     data: { user },
  227:     error: authErr,
  228:   } = await supabase.auth.getUser();
  229:   if (authErr || !user) return { ok: false, error: "unauthenticated" };
  230: 
  231:   const active = await resolveActiveWorkspace(user.id);
  232:   if (!active) return { ok: false, error: "no_workspace" };
  233: 
  234:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  235:   const sb = supabase as any;
  236: 
  237:   const { data: project, error: selErr } = await sb
  238:     .from("projects")
  239:     .select("id, status, created_by")
  240:     .eq("id", parsed.data.projectId)
  241:     .maybeSingle();
  242:   if (selErr) {
  243:     console.error("[submitBriefingAction] SELECT error:", selErr);
  244:     return { ok: false, error: "db", message: selErr.message };
  245:   }
  246:   // not_owner covers both "row missing under RLS scope" and "row exists
  247:   // but caller is not the creator" ??semantically equivalent to the user.
  248:   if (!project || project.created_by !== user.id) {
  249:     return { ok: false, error: "not_owner" };
  250:   }
  251:   if (project.status !== "draft") {
  252:     return { ok: false, error: "wrong_status" };
  253:   }
  254: 
  255:   // Atomic status transition. WHERE status='draft' AND created_by=auth.uid()
  256:   // is a race-safety net: even if status was 'draft' at the SELECT above,
  257:   // a concurrent flip between SELECT and UPDATE collapses to 0 rows.
  258:   // .select('id').maybeSingle() makes a 0-row result distinguishable from
  259:   // a successful flip (returns null vs the row).
  260:   const { data: updated, error: updErr } = await sb
  261:     .from("projects")
  262:     .update({
  263:       status: "in_review",
  264:       submitted_at: new Date().toISOString(),
  265:     })
  266:     .eq("id", parsed.data.projectId)
  267:     .eq("created_by", user.id)
  268:     .eq("status", "draft")
  269:     .select("id")
  270:     .maybeSingle();
  271:   if (updErr) {
  272:     console.error("[submitBriefingAction] UPDATE error:", updErr);
  273:     return { ok: false, error: "db", message: updErr.message };
  274:   }
  275:   if (!updated) {
  276:     return { ok: false, error: "wrong_status" };
  277:   }
  278: 
  279:   revalidatePath("/[locale]/app/projects", "page");
  280:   return { ok: true, projectId: updated.id };
  281: }

 succeeded in 407ms:
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
   82: type AutosaveState = "idle" | "saving" | "saved" | "error" | "stale";
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
  218:   // F2 client side: once the action returns wrong_status, the row is no
  219:   // longer mutable from this surface (status flipped to in_review either
  220:   // by this tab or another). Stop autosaving and surface "stale" ??the
  221:   // user's path forward is the project list, not the canvas.
  222:   const staleRef = useRef(false);
  223: 
  224:   // Single-flight save runner ??same pattern as Step 2 sidebar.
  225:   const runSave = async (snapshot: CommitFormData): Promise<void> => {
  226:     if (staleRef.current) return;
  227:     if (inFlightRef.current) {
  228:       pendingRef.current = snapshot;
  229:       return;
  230:     }
  231:     inFlightRef.current = true;
  232:     try {
  233:       setAutosave("saving");
  234:       const res = await updateProjectCommitAction({
  235:         projectId,
  236:         budget_band: snapshot.budget_band || null,
  237:         target_delivery_at: snapshot.target_delivery_at || null,
  238:         meeting_preferred_at:
  239:           snapshot.meeting_preferred_at && snapshot.meeting_preferred_at !== ""
  240:             ? new Date(snapshot.meeting_preferred_at).toISOString()
  241:             : null,
  242:         interested_in_twin: snapshot.interested_in_twin,
  243:         additional_notes: snapshot.additional_notes || null,
  244:       });
  245:       if (res.ok) {
  246:         lastCommittedRef.current = JSON.stringify(snapshot);
  247:         setAutosave("saved");
  248:         setSavedAt(res.savedAt);
  249:       } else if (res.error === "wrong_status") {
  250:         staleRef.current = true;
  251:         pendingRef.current = null;
  252:         setAutosave("stale");
  253:       } else {
  254:         setAutosave("error");
  255:       }
  256:     } finally {
  257:       inFlightRef.current = false;
  258:       const next = pendingRef.current;
  259:       if (next && !staleRef.current) {
  260:         pendingRef.current = null;
  261:         void runSave(next);
  262:       }
  263:     }
  264:   };
  265: 
  266:   // 5s debounced autosave on form changes.
  267:   useEffect(() => {
  268:     if (loading) return;
  269:     const serialized = JSON.stringify(form);
  270:     if (serialized === lastCommittedRef.current) return;
  271:     if (debounceRef.current) clearTimeout(debounceRef.current);
  272:     debounceRef.current = setTimeout(() => {
  273:       void runSave(form);
  274:     }, 5_000);
  275:     return () => {
  276:       if (debounceRef.current) clearTimeout(debounceRef.current);
  277:     };
  278:     // eslint-disable-next-line react-hooks/exhaustive-deps -- runSave is stable via refs
  279:   }, [form, projectId, loading]);
  280: 
  281:   const set = <K extends keyof CommitFormData>(
  282:     key: K,
  283:     value: CommitFormData[K],
  284:   ) => setForm((f) => ({ ...f, [key]: value }));
  285: 
  286:   // Submit handler ??flush any pending autosave first, then atomic status flip.
  287:   const handleSubmit = () => {
  288:     setConfirmOpen(false);
  289:     startSubmit(async () => {
  290:       // Cancel pending debounce + force-save any uncommitted delta. The
  291:       // submit UPDATE's WHERE status='draft' would also catch a stale
  292:       // commit-write that lands after the flip, but flushing first means
  293:       // every keystroke up to "?섎ː?섍린" is persisted before the status
  294:       // transition.
  295:       if (debounceRef.current) clearTimeout(debounceRef.current);
  296:       const serialized = JSON.stringify(form);
  297:       if (serialized !== lastCommittedRef.current) {
  298:         await runSave(form);
  299:       }
  300:       // Drain any queued save.
  301:       while (inFlightRef.current) {
  302:         await new Promise((r) => setTimeout(r, 50));
  303:       }
  304: 
  305:       const result = await submitBriefingAction({ projectId });
  306:       if (!result.ok) {
  307:         const key =
  308:           result.error === "unauthenticated"
  309:             ? "briefing.step3.toast.submit_unauthorized"
  310:             : result.error === "wrong_status"
  311:               ? "briefing.step3.toast.submit_wrong_status"
  312:               : "briefing.step3.toast.submit_failed";
  313:         toast.error(t(key));
  314:         return;
  315:       }
  316:       try {
  317:         window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  318:       } catch {
  319:         // sessionStorage failure shouldn't block the redirect
  320:       }
  321:       toast.success(t("briefing.step3.toast.submit_success"));
  322:       router.push("/app/projects");
  323:     });
  324:   };
  325: 
  326:   if (loading || !summary) {
  327:     return (
  328:       <div className="min-h-dvh flex items-center justify-center">
  329:         <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  330:       </div>
  331:     );
  332:   }
  333: 
  334:   const labelDeliverable = (k: string) =>
  335:     t(
  336:       `briefing.step1.field.deliverable_types.options.${k}` as Parameters<
  337:         typeof t
  338:       >[0],
  339:     );
  340:   const labelMood = (k: string) =>
  341:     t(
  342:       `briefing.step2.sections.detail.mood.options.${k}` as Parameters<
  343:         typeof t
  344:       >[0],
  345:     );
  346:   const labelVisualRatio = (k: string) =>
  347:     t(
  348:       `briefing.step2.sections.detail.visual_ratio.options.${k}` as Parameters<
  349:         typeof t
  350:       >[0],
  351:     );
  352:   const labelChannel = (k: string) =>
  353:     t(
  354:       `briefing.step2.sections.detail.channels.options.${k}` as Parameters<
  355:         typeof t
  356:       >[0],
  357:     );
  358: 
  359:   return (
  360:     <TooltipProvider>
  361:       <div className="pb-32">
  362:         {/* Header */}
  363:         <div className="max-w-3xl mx-auto px-6 lg:px-12 pt-12 pb-8">
  364:           <p className="text-xs font-semibold tracking-[0.18em] text-foreground/40 mb-3">
  365:             {t("briefing.step3.header.eyebrow")}
  366:           </p>
  367:           <h1 className="font-display text-3xl tracking-tight mb-3 keep-all">
  368:             {t("briefing.step3.header.title")}
  369:           </h1>
  370:           <p className="text-sm text-muted-foreground leading-relaxed keep-all max-w-2xl">
  371:             {t("briefing.step3.header.subtitle")}
  372:           </p>
  373:         </div>
  374: 
  375:         <div className="max-w-3xl mx-auto px-6 lg:px-12 flex flex-col gap-6">
  376:           {/* Summary card */}
  377:           <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-5">
  378:             <h2 className="text-base font-semibold tracking-tight keep-all">
  379:               {t("briefing.step3.summary.title")}
  380:             </h2>
  381: 
  382:             <SummaryRow
  383:               label={t("briefing.step3.summary.project_name")}
  384:               value={
  385:                 summary.name ?? t("briefing.step3.summary.empty_placeholder")
  386:               }
  387:             />
  388:             <SummaryRow
  389:               label={t("briefing.step3.summary.deliverable_types")}
  390:               value={
  391:                 summary.deliverable_types.length === 0
  392:                   ? t("briefing.step3.summary.empty_placeholder")
  393:                   : summary.deliverable_types.map(labelDeliverable).join(", ")
  394:               }
  395:             />
  396:             {summary.description && (
  397:               <SummaryRow
  398:                 label={t("briefing.step3.summary.description")}
  399:                 value={summary.description}
  400:               />
  401:             )}
  402:             <SummaryRow
  403:               label={`${t("briefing.step3.summary.documents_brief", { count: summary.briefDocsCount })} 쨌 ${t("briefing.step3.summary.documents_reference", { count: summary.refDocsCount })}`}
  404:               value=""
  405:               labelOnly
  406:             />
  407:             {summary.mood_keywords.length > 0 && (
  408:               <SummaryRow
  409:                 label={t("briefing.step3.summary.mood")}
  410:                 value={summary.mood_keywords.map(labelMood).join(", ")}
  411:               />
  412:             )}
  413:             {summary.visual_ratio && (
  414:               <SummaryRow
  415:                 label={t("briefing.step3.summary.visual_ratio")}
  416:                 value={
  417:                   summary.visual_ratio === "custom"
  418:                     ? summary.visual_ratio
  419:                     : labelVisualRatio(summary.visual_ratio)
  420:                 }
  421:               />
  422:             )}
  423:             {summary.channels.length > 0 && (
  424:               <SummaryRow
  425:                 label={t("briefing.step3.summary.channels")}
  426:                 value={summary.channels.map(labelChannel).join(", ")}
  427:               />
  428:             )}
  429:             {summary.target_audience && (
  430:               <SummaryRow
  431:                 label={t("briefing.step3.summary.target_audience")}
  432:                 value={summary.target_audience}
  433:               />
  434:             )}
  435: 
  436:             <div className="flex justify-end gap-4 border-t border-border/40 mt-3 pt-3">
  437:               <button
  438:                 type="button"
  439:                 onClick={() => onJumpToStep(1)}
  440:                 className="text-xs text-muted-foreground underline-offset-4 hover:underline transition-colors"
  441:               >
  442:                 {t("briefing.step3.summary.edit_step1")}
  443:               </button>
  444:               <button
  445:                 type="button"
  446:                 onClick={() => onJumpToStep(2)}
  447:                 className="text-xs text-muted-foreground underline-offset-4 hover:underline transition-colors"
  448:               >
  449:                 {t("briefing.step3.summary.edit_step2")}
  450:               </button>
  451:             </div>
  452:           </section>
  453: 
  454:           {/* F3 fix (K-05 LOOP 1 MED): wrap commit form + final notes
  455:               in a single fieldset disabled while submitting/stale, so
  456:               edits made between [?섎ː?섍린 ?? and the status flip can't
  457:               queue behind the flush and silently drop after status flips
  458:               to in_review. className="contents" preserves layout. */}
  459:           <fieldset
  460:             disabled={submitting || autosave === "stale"}
  461:             className="contents"
  462:           >
  463:           {/* Commit form (2x2 grid) */}
  464:           <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-8">
  465:             <h2 className="text-base font-semibold tracking-tight keep-all">
  466:               {t("briefing.step3.commit.title")}
  467:             </h2>
  468: 
  469:             <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
  470:               <FieldBlock title={t("briefing.step3.commit.budget.label")}>
  471:                 <div className="flex flex-wrap gap-1.5">
  472:                   {BUDGET_OPTIONS.map((opt) => {
  473:                     const selected = form.budget_band === opt;
  474:                     return (
  475:                       <button
  476:                         key={opt}
  477:                         type="button"
  478:                         onClick={() =>
  479:                           set(
  480:                             "budget_band",
  481:                             selected
  482:                               ? ""
  483:                               : (opt as CommitFormData["budget_band"]),
  484:                           )
  485:                         }
  486:                         aria-pressed={selected}
  487:                         className={cn(
  488:                           "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
  489:                           selected
  490:                             ? "bg-foreground text-background"
  491:                             : "border border-border/60 hover:border-border",
  492:                         )}
  493:                       >
  494:                         {t(
  495:                           `briefing.step3.commit.budget.options.${opt}` as Parameters<
  496:                             typeof t
  497:                           >[0],
  498:                         )}
  499:                       </button>
  500:                     );
  501:                   })}
  502:                 </div>
  503:               </FieldBlock>
  504: 
  505:               <FieldBlock title={t("briefing.step3.commit.delivery.label")}>
  506:                 <Input
  507:                   type="date"
  508:                   value={form.target_delivery_at}
  509:                   onChange={(e) => set("target_delivery_at", e.target.value)}
  510:                   className="text-sm max-w-xs"
  511:                 />
  512:               </FieldBlock>
  513: 
  514:               <FieldBlock
  515:                 title={t("briefing.step3.commit.meeting.label")}
  516:                 helper={t("briefing.step3.commit.meeting.helper")}
  517:               >
  518:                 <Input
  519:                   type="datetime-local"
  520:                   value={form.meeting_preferred_at}
  521:                   onChange={(e) => set("meeting_preferred_at", e.target.value)}
  522:                   className="text-sm max-w-xs"
  523:                 />
  524:               </FieldBlock>
  525: 
  526:               <div
  527:                 className={cn(
  528:                   "rounded-2xl p-4 flex items-start gap-3 self-start",
  529:                   form.interested_in_twin
  530:                     ? "bg-emerald-50 border border-emerald-200"
  531:                     : "border border-border/40",
  532:                 )}
  533:               >
  534:                 <input
  535:                   type="checkbox"
  536:                   id="twin-toggle"
  537:                   checked={form.interested_in_twin}
  538:                   onChange={(e) => set("interested_in_twin", e.target.checked)}
  539:                   className="mt-1"
  540:                 />
  541:                 <div className="flex flex-col gap-1 min-w-0">
  542:                   <div className="flex items-center gap-1.5">
  543:                     <Label
  544:                       htmlFor="twin-toggle"
  545:                       className="text-sm font-semibold cursor-pointer keep-all"
  546:                     >
  547:                       {t("briefing.step3.commit.twin.label")}
  548:                     </Label>
  549:                     <Tooltip>
  550:                       <TooltipTrigger asChild>
  551:                         <button
  552:                           type="button"
  553:                           aria-label={t(
  554:                             "briefing.step3.commit.twin.tooltip_aria",
  555:                           )}
  556:                           className="text-muted-foreground hover:text-foreground transition-colors"
  557:                         >
  558:                           <HelpCircle className="w-3.5 h-3.5" />
  559:                         </button>
  560:                       </TooltipTrigger>
  561:                       <TooltipContent
  562:                         side="top"
  563:                         className="max-w-xs whitespace-pre-line text-xs leading-relaxed"
  564:                       >
  565:                         {t("briefing.step3.commit.twin.tooltip")}
  566:                       </TooltipContent>
  567:                     </Tooltip>
  568:                   </div>
  569:                   <p className="text-xs text-muted-foreground keep-all leading-relaxed">
  570:                     {t("briefing.step3.commit.twin.helper")}
  571:                   </p>
  572:                 </div>
  573:               </div>
  574:             </div>
  575:           </section>
  576: 
  577:           {/* Final notes */}
  578:           <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-4">
  579:             <Label className="text-sm font-semibold tracking-tight keep-all">
  580:               {t("briefing.step3.notes.label")}
  581:             </Label>
  582:             <Textarea
  583:               value={form.additional_notes}
  584:               onChange={(e) => set("additional_notes", e.target.value)}
  585:               placeholder={t("briefing.step3.notes.placeholder")}
  586:               rows={4}
  587:               className="resize-none text-sm"
  588:             />
  589:           </section>
  590:           </fieldset>
  591:         </div>
  592: 
  593:         {/* Sticky bottom CTA */}
  594:         <div className="fixed bottom-0 left-0 right-0 md:left-[240px] border-t border-border/40 bg-background/95 backdrop-blur-md">
  595:           <div className="max-w-3xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between gap-3">
  596:             <Button
  597:               type="button"
  598:               variant="ghost"
  599:               size="sm"
  600:               onClick={onBack}
  601:               className="text-sm"
  602:             >
  603:               {t("briefing.step3.cta.back")}
  604:             </Button>
  605:             <div className="text-xs text-muted-foreground keep-all flex items-center gap-2">
  606:               {autosave === "saving" && (
  607:                 <>
  608:                   <Loader2 className="w-3 h-3 animate-spin" />
  609:                   <span>{t("briefing.step3.autosave.saving")}</span>
  610:                 </>
  611:               )}
  612:               {autosave === "saved" && (
  613:                 <span className="text-emerald-600">
  614:                   {t("briefing.step3.autosave.saved_at", {
  615:                     time: formatSavedAt(savedAt),
  616:                   })}
  617:                 </span>
  618:               )}
  619:               {autosave === "error" && (
  620:                 <span className="text-destructive">
  621:                   {t("briefing.step3.autosave.error")}
  622:                 </span>
  623:               )}
  624:               {autosave === "stale" && (
  625:                 <span className="text-amber-600">
  626:                   {t("briefing.step3.autosave.stale")}
  627:                 </span>
  628:               )}
  629:             </div>
  630:             <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  631:               <AlertDialogTrigger asChild>
  632:                 <Button
  633:                   type="button"
  634:                   size="sm"
  635:                   disabled={submitting}
  636:                   className="text-sm rounded-full px-6"
  637:                 >
  638:                   {submitting ? (
  639:                     <Loader2 className="w-4 h-4 animate-spin" />
  640:                   ) : (
  641:                     t("briefing.step3.cta.submit")
  642:                   )}
  643:                 </Button>
  644:               </AlertDialogTrigger>
  645:               <AlertDialogContent>
  646:                 <AlertDialogHeader>
  647:                   <AlertDialogTitle>
  648:                     {t("briefing.step3.confirm.title")}
  649:                   </AlertDialogTitle>
  650:                   <AlertDialogDescription className="keep-all leading-relaxed">
  651:                     {t("briefing.step3.confirm.body")}
  652:                   </AlertDialogDescription>
  653:                 </AlertDialogHeader>
  654:                 <AlertDialogFooter>
  655:                   <AlertDialogCancel>
  656:                     {t("briefing.step3.confirm.cancel")}
  657:                   </AlertDialogCancel>
  658:                   <AlertDialogAction onClick={handleSubmit}>
  659:                     {t("briefing.step3.confirm.proceed")}
  660:                   </AlertDialogAction>
  661:                 </AlertDialogFooter>
  662:               </AlertDialogContent>
  663:             </AlertDialog>
  664:           </div>
  665:         </div>
  666:       </div>
  667:     </TooltipProvider>
  668:   );
  669: }
  670: 
  671: // ---------------------------------------------------------------------------
  672: // Subcomponents
  673: // ---------------------------------------------------------------------------
  674: 
  675: function SummaryRow({
  676:   label,
  677:   value,
  678:   labelOnly,
  679: }: {
  680:   label: string;
  681:   value: string;
  682:   labelOnly?: boolean;
  683: }) {
  684:   if (labelOnly) {
  685:     return (
  686:       <div className="text-xs text-muted-foreground keep-all">{label}</div>
  687:     );
  688:   }
  689:   return (
  690:     <div className="flex flex-col gap-1">
  691:       <div className="text-xs text-muted-foreground keep-all">{label}</div>
  692:       <div className="text-sm font-medium keep-all break-words">{value}</div>
  693:     </div>
  694:   );
  695: }
  696: 
  697: function FieldBlock({
  698:   title,
  699:   helper,
  700:   children,
  701: }: {
  702:   title: string;
  703:   helper?: string;
  704:   children: React.ReactNode;
  705: }) {
  706:   return (
  707:     <div className="flex flex-col gap-3">
  708:       <div>
  709:         <Label className="text-sm font-semibold tracking-tight keep-all">
  710:           {title}
  711:         </Label>
  712:         {helper && (
  713:           <p className="text-xs text-muted-foreground mt-1 keep-all leading-relaxed">
  714:             {helper}
  715:           </p>
  716:         )}
  717:       </div>
  718:       {children}
  719:     </div>
  720:   );
  721: }

codex
## VERDICT: CLEAN

F1 closed. `submitBriefingAction` no longer calls `assertProjectMutationAuth`; it uses inline auth, returns `not_owner` for missing row or creator mismatch, returns `wrong_status` for non-draft, keeps the atomic `UPDATE ... eq("created_by", user.id).eq("status", "draft")`, and maps 0-row update to `wrong_status`. The `SubmitBriefingResult` union matches the new returns, and the Step 3 toast switch still routes `wrong_status` to `briefing.step3.toast.submit_wrong_status`.

F2 closed. `updateProjectCommitAction` now uses `.select("id")`, checks empty `updatedRows`, returns `wrong_status`, and the result union includes it. Client `runSave` sets `staleRef.current = true`, clears pending work, sets `autosave` to `"stale"`, and the CTA renders `briefing.step3.autosave.stale` in amber.

F3 closed. The fieldset wraps both the commit form section and final-notes section, uses `className="contents"`, and disables on `submitting || autosave === "stale"`. The back button and AlertDialog cancel/proceed controls remain outside the fieldset as specified.

Run log summary: LOOP 2 narrow verify CLEAN; F1/F2/F3 closures confirmed, no new HIGH/MED introduced.
tokens used
27,467
## VERDICT: CLEAN

F1 closed. `submitBriefingAction` no longer calls `assertProjectMutationAuth`; it uses inline auth, returns `not_owner` for missing row or creator mismatch, returns `wrong_status` for non-draft, keeps the atomic `UPDATE ... eq("created_by", user.id).eq("status", "draft")`, and maps 0-row update to `wrong_status`. The `SubmitBriefingResult` union matches the new returns, and the Step 3 toast switch still routes `wrong_status` to `briefing.step3.toast.submit_wrong_status`.

F2 closed. `updateProjectCommitAction` now uses `.select("id")`, checks empty `updatedRows`, returns `wrong_status`, and the result union includes it. Client `runSave` sets `staleRef.current = true`, clears pending work, sets `autosave` to `"stale"`, and the CTA renders `briefing.step3.autosave.stale` in amber.

F3 closed. The fieldset wraps both the commit form section and final-notes section, uses `className="contents"`, and disables on `submitting || autosave === "stale"`. The back button and AlertDialog cancel/proceed controls remain outside the fieldset as specified.

Run log summary: LOOP 2 narrow verify CLEAN; F1/F2/F3 closures confirmed, no new HIGH/MED introduced.

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
session id: 019df3f6-48aa-79f1-be7d-620da15bb394
--------
user
Phase 5 Wave C Hotfix-2 — K-05 LOOP 1 (Tier 2 medium).

Adversarial review of new `deleteProjectAction` server action. The action soft-deletes a project (UPDATE projects SET deleted_at = now()) for the project's creator when status IN ('submitted', 'in_review'). The write goes through service-role client because RLS on `projects_update` denies any `deleted_at` write from `client` and `ws_admin` roles (Phase 3.0 baseline `20260427164421_phase_3_0_projects_lifecycle.sql` Section I — only `yagi_admin` bypasses).

## File in scope (1 file, focused review)

- `src/app/[locale]/app/projects/[id]/delete-actions.ts` (NEW)
  • deleteProjectAction(input) — zod-validated thin wrapper over
    SELECT (verify owner + status + not-already-deleted) → UPDATE via
    `createSupabaseService()` with `.eq("created_by", user.id) +
    .in("status", ["submitted","in_review"]) + .is("deleted_at", null)`
    filter chain.
  • Discriminated union return: { ok: true } | { ok: false, error:
    "validation" | "unauthenticated" | "not_found" | "forbidden_owner"
    | "forbidden_status" | "db" }.
  • revalidatePath('/[locale]/app/projects', 'page') on success.

## Out of scope (do NOT review)

- HF2_1 `status-tab.tsx` layout refactor (UI only, no auth)
- HF2_2 `status-card.tsx` dropdown UI (calls the action; UI verified by K-06)
- HF2_3 i18n key additions
- recall-actions.ts (Wave B.5, already CLEAN)
- cta-actions.ts (Wave C C_3, already CLEAN)

## Adversarial focus areas

1. **Status guard bypass.** Confirm a status='in_progress' (or any
   other non-recall-window status) project cannot be deleted via:
   (a) crafted projectId pointing to in_progress project — action's
       SELECT-then-check should catch it as forbidden_status before the
       UPDATE
   (b) TOCTOU race — between the SELECT (status='submitted') and the
       UPDATE, another actor flips status to 'in_progress'. The
       UPDATE's `.in("status", ["submitted","in_review"])` filter
       should reject (0 rows updated). Confirm the action layer maps
       0-row UPDATE to an error (it currently doesn't — see TOCTOU
       point 6).
   (c) zod validation hole — projectId must be uuid; reject any
       non-uuid input as "validation".

2. **Owner guard bypass.** Confirm user A cannot delete user B's
   project via:
   (a) crafted projectId pointing to B's project — action's
       `project.created_by !== user.id` check returns forbidden_owner.
   (b) workspace_admin role A acting on member B's project — same
       check should reject (action only honors creator, not
       workspace_admin).
   (c) yagi_admin role A acting on B's project — same check rejects;
       admin support paths use service-role tooling out-of-band.

3. **service-role client misuse.** The UPDATE uses
   `createSupabaseService()` (RLS bypass). Confirm:
   (a) The `.eq("id", projectId)` filter is present (cannot UPDATE
       all rows).
   (b) The `.eq("created_by", user.id)` filter is present (cannot
       update someone else's row even via service-role).
   (c) The `.in("status", ["submitted","in_review"])` filter is
       present (TOCTOU defense — cannot soft-delete an
       in_progress/delivered project even if the SELECT-then-check
       race window is exploited).
   (d) The `.is("deleted_at", null)` filter is present (idempotency).
   (e) No accidental wildcard or missing filter that would let the
       UPDATE escape its single-row scope.

4. **MANDATORY RLS audit — walk USING + WITH CHECK from each role
   separately (per `.yagi-autobuild/codex-review-protocol.md`
   §"Mandatory RLS multi-role audit"):**

   1. As `client` (auth.uid() = created_by, no admin role) —
      owner-only path. The `projects_update` policy explicitly denies
      `deleted_at` write to client. Confirm the action routes the
      write through `createSupabaseService()` (RLS bypass) with
      `.eq("created_by", user.id)` filter preserved as authorization.
   2. As `ws_admin` (workspace_admin role for the project's
      workspace). Same denial at WITH CHECK; same service-role bypass
      requirement; same authorization filter requirement. Confirm the
      action does NOT branch on `is_ws_admin` (it should NOT — the
      action only allows the creator).
   3. As `yagi_admin` (cross-workspace admin) — reference "happy path"
      (RLS allows the deleted_at write). The action does not branch
      on yagi_admin and uses service-role anyway; verify this is OK
      (yes — service-role + creator check is consistent across
      roles).
   4. As `different-user same-workspace` (e.g., another
      workspace_member who is NOT the project's created_by). The
      most-likely fail mode in dev with seed accounts. The action's
      `created_by !== user.id` check returns forbidden_owner BEFORE
      reaching the service-role UPDATE. Confirm this guard is
      effective and that no `.eq()` filter reduction would let the
      UPDATE escape to the wrong row.

   Flag any column write that depends on `is_yagi_admin` bypass that
   isn't explicitly routed through `createSupabaseService()` with
   filters preserved.

5. **revalidatePath path correctness.** The action calls
   `revalidatePath('/[locale]/app/projects', 'page')`. Confirm this
   is the canonical Next.js App Router pattern for revalidating both
   locale variants of the project list. Flag if the path template
   should be `/[locale]/app/projects/[id]` or just `/app/projects`
   instead.

6. **TOCTOU window.** SELECT-then-check pattern reads project
   status / created_by at time T0, UPDATE WHERE status IN
   ('submitted','in_review') runs at time T1. Confirm:
   (a) The UPDATE's WHERE filters (status, created_by, deleted_at)
       handle the race correctly (UPDATE returns 0 rows if status
       flipped between T0 and T1).
   (b) **MISSING:** the action does not check the UPDATE result
       (rowCount or returning data) — a 0-row UPDATE is silently
       treated as success. Flag as MED if this is the case; the user
       sees a success toast + redirect but the project still exists.
       Recommended fix: add `.select("id")` to the UPDATE and check
       length in the result.

## Already-deferred (do NOT flag again)

- FU-Phase5-23 (30-day cleanup cron for soft-deleted projects + R2 objects)
- FU-Phase5-24 (mobile responsive polish for status-tab grid)
- FU-Phase5-25 (draft status dropdown — separate flow)
- FU-Phase5-26 ("recently deleted" recovery surface)

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Hotfix-2 deleteProjectAction ready for ff-merge."

End with one-line summary suitable for the run log.

codex
I’ll review this in code-review mode and keep it scoped to the new server action plus the RLS baseline needed to validate the authorization assumptions.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath '.yagi-autobuild/codex-review-protocol.md'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/[id]/delete-actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "projects_update|deleted_at|yagi_admin|workspace_admin|create policy|CREATE POLICY" supabase db . -g "*20260427164421_phase_3_0_projects_lifecycle.sql" -g "*.sql"' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 578ms:
"use server";

// =============================================================================
// Phase 5 Wave C Hotfix-2 HF2_2 ??deleteProjectAction
//
// Soft-deletes a project owned by the current user, gated on status IN
// ('submitted', 'in_review'). Hard rules:
//
//   1. Validate input shape (uuid).
//   2. Authenticate via createSupabaseServer().auth.getUser().
//   3. SELECT the project (id, status, created_by, deleted_at).
//      Row missing or already deleted ??'not_found'.
//   4. created_by !== user.id ??'forbidden_owner'.
//   5. status NOT IN ('submitted', 'in_review') ??'forbidden_status'.
//   6. Write deleted_at via createSupabaseService() (service-role bypass
//      required: RLS WITH CHECK denies deleted_at writes from the client
//      role ??same pattern as ensureBriefingDraftProject defensive
//      soft-delete in briefing-actions.ts).
//      Authorization is preserved by the explicit filter chain:
//        .eq("id", projectId)
//        .eq("created_by", user.id)          ??different-user blocked here
//        .in("status", ["submitted", "in_review"])  ??TOCTOU safety net
//        .is("deleted_at", null)             ??idempotency guard
//   7. revalidatePath('/[locale]/app/projects', 'page') so the list
//      immediately drops the deleted row.
//   8. Return { ok: true }.
//
// L-049 multi-role audit:
//   - client role: RLS WITH CHECK blocks deleted_at write ??service-role ??//   - ws_admin role: same RLS rule applies ??service-role ??//   - yagi_admin: bypasses RLS but action layer enforces creator + status ??//   - different-user same-workspace: .eq("created_by", user.id) blocks ??// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

const deleteProjectInput = z.object({
  projectId: z.string().uuid(),
});

export type DeleteProjectResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "not_found"
        | "forbidden_status"
        | "forbidden_owner"
        | "db";
      message?: string;
    };

export async function deleteProjectAction(
  input: unknown,
): Promise<DeleteProjectResult> {
  // 1. Parse input
  const parsed = deleteProjectInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const { projectId } = parsed.data;

  // 2. Authenticate
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthenticated" };
  }

  // 3. SELECT project row (status, owner, soft-delete state)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
  const sb = supabase as any;
  const { data: project, error: selErr } = await sb
    .from("projects")
    .select("id, status, created_by, deleted_at")
    .eq("id", projectId)
    .maybeSingle();

  if (selErr) {
    console.error("[deleteProjectAction] SELECT error:", selErr);
    return { ok: false, error: "db", message: selErr.message };
  }

  // Row missing or already soft-deleted ??treat as not_found
  if (!project || project.deleted_at !== null) {
    return { ok: false, error: "not_found" };
  }

  // 4. Owner check
  if (project.created_by !== user.id) {
    return { ok: false, error: "forbidden_owner" };
  }

  // 5. Status gate ??only submitted / in_review deletable by owner
  const DELETABLE_STATUSES = ["submitted", "in_review"] as const;
  if (!DELETABLE_STATUSES.includes(project.status)) {
    return { ok: false, error: "forbidden_status" };
  }

  // 6. Soft-delete via service-role client (bypasses RLS WITH CHECK
  //    that denies deleted_at writes from non-yagi_admin client sessions).
  //    Authorization triple-lock preserved in the WHERE chain:
  //      created_by = user.id  ?? different-user blocked even under service role
  //      status IN (...)       ?? TOCTOU: admin may have transitioned status
  //                               between our SELECT and this UPDATE
  //      deleted_at IS NULL    ?? idempotency: concurrent delete attempt is a no-op
  const sbAdmin = createSupabaseService();
  const { error: updateErr } = await sbAdmin
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("created_by", user.id)
    .in("status", ["submitted", "in_review"])
    .is("deleted_at", null);

  if (updateErr) {
    console.error("[deleteProjectAction] UPDATE error:", updateErr);
    return { ok: false, error: "db", message: updateErr.message };
  }

  // 7. Invalidate project list cache
  revalidatePath("/[locale]/app/projects", "page");

  // 8. Success
  return { ok: true };
}

 succeeded in 601ms:
# YAGI Workshop ??Codex Plugin for Claude Code

> **Purpose:** Dual-model review workflow. Claude Code (B-O-E) = builds. OpenAI Codex = adversarial reviewer + rescue agent.
> **Why:** Single-family model review creates false confidence. Different model architectures catch each other's blind spots ??especially on RLS, concurrency, and auth-adjacent code.

---

## One-time install

In Claude Code session (inside `C:\Users\yout4\yagi-studio\yagi-workshop`):

```
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

`/codex:setup` will detect whether the `codex` CLI is installed. If not:

```powershell
npm install -g @openai/codex
```

Then log in:

```
!codex login
```

(Supports ChatGPT subscription OR OpenAI API key. ChatGPT Plus/Team sub is enough ??the plugin uses your Codex usage limits, separate from Claude quota.)

Verify:

```
/codex:setup
```

Should show Codex ready + the `codex:codex-rescue` subagent in `/agents`.

---

## Project-level Codex config

Create `.codex/config.toml` at repo root:

```toml
model = "gpt-5.4-mini"
model_reasoning_effort = "high"
```

Rationale: `gpt-5.4-mini` on high reasoning hits the cost/quality sweet spot for review passes. Upgrade to full `gpt-5.4` only for the highest-risk reviews (RLS, financial flows).

---

## The YAGI review workflow

### Principle: Codex is a reviewer, not a builder

- **Claude Code (B-O-E)** writes all code.
- **Codex** only runs `review`, `adversarial-review`, and occasional `rescue` for targeted debugging.
- `/codex:rescue` writes code ??use it only when Claude Code is stuck on a specific bug, never as a general builder.
- **Never enable `review gate`** (`--enable-review-gate`) ??it creates Claude?봀odex loops that drain usage limits.

### Three review modes

| Command | When |
|---------|------|
| `/codex:review --base main --background` | End of every Phase, before `pnpm build` |
| `/codex:adversarial-review --base main --background <focus>` | Before sensitive Phase completion (RLS, auth, financial) |
| `/codex:rescue <problem>` | Only when Claude Code stuck on a specific bug after 2 failed attempts |

### Targeted adversarial prompts (tailored to YAGI phases)

Generic "find bugs" prompts return generic results. YAGI-specific focus cuts noise by ~60%.

**Phase 1.2.5 (video/pdf/intake):**
```
/codex:adversarial-review --base main --background focus on: (1) RLS visibility leaks where a client-role user could SELECT an internal-visibility thread attachment, (2) signed URL expiry edge cases on large video uploads, (3) intake_mode Zod discriminated union allowing a brief-mode project to bypass proposal field validation
```

**Phase 1.3 (Google Calendar + AI summary):**
```
/codex:adversarial-review --base main --background focus on: (1) Google refresh token failure modes ??what if revoked mid-meeting-create, (2) ICS fallback path when Resend is also down, (3) AI summary schema validation ??what happens if the model returns malformed JSON after the one retry, (4) meeting cancel race conditions if Google deletes but our DB update fails
```

**Phase 1.4 (Pre-production Board):**
```
/codex:adversarial-review --base main --background focus on: (1) share token rotation leaving stale URLs cached in clients' browsers, (2) frame reaction upsert races when multiple clients react simultaneously, (3) revision history consistency ??can a v2 frame reference a deleted v1 frame, (4) RLS bypass via the public /s/ route
```

**Phase 1.5 (Invoicing + ?앸퉴):**
```
/codex:adversarial-review --base main --background focus on: (1) ?앸퉴 API failure during ?꾩옄?멸툑怨꾩궛??issuance ??can a draft invoice become "issued" in our DB without actually being filed, (2) money rounding in KRW (integer-only currency), (3) tax period edge cases around Korean fiscal year, (4) idempotency of invoice issuance retries
```

**Phase 1.7 (internal team chat):**
```
/codex:adversarial-review --base main --background focus on: (1) cross-workspace message leakage ??can a client ever see YAGI internal chat, (2) realtime subscription leaking internal channel IDs to client browser, (3) file upload path collisions in team-channel storage bucket
```

**Phase 1.8 (notifications):**
```
/codex:adversarial-review --base main --background focus on: (1) digest cron idempotency ??duplicate emails on retry, (2) timezone handling for digest_time_local, (3) notification_events queue buildup if email sending is down, (4) unsubscribe link generation and verification
```

**Phase 1.9 (showcase):**
```
/codex:adversarial-review --base main --background focus on: (1) public slug enumeration ??can an unlisted showcase be discovered, (2) OG image generation caching ??stale images after edits, (3) password-gated showcase bypass via referrer leak, (4) media embed XSS if external_url is rendered unsafely
```

---

## Validation pattern (noise filter)

Codex returns a list of findings. Do NOT act on all of them. Claude Code B-O-E Builder runs this validation prompt on the Codex output first:

```
Here is the Codex review output:
<paste codex output>

Evaluate each finding against these criteria:
1. Is this a real issue in THIS codebase, or a generic "best practice" note?
2. Does the finding cite a specific file + line, or is it vague?
3. What is the concrete exploit scenario ??can a malicious user actually trigger this?
4. What is the fix cost ??5 minutes or 2 hours?

Output a filtered list with only findings that are:
- concrete (cited file + line)
- exploitable (real attack path, not theoretical)
- worth the fix cost (severity 횞 exploitability > fix cost)

For each surviving finding, write a 1-line fix plan.
```

This cuts ~50% of Codex output that's fluff/generic. The rest goes into a TodoWrite list for the next Executor wave.

---

## Integration with Kill-switches

Each Phase has an existing kill-switch "Before final `pnpm build`". Add one step before it:

```
Kill-switch N-1: Codex adversarial review
1. Run: /codex:adversarial-review --base main --background <phase-specific focus>
2. Wait for completion: /codex:status until ok
3. Get result: /codex:result
4. Run validation prompt (above) on the output
5. If any surviving findings: create a TodoWrite, fix them, then proceed
6. If no surviving findings: Telegram "??Codex review clean" ??continue to final build
```

---

## Budget & cost monitoring

- Codex usage is billed separately against ChatGPT sub OR OpenAI API key.
- Typical adversarial review of a Phase (~2000??000 lines changed): **$0.50??2 in API tokens.**
- Full Phase 1.2 ??1.9 ship with dual-model review: **~$15??30 total Codex spend.**
- Monitor via https://platform.openai.com/usage if using API key.

If using ChatGPT Plus sub: usage limits reset weekly. Heavy adversarial reviews might hit the cap in a single Phase ??use API key for safety.

---

## Forbidden

- Do NOT enable `--enable-review-gate` ??creates Claude?봀odex loop that burns quota
- Do NOT use `/codex:rescue` as a general-purpose builder ??it bypasses the B-O-E structure and leaves no Phase spec trail
- Do NOT paste `.env.local` contents into Codex prompts ??the plugin sends code + diffs, not env vars, but prompts are your responsibility
- Do NOT run Codex review on pre-Phase-1.2 code ??RLS conventions weren't established yet, review will be noisy

---

## Escape hatch

If Codex is down or misconfigured, kill-switches proceed without the Codex step (Telegram: "?좑툘 Codex unavailable, proceeding with Claude-only review"). Don't block shipping on external dep outage.

---

## Mandatory RLS multi-role audit (binding from L-049, 2026-05-04)

Added after Phase 5 Wave C K-05 LOOP 1 passed CLEAN with 0 findings yet shipped
a browser-runtime-broken `defensive soft-delete` (RLS 42501 in dev when logged
in as a non-yagi-admin seed account). K-05 review never simulated
non-yagi-admin perspective on RLS WITH CHECK clauses.

**Rule:** Every K-05 review prompt that touches code which writes to ANY
RLS-bound table (`projects`, `briefing_documents`, `project_boards`,
`project_references`, `project_status_history`, `workspace_members`,
`user_roles`, `profiles`, anything under `public.*` with `ENABLE ROW LEVEL
SECURITY`) MUST include this 4-perspective walk verbatim:

```
MANDATORY RLS audit ??walk USING + WITH CHECK from each role separately:

  1. As `client` (auth.uid() = created_by, no admin role) ??owner-only path.
     Confirm every column the action layer writes is permitted by WITH CHECK
     for this role. Flag any column write that depends on `is_yagi_admin`
     bypass (e.g., `deleted_at`, `status`, `workspace_id`).
  2. As `ws_admin` (workspace_admin role for the project's workspace).
     Same column-by-column walk; flag deny-only columns.
  3. As `yagi_admin` (cross-workspace admin) ??reference "happy path".
  4. As `different-user same-workspace` (e.g., another workspace_member who
     is NOT the project's created_by). The most-likely fail mode in dev
     with seed accounts. Confirm RLS USING denies the row OR action layer
     filters reject the operation cleanly.

For every column denied at WITH CHECK level for any role except
`yagi_admin`: confirm the action layer routes that write through
`createSupabaseService()` (RLS bypass) with authorization filters preserved
as explicit `.eq()` clauses (L-048). Flag any user-scoped client write to
such a column as HIGH-A.
```

This bullet block is **non-negotiable** and goes verbatim into every
`_codex_review_prompt.md` for any wave that touches RLS-bound tables. The
adversarial framing alone is insufficient ??K-05's adversarial mindset
defaulted to `yagi_admin` perspective in Wave C and missed the actual
failure mode.

**Companion enforcement:** Builder grep audit pre-step (Phase 5 KICKOFF
K-05 protocol) MUST also grep for these patterns and confirm each hit is
either (a) `createSupabaseService()` or (b) status-column transition via
`transition_project_status` RPC:

```
# user-scoped client writes to deleted_at columns (flag for L-048 review)
grep -rn 'deleted_at.*new Date\|deleted_at.*now()' src/ | grep -v service

# user-scoped client writes to status column outside of transition RPC
grep -rn 'status.*draft\|status.*submitted\|status.*delivered\|status.*approved' src/app/ \
  | grep -v 'transition_project_status'
```

Any grep hit must appear either in K-05 review file list OR in an explicit
FU registration with rationale. Silent skips are forbidden.

---

## K-06 ??Design Review Gate (binding from 2026-05-04)

Added after Phase 5 Wave C Hotfix-1 ??yagi noted the absence of a dedicated
design-quality review layer. Wave C Hotfix-1 itself surfaced from yagi's
post-ship browser smoke discovery of 9 visual hierarchy / information weight
/ wording issues. K-05 (Codex) is code-quality focused (RLS / auth / edge
case). K-06 (fresh Opus instance) covers design quality, complementing K-05
in parallel.

### Why a separate gate

- Different model architectures catch different blind spots (same rationale
  as K-05 dual-model review). Code reviewer (Codex 5.5) defaults to
  correctness; design reviewer (Opus 4.7) defaults to UX hierarchy + visual
  weight + paradigm fit.
- Builder self-review is biased ??the same instance that wrote the code can
  rationalize its own design choices. K-06 spawns a *fresh Opus subagent*
  with no builder context, so it judges the diff cold.
- Codex doesn't "see" design intent (CSS class composition, spacing
  rhythm, sage accent placement). Opus 4.7 has the multimodal + design
  taste + paradigm-doc reasoning needed.

### When K-06 fires

| Wave shape | K-06? | Reason |
|---|---|---|
| UI surface (component, page, layout) | **MANDATORY** | Primary use case |
| Mixed (UI + schema/RLS/server) | MANDATORY for UI portion | Filter to UI-only files |
| Pure schema migration | SKIP | No design surface |
| Pure server action (no UI render) | SKIP | No design surface |
| Hotfix touching i18n strings only | OPTIONAL | Style judgement borderline |

### Reviewer setup

- Spawn **fresh Opus subagent** at wave end. Use `Task` tool with subagent
  type `general-purpose` (no builder history inherited).
- Subagent prompt = K-06 prompt template below + paste of (a) git diff,
  (b) PRODUCT-MASTER 짠C.x relevant section reference, (c) yagi-design-system
  v1.0 SKILL reference, (d) screenshot list if available (Builder captures
  `pnpm dev` running screenshots before subagent spawn).
- Run K-06 in parallel with K-05 (no dependency). Both reviewers operate on
  the same merged phase-branch tip.

### K-06 prompt template (verbatim, binding)

```
ROLE: Senior design engineer with strong UX taste. Reviewing a wave for
design quality, NOT code correctness (that's K-05's job).

INPUT:
- Diff (paths + hunks) at end of this prompt
- Reference: yagi-design-system v1.0 (SKILL.md attached)
- Reference: PRODUCT-MASTER.md 짠<wave-relevant section>
- Screenshots (if attached): browser views of the changed surfaces

FOUR-DIMENSION REVIEW (each scored HIGH/MED/LOW/PASS):

1. INFORMATION HIERARCHY
   - On first viewport, can a target user (described in PRODUCT-MASTER
     짠1 personas) identify the primary action within 5 seconds?
   - Is there exactly one primary CTA per screen view? (Multiple competing
     primaries = MED.)
   - Are status / state indicators consistent with their importance to the
     user's mental model? (e.g., "submitted" status badge prominent enough
     for someone wondering "did my submission go through?")
   - Flag verbose / underweight headlines, missing meta info, excessive
     whitespace where information is expected.

2. VISUAL WEIGHT DISTRIBUTION
   - Does primary action visually dominate secondary action?
   - Is the design system's accent color (yagi sage #71D083) used
     deliberately or sprinkled? (Sprinkled = MED.)
   - Are cards of equal weight ??making the page feel like "scattered
     form" instead of "prioritized layout"? Flag.
   - Hierarchy across status pill / timeline / cards / sidebar ??does
     each have appropriate weight?

3. LAYOUT / SPACING RHYTHM
   - Card padding consistent with paradigm tone? (Per PRODUCT-MASTER
     짠C.2 ??"?묒뾽 surface" tone, not enterprise admin tone.)
   - Empty space = intentional breathing room or content gap?
   - Border / radius / shadow tokens compliant with yagi-design-system
     v1.0 (border subtle rgba(255,255,255,0.11), radius 24/999/12,
     zero shadow)?
   - Information density appropriate ??not too sparse, not crowded?

4. UX FLOW CONTINUITY
   - Does the action flow (status pill ??CTA ??next view) feel
     continuous?
   - Is navigation between tabs / surfaces predictable? (e.g., scroll-to-
     top behavior, scroll position memory, breadcrumb trail.)
   - Hover / focus / active / disabled states defined for all interactive
     elements?
   - Keyboard tab order logical?
   - Mobile responsive ??does the layout collapse gracefully (not just
     "not break") at 360px / 768px?
   - Does the change align with PRODUCT-MASTER 짠C.x paradigm intent? Flag
     drift.

OUTPUT FORMAT:

## K-06 Design Review ??Wave <wave-id>

### Summary
- Overall: PASS / NEEDS_FIXES / BLOCK
- One-sentence verdict.

### Findings

[FINDING N] DIM: <1|2|3|4>  SEVERITY: HIGH|MED|LOW
File: <path:line range or component name>
Issue: <one paragraph ??what design intent is broken>
Suggested fix: <one paragraph ??concrete change>
Fix cost estimate: <inline|FU>

[FINDING N+1] ...

### Strengths (optional, max 3)
What the wave did well ??for builder calibration.

SEVERITY GUIDE:
- HIGH = ships in current state ??visible UX regression on real users.
  Inline fix mandatory before ff-merge.
- MED = noticeable polish gap. FU registration acceptable IF wave
  budget allows. Otherwise hotfix-N+1.
- LOW = nice-to-have. FU only.

=== END OF K-06 PROMPT ??DIFF FOLLOWS ===

<git diff main..HEAD here>

=== SCREENSHOTS (if any) ===

<paths or paste base64>
```

### Integration with K-05

Both reviewers run in parallel (no order dependency). Wave end `REVIEW`
gate:

```
1. Builder finishes all sub-tasks + barrier ff-merge to phase branch.
2. Builder runs `pnpm exec tsc --noEmit && pnpm lint && pnpm build`.
3. Builder spawns BOTH reviewers in parallel:
   - K-05: Codex via /codex:adversarial-review (focus per wave) OR
     direct codex CLI exec (per Phase 5 protocol).
   - K-06: Task tool fresh Opus subagent with K-06 prompt template.
4. Builder waits for both to return.
5. Builder merges both result files:
   - .yagi-autobuild/<wave>/_codex_review_loop1.md     (K-05)
   - .yagi-autobuild/<wave>/_k06_design_review.md      (K-06)
6. Builder writes consolidated verdict ??_<wave>_result.md:
   - K-05 verdict (CLEAN / findings count by severity)
   - K-06 verdict (PASS / NEEDS_FIXES / BLOCK + findings count)
   - Combined recommendation: GO / GO with FU / HOLD for hotfix
7. Chat report to yagi includes BOTH reviewer summaries.
```

### Verdict logic (binding)

| K-05 | K-06 | Combined | Action |
|---|---|---|---|
| CLEAN or LOW only | PASS | GO | ff-merge eligible |
| CLEAN or LOW only | NEEDS_FIXES MED | GO with FU | ff-merge + FU registered |
| CLEAN or LOW only | NEEDS_FIXES HIGH | HOLD | inline fix or hotfix-N+1 before ff-merge |
| CLEAN or LOW only | BLOCK | HOLD | hotfix mandatory |
| HIGH-A/B | any | HOLD | K-05 standard halt path |
| MED-B/C | any | yagi decision | scale-aware rule |

### Skip conditions

K-06 may be skipped only if:
- Pure schema migration (no `.tsx` / `.css` / Tailwind class changes).
- Pure server action (no UI render-affecting changes).
- Diff is < 50 lines AND no JSX touched AND no design system token
  reference.

Skip must be declared in the `_<wave>_result.md` with a one-line
justification. Silent skip = forbidden.

### Cost

- Per wave additional time: ~10??5 min (Opus subagent fresh-context call,
  parallel with K-05 so adds 0 to wall-clock if K-05 takes longer).
- Anthropic quota: ~30??0k tokens per K-06 review (full diff + reference
  context). Acceptable on standard subscription.
- ChatGPT Plus quota for K-05 unaffected.

### Builder grep audit pre-step (paired with K-06)

Before spawning K-06, Builder runs design-token compliance grep:

```bash
# yagi-design-system v1.0 compliance check
grep -rn 'shadow-' src/ | grep -v 'shadow-none\|shadow-inner' && echo "FAIL: shadow used"
grep -rn 'C8FF8C\|#C8FF8C\|lime-' src/ && echo "FAIL: legacy lime accent"
grep -rn 'border-[24]\|border-3' src/ && echo "FAIL: thick borders"
grep -rn 'rounded-\(none\|sm\|md\|lg\|xl\)' src/ | head -20
# Check radius compliance: only 24/999/12 derived tokens or rounded-(2xl|3xl|full)
```

Grep findings appended to K-06 input as "static design audit" section.

### Wave C Hotfix-1 retroactive K-06

Hotfix-1 itself was effectively a manual K-06 ??yagi did the design
review from screenshots, found 9 issues, kicked off the hotfix wave.
This K-06 protocol formalizes that loop: future waves run K-06 BEFORE
yagi smoke, surfacing the same class of issue at LOOP 1 instead of
post-ship. Hotfix-1 itself does NOT need retroactive K-06 (Builder
self-review across 5 axes already covered it; the wave is
yagi-smoke-pending).

---

**References:**
- Plugin: https://github.com/openai/codex-plugin-cc
- Codex config: https://developers.openai.com/codex/config-reference
- Original announcement: https://community.openai.com/t/introducing-codex-plugin-for-claude-code/1378186

2026-05-04T17:08:27.038202Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.7 seconds
Total output lines: 1105
Output:
supabase\migrations\20260422120000_phase_2_0_baseline.sql:118:  -- Grant workspace_admin role
supabase\migrations\20260422120000_phase_2_0_baseline.sql:120:  values (v_user_id, 'workspace_admin', v_workspace_id);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase\migrations\20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
supabase\migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase\migrations\20260422120000_phase_2_0_baseline.sql:1891:    deleted_at timestamp with time zone
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3000:CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3729:CREATE POLICY deliverables_rw ON public.project_deliverables TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3747:CREATE POLICY invoice_items_select ON public.invoice_line_items FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3768:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3775:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3809:CREATE POLICY meeting_attendees_insert ON public.meeting_attendees FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3818:CREATE POLICY meeting_attendees_select ON public.meeting_attendees FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3854:CREATE POLICY milestones_rw ON public.project_milestones TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3865:CREATE POLICY notif_events_select_own ON public.notification_events FOR SELECT USING ((user_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3872:CREATE POLICY notif_events_update_own ON public.notification_events FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3897:CREATE POLICY prefs_select_own ON public.notification_preferences FOR SELECT USING ((user_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3904:CREATE POLICY prefs_update_own ON public.notification_preferences FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3911:CREATE POLICY prefs_upsert_own ON public.notification_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3952:CREATE POLICY preprod_comments_select ON public.preprod_frame_comments FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3961:CREATE POLICY preprod_comments_update ON public.preprod_frame_comments FOR UPDATE USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3990:CREATE POLICY preprod_frames_delete ON public.preprod_frames FOR DELETE USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3999:CREATE POLICY preprod_frames_insert ON public.preprod_frames FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4008:CREATE POLICY preprod_frames_select ON public.preprod_frames FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4017:CREATE POLICY preprod_frames_update ON public.preprod_frames FOR UPDATE USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4028:CREATE POLICY preprod_reactions_select ON public.preprod_frame_reactions FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4043:CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4050:CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4057:CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4064:CREATE POLICY proj_refs_rw ON public.project_references TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4075:CREATE POLICY proj_threads_rw ON public.project_threads TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4134:-- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4150:CREATE POLICY showcase_media_delete ON public.showcase_media FOR DELETE USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4159:CREATE POLICY showcase_media_insert ON public.showcase_media FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4168:CREATE POLICY showcase_media_select ON public.showcase_media FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4179:CREATE POLICY showcase_media_update ON public.showcase_media FOR UPDATE USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4248:CREATE POLICY tc_attachments_insert ON public.team_channel_message_attachments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4257:CREATE POLICY tc_attachments_select ON public.team_channel_message_attachments FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4279:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4286:CREATE POLICY team_channel_messages_insert ON public.team_channel_messages FOR INSERT WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4295:CREATE POLICY team_channel_messages_select ON public.team_channel_messages FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4304:CREATE POLICY team_channel_messages_update ON public.team_channel_messages FOR UPDATE USING ((author_id = auth.uid())) WITH CHECK ((author_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4353:CREATE POLICY thread_message_attachments_delete ON public.thread_message_attachments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4362:CREATE POLICY thread_message_attachments_insert ON public.thread_message_attachments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4373:CREATE POLICY thread_message_attachments_select ON public.thread_message_attachments FOR SELE…32119 tokens truncated…grations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:75:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:82:CREATE POLICY "project_licenses_select_owner" ON project_licenses
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:90:-- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 stage)
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:91:CREATE POLICY "project_licenses_write_admin" ON project_licenses
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:96:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:102:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:8:    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:11:-- yagi_admin workspace requires a MANUAL UPDATE after verify
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:69:-- SELECT: yagi_admin (all rows) + project owner client (own rows)
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:70:CREATE POLICY "project_licenses_select_admin" ON project_licenses
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:75:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:82:CREATE POLICY "project_licenses_select_owner" ON project_licenses
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:90:-- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 stage)
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:91:CREATE POLICY "project_licenses_write_admin" ON project_licenses
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:96:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:102:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:61:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:61:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:23:--   2. yagi_admin: bypass (admin-driven role changes via support tools).
supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:54:  -- yagi_admin can change roles freely (e.g., support migrations,
supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:56:  IF public.is_yagi_admin(v_caller) THEN
supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:97:  '(artist, future yagi_admin) and forbids non-NULL -> non-NULL role '
supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:98:  'transitions for non-admin callers. service_role + yagi_admin bypass.';
.\supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:23:--   2. yagi_admin: bypass (admin-driven role changes via support tools).
.\supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:54:  -- yagi_admin can change roles freely (e.g., support migrations,
.\supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:56:  IF public.is_yagi_admin(v_caller) THEN
.\supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:97:  '(artist, future yagi_admin) and forbids non-NULL -> non-NULL role '
.\supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:98:  'transitions for non-admin callers. service_role + yagi_admin bypass.';
.\supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:37:--   4. Keeps the existing auth + project status gates (yagi_admin OR
.\supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:101:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:37:--   4. Keeps the existing auth + project status gates (yagi_admin OR
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:101:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:5:-- {brand, artist, yagi_admin}. The `ws_update_admin` RLS policy
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:6:-- permits is_ws_admin OR is_yagi_admin to UPDATE the workspaces row,
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:7:-- and the column-set is unconstrained — so a workspace_admin (who
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:9:-- 'yagi_admin' and any code path that branches on workspaces.kind
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:26:-- OR is_yagi_admin), so workspace admins can edit their own row's
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:27:-- editable columns. yagi_admin can also use the service-role client
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:5:-- {brand, artist, yagi_admin}. The `ws_update_admin` RLS policy
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:6:-- permits is_ws_admin OR is_yagi_admin to UPDATE the workspaces row,
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:7:-- and the column-set is unconstrained — so a workspace_admin (who
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:9:-- 'yagi_admin' and any code path that branches on workspaces.kind
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:26:-- OR is_yagi_admin), so workspace admins can edit their own row's
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:27:-- editable columns. yagi_admin can also use the service-role client
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:65:-- SELECT: project 의 workspace member 또는 yagi_admin
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:66:CREATE POLICY "briefing_documents_select" ON briefing_documents
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:76:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:81:-- workspace AND created_by MUST equal auth.uid() (no spoof). yagi_admin
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:85:CREATE POLICY "briefing_documents_insert" ON briefing_documents
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:98:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:104:-- yagi_admin bypass.
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:110:CREATE POLICY "briefing_documents_update" ON briefing_documents
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:124:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:138:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:144:-- yagi_admin not granted DELETE here (admin destructive action goes
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:147:CREATE POLICY "briefing_documents_delete" ON briefing_documents
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:65:-- SELECT: project 의 workspace member 또는 yagi_admin
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:66:CREATE POLICY "briefing_documents_select" ON briefing_documents
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:76:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:81:-- workspace AND created_by MUST equal auth.uid() (no spoof). yagi_admin
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:85:CREATE POLICY "briefing_documents_insert" ON briefing_documents
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:98:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:104:-- yagi_admin bypass.
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:110:CREATE POLICY "briefing_documents_update" ON briefing_documents
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:124:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:138:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:144:-- yagi_admin not granted DELETE here (admin destructive action goes
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:147:CREATE POLICY "briefing_documents_delete" ON briefing_documents
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:24:-- yagi_admin bypass branch is preserved AS-IS (status-agnostic) so the
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:40:CREATE POLICY "briefing_documents_insert" ON briefing_documents
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:54:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:64:CREATE POLICY "briefing_documents_update" ON briefing_documents
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:79:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:94:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:24:-- yagi_admin bypass branch is preserved AS-IS (status-agnostic) so the
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:40:CREATE POLICY "briefing_documents_insert" ON briefing_documents
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:54:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:64:CREATE POLICY "briefing_documents_update" ON briefing_documents
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:79:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:94:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:6:-- (deleted_at = now()) then INSERTs a fresh draft. Without this index
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:9:-- ignores deleted_at, so the fresh INSERT collides with 23505.
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:12:-- deleted_at IS NULL. Soft-deleted drafts no longer occupy the slot
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:14:-- side is unchanged: a live draft with NULL deleted_at still blocks
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:26:    AND deleted_at IS NULL;
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:39:  IF v_indexdef NOT LIKE '%deleted_at IS NULL%' THEN
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:40:    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq predicate does not include deleted_at IS NULL — got: %', v_indexdef;
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:6:-- (deleted_at = now()) then INSERTs a fresh draft. Without this index
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:9:-- ignores deleted_at, so the fresh INSERT collides with 23505.
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:12:-- deleted_at IS NULL. Soft-deleted drafts no longer occupy the slot
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:14:-- side is unchanged: a live draft with NULL deleted_at still blocks
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:26:    AND deleted_at IS NULL;
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:39:  IF v_indexdef NOT LIKE '%deleted_at IS NULL%' THEN
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:40:    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq predicate does not include deleted_at IS NULL — got: %', v_indexdef;
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:4:-- the workspace creator the 'workspace_admin' role. The original
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:5:-- transition_project_status RPC matched the actor as 'workspace_admin'
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:7:-- workspace_admin matrix does NOT include `draft → submitted`. Result:
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:18:--   ELSIF v_is_yagi_admin THEN
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:19:--     v_actor_role := 'yagi_admin';
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:21:--     v_actor_role := 'workspace_admin';
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:26:-- Side effect: a yagi_admin acting on a project they themselves created
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:28:-- yagi_admin is internal staff role; the "yagi staff member also creates
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:31:-- yagi_admin draft → submitted entry to is_valid_transition's matrix.
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:37:-- nor a workspace_admin for the project's workspace).
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:62:  v_is_yagi_admin      boolean;
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:71:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:86:       AND role = 'workspace_admin'
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:92:  -- workspace_admin / yagi_admin privileges.
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:95:  ELSIF v_is_yagi_admin THEN
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:96:    v_actor_role := 'yagi_admin';
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:98:    v_actor_role := 'workspace_admin';
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:4:-- the workspace creator the 'workspace_admin' role. The original
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:5:-- transition_project_status RPC matched the actor as 'workspace_admin'
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:7:-- workspace_admin matrix does NOT include `draft → submitted`. Result:
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:18:--   ELSIF v_is_yagi_admin THEN
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:19:--     v_actor_role := 'yagi_admin';
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:21:--     v_actor_role := 'workspace_admin';
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:26:-- Side effect: a yagi_admin acting on a project they themselves created
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:28:-- yagi_admin is internal staff role; the "yagi staff member also creates
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:31:-- yagi_admin draft → submitted entry to is_valid_transition's matrix.
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:37:-- nor a workspace_admin for the project's workspace).
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:62:  v_is_yagi_admin      boolean;
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:71:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:86:       AND role = 'workspace_admin'
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:92:  -- workspace_admin / yagi_admin privileges.
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:95:  ELSIF v_is_yagi_admin THEN
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:96:    v_actor_role := 'yagi_admin';
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:98:    v_actor_role := 'workspace_admin';
.\supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:20:--   actor_role='yagi_admin'      -> NO * -> draft
.\supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:21:--   actor_role='workspace_admin' -> NO * -> draft
.\supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:33:-- a workspace creator who also holds workspace_admin will be resolved
.\supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:77:    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
.\supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:78:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:20:--   actor_role='yagi_admin'      -> NO * -> draft
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:21:--   actor_role='workspace_admin' -> NO * -> draft
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:33:-- a workspace creator who also holds workspace_admin will be resolved
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:77:    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:78:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
rg: db: 지정된 파일을 찾을 수 없습니다. (os error 2)

 exited 1 in 708ms:
supabase\migrations\20260422120000_phase_2_0_baseline.sql:118:  -- Grant workspace_admin role
supabase\migrations\20260422120000_phase_2_0_baseline.sql:120:  values (v_user_id, 'workspace_admin', v_workspace_id);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase\migrations\20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
supabase\migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase\migrations\20260422120000_phase_2_0_baseline.sql:1891:    deleted_at timestamp with time zone
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3000:CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3729:CREATE POLICY deliverables_rw ON public.project_deliverables TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3747:CREATE POLICY invoice_items_select ON public.invoice_line_items FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3768:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3775:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3809:CREATE POLICY meeting_attendees_insert ON public.meeting_attendees FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3818:CREATE POLICY meeting_attendees_select ON public.meeting_attendees FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3854:CREATE POLICY milestones_rw ON public.project_milestones TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3865:CREATE POLICY notif_events_select_own ON public.notification_events FOR SELECT USING ((user_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3872:CREATE POLICY notif_events_update_own ON public.notification_events FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3897:CREATE POLICY prefs_select_own ON public.notification_preferences FOR SELECT USING ((user_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3904:CREATE POLICY prefs_update_own ON public.notification_preferences FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3911:CREATE POLICY prefs_upsert_own ON public.notification_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3952:CREATE POLICY preprod_comments_select ON public.preprod_frame_comments FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3961:CREATE POLICY preprod_comments_update ON public.preprod_frame_comments FOR UPDATE USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3990:CREATE POLICY preprod_frames_delete ON public.preprod_frames FOR DELETE USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3999:CREATE POLICY preprod_frames_insert ON public.preprod_frames FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4008:CREATE POLICY preprod_frames_select ON public.preprod_frames FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4017:CREATE POLICY preprod_frames_update ON public.preprod_frames FOR UPDATE USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4028:CREATE POLICY preprod_reactions_select ON public.preprod_frame_reactions FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4043:CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4050:CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4057:CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4064:CREATE POLICY proj_refs_rw ON public.project_references TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4075:CREATE POLICY proj_threads_rw ON public.project_threads TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4134:-- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4150:CREATE POLICY showcase_media_delete ON public.showcase_media FOR DELETE USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4159:CREATE POLICY showcase_media_insert ON public.showcase_media FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4168:CREATE POLICY showcase_media_select ON public.showcase_media FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4179:CREATE POLICY showcase_media_update ON public.showcase_media FOR UPDATE USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4248:CREATE POLICY tc_attachments_insert ON public.team_channel_message_attachments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4257:CREATE POLICY tc_attachments_select ON public.team_channel_message_attachments FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4279:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4286:CREATE POLICY team_channel_messages_insert ON public.team_channel_messages FOR INSERT WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4295:CREATE POLICY team_channel_messages_select ON public.team_channel_messages FOR SELECT USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4304:CREATE POLICY team_channel_messages_update ON public.team_channel_messages FOR UPDATE USING ((author_id = auth.uid())) WITH CHECK ((author_id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4353:CREATE POLICY thread_message_attachments_delete ON public.thread_message_attachments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4362:CREATE POLICY thread_message_attachments_insert ON public.thread_message_attachments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4373:CREATE POLICY thread_message_attachments_select ON public.thread_message_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4390:CREATE POLICY thread_messages_insert ON public.thread_messages FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4400:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4407:CREATE POLICY thread_msgs_rw ON public.thread_messages TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4420:CREATE POLICY unsub_tokens_deny_all ON public.notification_unsubscribe_tokens USING (false) WITH CHECK (false);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4451:-- Name: user_roles user_roles_yagi_admin; Type: POLICY; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4479:CREATE POLICY ws_create_any_auth ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4544:CREATE POLICY avatars_read ON storage.objects FOR SELECT USING ((bucket_id = 'avatars'::text));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4551:CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND (owner = auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4558:CREATE POLICY avatars_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4565:CREATE POLICY brand_logos_read ON storage.objects FOR SELECT USING ((bucket_id = 'brand-logos'::text));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4572:CREATE POLICY brand_logos_write ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'brand-logos'::text));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4597:CREATE POLICY deliverables_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'project-deliverables'::text));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4604:CREATE POLICY deliverables_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'project-deliverables'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4653:CREATE POLICY refs_insert_authorized ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'project-references'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4662:CREATE POLICY refs_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'project-references'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4684:CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4691:CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4708:CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4715:CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4729:CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4736:CREATE POLICY "tc-attachments read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4743:CREATE POLICY "tc-attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4750:CREATE POLICY thread_attachments_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4759:CREATE POLICY thread_attachments_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4768:CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4778:CREATE POLICY thread_attachments_select ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4793:CREATE POLICY ws_logos_read ON storage.objects FOR SELECT USING ((bucket_id = 'workspace-logos'::text));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4800:CREATE POLICY ws_logos_write ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'workspace-logos'::text));
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:34:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:38:-- Same shape as #2: USING limits WHICH rows a yagi_admin can UPDATE, but
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:48:        AND public.is_yagi_admin(auth.uid())
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:63:      OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:79:-- Same class of gap: a yagi_admin authorized to UPDATE a showcase-media
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:85:    AND public.is_yagi_admin(auth.uid())
supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:96:    AND public.is_yagi_admin(auth.uid())
supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:15:-- inserts to ws_admin / yagi_admin, and the caller has already been
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:229:CREATE POLICY creators_select ON public.creators
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:235:CREATE POLICY creators_insert_self ON public.creators
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:244:CREATE POLICY creators_update_self ON public.creators
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:253:CREATE POLICY studios_select ON public.studios
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:259:CREATE POLICY studios_insert_self ON public.studios
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:268:CREATE POLICY studios_update_self ON public.studios
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:274:CREATE POLICY challenges_select_public ON public.challenges
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:275:  FOR SELECT USING (state <> 'draft' OR public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:277:CREATE POLICY challenges_admin_insert ON public.challenges
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:278:  FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:280:CREATE POLICY challenges_admin_update ON public.challenges
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:281:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:282:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:284:CREATE POLICY challenges_admin_delete ON public.challenges
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:285:  FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:288:-- owner UPDATE until closed; admin read/update via is_yagi_admin.
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:291:CREATE POLICY challenge_submissions_select ON public.challenge_submissions
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:294:CREATE POLICY challenge_submissions_insert_self ON public.challenge_submissions
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:307:CREATE POLICY challenge_submissions_update_self ON public.challenge_submissions
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:322:CREATE POLICY challenge_submissions_admin_update ON public.challenge_submissions
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:323:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:324:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:329:CREATE POLICY challenge_votes_select ON public.challenge_votes
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:332:CREATE POLICY challenge_votes_insert_self ON public.challenge_votes
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:344:CREATE POLICY challenge_judgments_admin_all ON public.challenge_judgments
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:345:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:346:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:351:CREATE POLICY showcase_challenge_winners_select ON public.showcase_challenge_winners
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:354:CREATE POLICY showcase_challenge_winners_admin_write ON public.showcase_challenge_winners
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:355:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:356:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:11:--        trigger; admin bypasses via is_yagi_admin.
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:58:  IF public.is_yagi_admin(auth.uid()) THEN
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:132:CREATE POLICY creators_update_self ON public.creators
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:150:CREATE POLICY studios_update_self ON public.studios
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:260:CREATE POLICY challenges_admin_insert ON public.challenges
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:263:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:268:CREATE POLICY challenge_judgments_admin_all ON public.challenge_judgments
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:270:  USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:272:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:277:CREATE POLICY showcase_challenge_winners_admin_write ON public.showcase_challenge_winners
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:279:  USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:281:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:45:CREATE POLICY handle_history_owner_select ON public.handle_history
supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:51:CREATE POLICY handle_history_admin_select ON public.handle_history
supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:53:  USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:35:CREATE POLICY challenge_judgments_admin_select ON public.challenge_judgments
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:37:  USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:39:CREATE POLICY challenge_judgments_admin_insert ON public.challenge_judgments
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:42:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:46:CREATE POLICY challenge_judgments_admin_update ON public.challenge_judgments
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:48:  USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:49:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:51:CREATE POLICY challenge_judgments_admin_delete ON public.challenge_judgments
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:53:  USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:58:CREATE POLICY showcase_challenge_winners_admin_insert ON public.showcase_challenge_winners
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:61:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:65:CREATE POLICY showcase_challenge_winners_admin_update ON public.showcase_challenge_winners
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:67:  USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:68:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:70:CREATE POLICY showcase_challenge_winners_admin_delete ON public.showcase_challenge_winners
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:72:  USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:94:  IF public.is_yagi_admin(auth.uid()) THEN
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:15:CREATE POLICY challenge_submissions_select_public
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:28:CREATE POLICY challenge_submissions_select_owner
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:34:CREATE POLICY challenge_submissions_select_admin
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:37:  USING (public.is_yagi_admin((select auth.uid())));
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:45:CREATE POLICY challenge_votes_select_owner
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:50:CREATE POLICY challenge_votes_select_admin
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:53:  USING (public.is_yagi_admin((select auth.uid())));
supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:123:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase\migrations\20260424030000_phase_2_5_g8_hardening_v2.sql:44:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase\migrations\20260424040000_phase_2_5_g8_hardening_v3.sql:41:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:55:  'verified_at stamped manually by yagi_admin after sales-ops verification of company identity.';
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:139:CREATE POLICY clients_select_self_or_admin
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:145:    OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:149:CREATE POLICY clients_insert_self
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:162:CREATE POLICY clients_update_self_or_admin
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:168:    OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:172:    OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:182:CREATE POLICY commission_intakes_select_owner_or_admin
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:188:    OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:198:CREATE POLICY commission_intakes_insert_self_client
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:216:CREATE POLICY commission_intakes_update_owner_pre_response
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:231:CREATE POLICY commission_intakes_update_admin
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:235:  USING (public.is_yagi_admin((select auth.uid())))
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:236:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:263:  v_is_admin := public.is_yagi_admin(v_caller);
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:320:-- (yagi_admin) and service-role direct writes bypass.
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:336:  -- yagi_admin can change roles freely (e.g., support migrations).
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:337:  IF public.is_yagi_admin(v_caller) THEN
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:11:--   6. Lock state-transition + column-guard trigger (yagi_admin-only flip)
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:24:--   - DROP POLICY IF EXISTS / CREATE POLICY (re-apply safe)
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:59:  'status: editing (default) or locked (production frozen, yagi_admin-only flip).';
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:172:--     OR yagi_admin. Brief Board is collaborative (Y3: admin can fill draft).
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:175:--   - status flip ('editing' ↔ 'locked'): yagi_admin only — enforced by
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:185:CREATE POLICY project_briefs_select
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:195:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:201:CREATE POLICY project_briefs_insert
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:211:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:221:-- columns. yagi_admin bypasses the editing check via the second policy.
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:223:CREATE POLICY project_briefs_update_member
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:244:CREATE POLICY project_briefs_update_yagi
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:248:  USING (public.is_yagi_admin((select auth.uid())))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:249:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:255:CREATE POLICY project_brief_versions_select
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:265:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:270:-- INSERT: workspace member or yagi_admin. created_by must equal auth.uid()
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:275:CREATE POLICY project_brief_versions_insert
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:286:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:297:CREATE POLICY project_brief_assets_select
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:307:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:313:CREATE POLICY project_brief_assets_insert
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:329:-- DELETE: own uploads or yagi_admin (SPEC §3.6).
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:331:CREATE POLICY project_brief_assets_delete
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:344:CREATE POLICY embed_cache_select
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:363:-- Guards (non-yagi_admin caller):
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:369:--     1. status frozen (lock/unlock is yagi_admin only — SPEC §5.4)
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:379:-- yagi_admin bypasses all column guards (lock/unlock requires it; admin
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:390:  v_is_yagi_admin boolean := false;
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:397:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:399:  IF v_is_yagi_admin THEN
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:428:      'only yagi_admin may change project_brief status'
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:434:      'only yagi_admin may change tiptap_schema_version'
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:506:-- must unlock first (yagi_admin only). Defense-in-depth alongside
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:519:  -- a yagi_admin lock arriving while we're snapshotting). Without this,
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:18:-- default in supabase). Explicit auth check via is_ws_member / is_yagi_admin
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:65:  -- Authorize: workspace member of the owning project, or yagi_admin.
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:72:    public.is_yagi_admin(v_caller)
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:110:  'DEFINER with explicit is_ws_member / is_yagi_admin authorization mirroring '
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:12:--        - yagi_admin only
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:67:  v_is_admin := public.is_yagi_admin(v_caller);
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:120:  IF NOT public.is_yagi_admin(v_caller) THEN
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:176:  --    INSERTs; this RPC is yagi_admin so the bypass branch applies.
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:232:  --    yagi_admin.
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:264:  'converted, and notify the client. yagi_admin only. Idempotent on re-call.';
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:8:-- Finding 1 — projects_update WITH CHECK gap
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:10:--     (is_ws_admin(...) OR is_yagi_admin(...))
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:11:--   which permits a non-yagi workspace_admin to write deleted_at = now()
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:16:--   ws_admin from producing a row with deleted_at IS NOT NULL.
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:18:-- Finding 2 — save_brief_version did not gate on deleted_at
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin without checking projects.deleted_at.
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:24:--   project_brief_versions. Wrap with an early `deleted_at IS NULL`
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:25:--   gate (yagi_admin bypasses, matching the read-side pattern).
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:27:-- Both fixes are idempotent (DROP POLICY IF EXISTS + CREATE POLICY,
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:32:-- 1. projects_update — tighten WITH CHECK ----------------------------
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:34:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:36:CREATE POLICY projects_update ON public.projects
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:41:      AND deleted_at IS NULL
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:43:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:48:      AND deleted_at IS NULL
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:50:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:67:  v_deleted_at timestamptz;
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:89:  -- trashed projects. yagi_admin bypasses (so a yagi-side restore +
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:91:  SELECT p.workspace_id, p.deleted_at
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:92:    INTO v_workspace_id, v_deleted_at
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:97:    public.is_yagi_admin(v_caller)
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:103:  IF v_deleted_at IS NOT NULL AND NOT public.is_yagi_admin(v_caller) THEN
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:4:-- yagi_admin needs to remove erroneous projects (test data, accidental
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:7:-- automatically; yagi_admin reads see everything so the trash console
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:11:--   1. column           — projects.deleted_at timestamptz
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:12:--   2. RLS read         — ws_member sees deleted_at IS NULL; yagi_admin sees all
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:13:--   3. RLS update       — ws_admin can only update non-deleted rows; yagi_admin
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:15:--   4. cron             — every 6h, hard-DELETE rows with deleted_at < now()-3d
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:21:--   ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS + CREATE POLICY,
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:36:  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:38:COMMENT ON COLUMN public.projects.deleted_at IS
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:43:CREATE INDEX IF NOT EXISTS projects_deleted_at_idx
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:44:  ON public.projects (deleted_at)
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:45:  WHERE deleted_at IS NOT NULL;
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:51:CREATE POLICY projects_read ON public.projects
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:56:      AND deleted_at IS NULL
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:58:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:61:-- 3. RLS — replace projects_update ------------------------------------
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:63:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:65:CREATE POLICY projects_update ON public.projects
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:70:      AND deleted_at IS NULL
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:72:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:76:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:96:   WHERE p.deleted_at IS NOT NULL
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:97:     AND p.deleted_at < now() - interval '3 days'
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:14:--     or a yagi_admin. Body up to 4000 chars; image_url is the public
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:21:--   yagi_admin: full access.
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:84:CREATE POLICY support_threads_select ON public.support_threads
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:87:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:93:CREATE POLICY support_threads_insert ON public.support_threads
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:96:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:105:CREATE POLICY support_threads_update ON public.support_threads
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:108:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:112:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:119:CREATE POLICY support_messages_select ON public.support_messages
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:126:          public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:134:CREATE POLICY support_messages_insert ON public.support_messages
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:143:          public.is_yagi_admin(auth.uid())
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:150:-- read-only audit access. Only the client-owner and yagi_admin can post.
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:163:  -- the inserting author to UPDATE, but yagi_admin replies should
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:4:-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:28:CREATE POLICY projects_insert ON public.projects
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:32:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:37:  'Previously restricted to ws_admin + yagi_admin, blocking all client-role '
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:38:  'project submissions. is_yagi_admin path preserved for admin console creates.';
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:32:--        - ws_admin / yagi_admin keep their existing full-access lanes.
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:36:-- DROP POLICY IF EXISTS + CREATE POLICY, CREATE OR REPLACE TRIGGER.
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:77:CREATE POLICY meetings_insert ON public.meetings
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:81:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:93:CREATE POLICY meetings_update ON public.meetings
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:97:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:105:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:16:--   update. yagi_admin and ws_admin lanes are unchanged.
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:35:--   'closed'. Intent: only yagi_admin can close/reopen. Tighten:
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:41:--   gains an is_yagi_admin guard in the same review loop.)
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:43:-- All changes idempotent (DROP POLICY IF EXISTS + CREATE POLICY,
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:85:CREATE POLICY meetings_update ON public.meetings
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:89:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:98:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:110:CREATE POLICY support_threads_insert ON public.support_threads
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:113:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:126:CREATE POLICY support_messages_insert ON public.support_messages
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:135:          public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:144:-- 5. support_threads_update — only yagi_admin may flip status ------
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:148:CREATE POLICY support_threads_update ON public.support_threads
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:151:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:155:    public.is_yagi_admin(auth.uid())
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:167:-- a BEFORE UPDATE trigger that raises if the caller is NOT a yagi_admin
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:178:     AND NOT public.is_yagi_admin(auth.uid())
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:21:--   'yagi_admin'      — user_roles.role = 'yagi_admin'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:22:--   'workspace_admin' — user_roles.role = 'workspace_admin'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:145:                                   'client', 'yagi_admin', 'workspace_admin', 'system'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:258:-- actor_role IN ('yagi_admin','workspace_admin'):
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:306:    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:307:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:350:--   yagi_admin  → actor_role = 'yagi_admin'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:351:--   workspace_admin (for the same workspace as the project) → 'workspace_admin'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:359:--   admin path:  caller must have yagi_admin or workspace_admin role for project's workspace
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:382:  v_is_yagi_admin      boolean;
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:394:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:411:       AND role = 'workspace_admin'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:416:  IF v_is_yagi_admin THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:417:    v_actor_role := 'yagi_admin';
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:419:    v_actor_role := 'workspace_admin';
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:431:  -- on any project in the workspace (or any project for yagi_admin).
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:503:--   AND NOT is_yagi_admin(auth.uid())  -- yagi_admin admin console escape hatch
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:514:--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:538:  -- Allow yagi_admin for emergency console fixes
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:539:  IF public.is_yagi_admin(auth.uid()) THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:560:  'local.transition_rpc_active=true, (2) yagi_admin bypass for emergencies.';
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:570:CREATE POLICY psh_select_client ON public.project_status_history
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:580:-- SELECT: yagi_admin can read all history
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:582:CREATE POLICY psh_select_admin ON public.project_status_history
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:584:  USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:589:CREATE POLICY psh_insert_deny ON public.project_status_history
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:595:CREATE POLICY psh_update_deny ON public.project_status_history
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:601:CREATE POLICY psh_delete_deny ON public.project_status_history
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:609:-- yagi_admin). Phase 3.0 replaces it with split CRUD policies:
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:611:--   - yagi_admin: SELECT only (admins read references but client owns them)
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:618:-- SELECT: client (own projects) + yagi_admin (all)
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:620:CREATE POLICY pref_select_client ON public.project_references
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:628:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:633:CREATE POLICY pref_insert_client ON public.project_references
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:645:CREATE POLICY pref_update_client ON public.project_references
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:664:CREATE POLICY pref_delete_client ON public.project_references
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:677:-- The existing projects_update policy (from Phase 2.8.2 hardening) allows
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:678:-- ws_admin or yagi_admin to update non-deleted rows. The trigger guard in
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:687:-- and deleted_at IS NULL. Admins retain their existing path.
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:689:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:691:CREATE POLICY projects_update ON public.projects
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:698:      AND deleted_at IS NULL
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:703:      AND deleted_at IS NULL
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:705:    -- yagi_admin: unrestricted (including trashed project restore)
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:706:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:709:    -- Client: own project, non-deleted only (no writing deleted_at)
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:712:      AND deleted_at IS NULL
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:717:      AND deleted_at IS NULL
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:719:    -- yagi_admin: unrestricted
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:720:    OR public.is_yagi_admin(auth.uid())
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:723:COMMENT ON POLICY projects_update ON public.projects IS
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:726:  'yagi_admin unrestricted. Status column changes are additionally gated by '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:728:  'or yagi_admin may change projects.status.';
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:7:-- another workspace, after which the workspace_admin SELECT lane in
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:14:-- Fix: support_threads_update is now yagi_admin-only. The application
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:18:-- SECURITY DEFINER trigger. yagi_admin retains full UPDATE access for
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:25:-- Idempotent (DROP POLICY IF EXISTS + CREATE POLICY).
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:31:CREATE POLICY support_threads_update ON public.support_threads
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:33:  USING (public.is_yagi_admin(auth.uid()))
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:34:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260429113853_phase_3_1_project_board.sql:44:CREATE POLICY project_boards_select_client ON project_boards
supabase\migrations\20260429113853_phase_3_1_project_board.sql:47:    is_yagi_admin(auth.uid())
supabase\migrations\20260429113853_phase_3_1_project_board.sql:56:CREATE POLICY project_boards_insert_via_rpc ON project_boards
supabase\migrations\20260429113853_phase_3_1_project_board.sql:60:CREATE POLICY project_boards_update_client ON project_boards
supabase\migrations\20260429113853_phase_3_1_project_board.sql:63:    is_yagi_admin(auth.uid())
supabase\migrations\20260429113853_phase_3_1_project_board.sql:75:    is_yagi_admin(auth.uid())
supabase\migrations\20260429113853_phase_3_1_project_board.sql:92:CREATE POLICY project_board_versions_select ON project_board_versions
supabase\migrations\20260429113853_phase_3_1_project_board.sql:95:    is_yagi_admin(auth.uid())
supabase\migrations\20260429113853_phase_3_1_project_board.sql:107:CREATE POLICY project_board_versions_insert_trigger ON project_board_versions
supabase\migrations\20260429113853_phase_3_1_project_board.sql:166:  IF NOT is_yagi_admin(auth.uid()) THEN
supabase\migrations\20260429113853_phase_3_1_project_board.sql:167:    RAISE EXCEPTION 'init_project_board: caller must be yagi_admin';
supabase\migrations\20260429113853_phase_3_1_project_board.sql:193:  IF NOT is_yagi_admin(auth.uid()) THEN
supabase\migrations\20260429113853_phase_3_1_project_board.sql:194:    RAISE EXCEPTION 'toggle_project_board_lock: caller must be yagi_admin';
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:55:  'verified_at stamped manually by yagi_admin after sales-ops verification of company identity.';
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:139:CREATE POLICY clients_select_self_or_admin
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:145:    OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:149:CREATE POLICY clients_insert_self
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:162:CREATE POLICY clients_update_self_or_admin
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:168:    OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:172:    OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:182:CREATE POLICY commission_intakes_select_owner_or_admin
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:188:    OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:198:CREATE POLICY commission_intakes_insert_self_client
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:216:CREATE POLICY commission_intakes_update_owner_pre_response
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:231:CREATE POLICY commission_intakes_update_admin
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:235:  USING (public.is_yagi_admin((select auth.uid())))
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:236:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:263:  v_is_admin := public.is_yagi_admin(v_caller);
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:320:-- (yagi_admin) and service-role direct writes bypass.
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:336:  -- yagi_admin can change roles freely (e.g., support migrations).
.\supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:337:  IF public.is_yagi_admin(v_caller) THEN
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:4:-- yagi_admin needs to remove erroneous projects (test data, accidental
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:7:-- automatically; yagi_admin reads see everything so the trash console
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:11:--   1. column           — projects.deleted_at timestamptz
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:12:--   2. RLS read         — ws_member sees deleted_at IS NULL; yagi_admin sees all
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:13:--   3. RLS update       — ws_admin can only update non-deleted rows; yagi_admin
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:15:--   4. cron             — every 6h, hard-DELETE rows with deleted_at < now()-3d
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:21:--   ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS + CREATE POLICY,
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:36:  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:38:COMMENT ON COLUMN public.projects.deleted_at IS
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:43:CREATE INDEX IF NOT EXISTS projects_deleted_at_idx
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:44:  ON public.projects (deleted_at)
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:45:  WHERE deleted_at IS NOT NULL;
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:51:CREATE POLICY projects_read ON public.projects
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:56:      AND deleted_at IS NULL
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:58:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:61:-- 3. RLS — replace projects_update ------------------------------------
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:63:DROP POLICY IF EXISTS projects_update ON public.projects;
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:65:CREATE POLICY projects_update ON public.projects
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:70:      AND deleted_at IS NULL
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:72:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:76:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:96:   WHERE p.deleted_at IS NOT NULL
.\supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:97:     AND p.deleted_at < now() - interval '3 days'
.\supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:12:--        - yagi_admin only
.\supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:67:  v_is_admin := public.is_yagi_admin(v_caller);
.\supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:120:  IF NOT public.is_yagi_admin(v_caller) THEN
.\supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:176:  --    INSERTs; this RPC is yagi_admin so the bypass branch applies.
.\supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:232:  --    yagi_admin.
.\supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:264:  'converted, and notify the client. yagi_admin only. Idempotent on re-call.';
.\supabase\migrations\20260424040000_phase_2_5_g8_hardening_v3.sql:41:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
.\supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:4:-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
.\supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:28:CREATE POLICY projects_insert ON public.projects
.\supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:32:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:37:  'Previously restricted to ws_admin + yagi_admin, blocking all client-role '
.\supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:38:  'project submissions. is_yagi_admin path preserved for admin console creates.';
.\supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:18:-- default in supabase). Explicit auth check via is_ws_member / is_yagi_admin
.\supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:65:  -- Authorize: workspace member of the owning project, or yagi_admin.
.\supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:72:    public.is_yagi_admin(v_caller)
.\supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:110:  'DEFINER with explicit is_ws_member / is_yagi_admin authorization mirroring '
.\supabase\migrations\20260424030000_phase_2_5_g8_hardening_v2.sql:44:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:21:--   'yagi_admin'      — user_roles.role = 'yagi_admin'
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:22:--   'workspace_admin' — user_roles.role = 'workspace_admin'
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:145:                                   'client', 'yagi_admin', 'workspace_admin', 'system'
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:258:-- actor_role IN ('yagi_admin','workspace_admin'):
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:306:    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:307:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:350:--   yagi_admin  → actor_role = 'yagi_admin'
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:351:--   workspace_admin (for the same workspace as the project) → 'workspace_admin'
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:359:--   admin path:  caller must have yagi_admin or workspace_admin role for project's workspace
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:382:  v_is_yagi_admin      boolean;
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:394:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:411:       AND role = 'workspace_admin'
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:416:  IF v_is_yagi_admin THEN
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:417:    v_actor_role := 'yagi_admin';
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:419:    v_actor_role := 'workspace_admin';
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:431:  -- on any project in the workspace (or any project for yagi_admin).
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:503:--   AND NOT is_yagi_admin(auth.uid())  -- yagi_admin admin console escape hatch
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:514:--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:538:  -- Allow yagi_admin for emergency console fixes
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:539:  IF public.is_yagi_admin(auth.uid()) THEN
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:560:  'local.transition_rpc_active=true, (2) yagi_admin bypass for emergencies.';
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:570:CREATE POLICY psh_select_client ON public.project_status_history
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:580:-- SELECT: yagi_admin can read all history
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:582:CREATE POLICY psh_select_admin ON public.project_status_history
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:584:  USING (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:589:CREATE POLICY psh_insert_deny ON public.project_status_history
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:595:CREATE POLICY psh_update_deny ON public.project_status_history
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:601:CREATE POLICY psh_delete_deny ON public.project_status_history
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:609:-- yagi_admin). Phase 3.0 replaces it with split CRUD policies:
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:611:--   - yagi_admin: SELECT only (admins read references but client owns them)
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:618:-- SELECT: client (own projects) + yagi_admin (all)
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:620:CREATE POLICY pref_select_client ON public.project_references
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:628:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:633:CREATE POLICY pref_insert_client ON public.project_references
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:645:CREATE POLICY pref_update_client ON public.project_references
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:664:CREATE POLICY pref_delete_client ON public.project_references
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:677:-- The existing projects_update policy (from Phase 2.8.2 hardening) allows
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:678:-- ws_admin or yagi_admin to update non-deleted rows. The trigger guard in
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:687:-- and deleted_at IS NULL. Admins retain their existing path.
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:689:DROP POLICY IF EXISTS projects_update ON public.projects;
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:691:CREATE POLICY projects_update ON public.projects
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:698:      AND deleted_at IS NULL
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:703:      AND deleted_at IS NULL
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:705:    -- yagi_admin: unrestricted (including trashed project restore)
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:706:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:709:    -- Client: own project, non-deleted only (no writing deleted_at)
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:712:      AND deleted_at IS NULL
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:717:      AND deleted_at IS NULL
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:719:    -- yagi_admin: unrestricted
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:720:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:723:COMMENT ON POLICY projects_update ON public.projects IS
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:726:  'yagi_admin unrestricted. Status column changes are additionally gated by '
.\supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:728:  'or yagi_admin may change projects.status.';
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:11:--   6. Lock state-transition + column-guard trigger (yagi_admin-only flip)
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:24:--   - DROP POLICY IF EXISTS / CREATE POLICY (re-apply safe)
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:59:  'status: editing (default) or locked (production frozen, yagi_admin-only flip).';
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:172:--     OR yagi_admin. Brief Board is collaborative (Y3: admin can fill draft).
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:175:--   - status flip ('editing' ↔ 'locked'): yagi_admin only — enforced by
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:185:CREATE POLICY project_briefs_select
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:195:          OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:201:CREATE POLICY project_briefs_insert
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:211:          OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:221:-- columns. yagi_admin bypasses the editing check via the second policy.
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:223:CREATE POLICY project_briefs_update_member
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:244:CREATE POLICY project_briefs_update_yagi
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:248:  USING (public.is_yagi_admin((select auth.uid())))
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:249:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:255:CREATE POLICY project_brief_versions_select
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:265:          OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:270:-- INSERT: workspace member or yagi_admin. created_by must equal auth.uid()
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:275:CREATE POLICY project_brief_versions_insert
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:286:          OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:297:CREATE POLICY project_brief_assets_select
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:307:          OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:313:CREATE POLICY project_brief_assets_insert
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:329:-- DELETE: own uploads or yagi_admin (SPEC §3.6).
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:331:CREATE POLICY project_brief_assets_delete
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:344:CREATE POLICY embed_cache_select
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:363:-- Guards (non-yagi_admin caller):
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:369:--     1. status frozen (lock/unlock is yagi_admin only — SPEC §5.4)
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:379:-- yagi_admin bypasses all column guards (lock/unlock requires it; admin
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:390:  v_is_yagi_admin boolean := false;
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:397:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:399:  IF v_is_yagi_admin THEN
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:428:      'only yagi_admin may change project_brief status'
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:434:      'only yagi_admin may change tiptap_schema_version'
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:506:-- must unlock first (yagi_admin only). Defense-in-depth alongside
.\supabase\migrations\20260426000000_phase_2_8_brief_board.sql:519:  -- a yagi_admin lock arriving while we're snapshotting). Without this,
.\supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:15:CREATE POLICY challenge_submissions_select_public
.\supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:28:CREATE POLICY challenge_submissions_select_owner
.\supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:34:CREATE POLICY challenge_submissions_select_admin
.\supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:37:  USING (public.is_yagi_admin((select auth.uid())));
.\supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:45:CREATE POLICY challenge_votes_select_owner
.\supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:50:CREATE POLICY challenge_votes_select_admin
.\supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:53:  USING (public.is_yagi_admin((select auth.uid())));
.\supabase\migrations\20260424020000_phase_2_5_g8_hardening.sql:123:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:14:--     or a yagi_admin. Body up to 4000 chars; image_url is the public
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:21:--   yagi_admin: full access.
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:84:CREATE POLICY support_threads_select ON public.support_threads
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:87:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:93:CREATE POLICY support_threads_insert ON public.support_threads
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:96:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:105:CREATE POLICY support_threads_update ON public.support_threads
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:108:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:112:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:119:CREATE POLICY support_messages_select ON public.support_messages
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:126:          public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:134:CREATE POLICY support_messages_insert ON public.support_messages
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:143:          public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:150:-- read-only audit access. Only the client-owner and yagi_admin can post.
.\supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:163:  -- the inserting author to UPDATE, but yagi_admin replies should
.\supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:7:-- another workspace, after which the workspace_admin SELECT lane in
.\supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:14:-- Fix: support_threads_update is now yagi_admin-only. The application
.\supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:18:-- SECURITY DEFINER trigger. yagi_admin retains full UPDATE access for
.\supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:25:-- Idempotent (DROP POLICY IF EXISTS + CREATE POLICY).
.\supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:31:CREATE POLICY support_threads_update ON public.support_threads
.\supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:33:  USING (public.is_yagi_admin(auth.uid()))
.\supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:34:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:8:-- Finding 1 — projects_update WITH CHECK gap
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:10:--     (is_ws_admin(...) OR is_yagi_admin(...))
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:11:--   which permits a non-yagi workspace_admin to write deleted_at = now()
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:16:--   ws_admin from producing a row with deleted_at IS NOT NULL.
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:18:-- Finding 2 — save_brief_version did not gate on deleted_at
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin without checking projects.deleted_at.
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:24:--   project_brief_versions. Wrap with an early `deleted_at IS NULL`
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:25:--   gate (yagi_admin bypasses, matching the read-side pattern).
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:27:-- Both fixes are idempotent (DROP POLICY IF EXISTS + CREATE POLICY,
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:32:-- 1. projects_update — tighten WITH CHECK ----------------------------
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:34:DROP POLICY IF EXISTS projects_update ON public.projects;
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:36:CREATE POLICY projects_update ON public.projects
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:41:      AND deleted_at IS NULL
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:43:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:48:      AND deleted_at IS NULL
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:50:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:67:  v_deleted_at timestamptz;
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:89:  -- trashed projects. yagi_admin bypasses (so a yagi-side restore +
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:91:  SELECT p.workspace_id, p.deleted_at
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:92:    INTO v_workspace_id, v_deleted_at
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:97:    public.is_yagi_admin(v_caller)
.\supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:103:  IF v_deleted_at IS NOT NULL AND NOT public.is_yagi_admin(v_caller) THEN
.\supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:32:--        - ws_admin / yagi_admin keep their existing full-access lanes.
.\supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:36:-- DROP POLICY IF EXISTS + CREATE POLICY, CREATE OR REPLACE TRIGGER.
.\supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:77:CREATE POLICY meetings_insert ON public.meetings
.\supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:81:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:93:CREATE POLICY meetings_update ON public.meetings
.\supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:97:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:105:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:16:--   update. yagi_admin and ws_admin lanes are unchanged.
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:35:--   'closed'. Intent: only yagi_admin can close/reopen. Tighten:
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:41:--   gains an is_yagi_admin guard in the same review loop.)
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:43:-- All changes idempotent (DROP POLICY IF EXISTS + CREATE POLICY,
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:85:CREATE POLICY meetings_update ON public.meetings
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:89:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:98:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:110:CREATE POLICY support_threads_insert ON public.support_threads
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:113:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:126:CREATE POLICY support_messages_insert ON public.support_messages
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:135:          public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:144:-- 5. support_threads_update — only yagi_admin may flip status ------
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:148:CREATE POLICY support_threads_update ON public.support_threads
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:151:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:155:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:167:-- a BEFORE UPDATE trigger that raises if the caller is NOT a yagi_admin
.\supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:178:     AND NOT public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:44:CREATE POLICY project_boards_select_client ON project_boards
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:47:    is_yagi_admin(auth.uid())
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:56:CREATE POLICY project_boards_insert_via_rpc ON project_boards
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:60:CREATE POLICY project_boards_update_client ON project_boards
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:63:    is_yagi_admin(auth.uid())
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:75:    is_yagi_admin(auth.uid())
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:92:CREATE POLICY project_board_versions_select ON project_board_versions
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:95:    is_yagi_admin(auth.uid())
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:107:CREATE POLICY project_board_versions_insert_trigger ON project_board_versions
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:166:  IF NOT is_yagi_admin(auth.uid()) THEN
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:167:    RAISE EXCEPTION 'init_project_board: caller must be yagi_admin';
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:193:  IF NOT is_yagi_admin(auth.uid()) THEN
.\supabase\migrations\20260429113853_phase_3_1_project_board.sql:194:    RAISE EXCEPTION 'toggle_project_board_lock: caller must be yagi_admin';
.\supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:45:CREATE POLICY handle_history_owner_select ON public.handle_history
.\supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:51:CREATE POLICY handle_history_admin_select ON public.handle_history
.\supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:53:  USING (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:35:CREATE POLICY challenge_judgments_admin_select ON public.challenge_judgments
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:37:  USING (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:39:CREATE POLICY challenge_judgments_admin_insert ON public.challenge_judgments
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:42:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:46:CREATE POLICY challenge_judgments_admin_update ON public.challenge_judgments
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:48:  USING (public.is_yagi_admin(auth.uid()))
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:49:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:51:CREATE POLICY challenge_judgments_admin_delete ON public.challenge_judgments
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:53:  USING (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:58:CREATE POLICY showcase_challenge_winners_admin_insert ON public.showcase_challenge_winners
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:61:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:65:CREATE POLICY showcase_challenge_winners_admin_update ON public.showcase_challenge_winners
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:67:  USING (public.is_yagi_admin(auth.uid()))
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:68:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:70:CREATE POLICY showcase_challenge_winners_admin_delete ON public.showcase_challenge_winners
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:72:  USING (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:94:  IF public.is_yagi_admin(auth.uid()) THEN
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:11:--        trigger; admin bypasses via is_yagi_admin.
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:58:  IF public.is_yagi_admin(auth.uid()) THEN
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:132:CREATE POLICY creators_update_self ON public.creators
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:150:CREATE POLICY studios_update_self ON public.studios
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:260:CREATE POLICY challenges_admin_insert ON public.challenges
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:263:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:268:CREATE POLICY challenge_judgments_admin_all ON public.challenge_judgments
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:270:  USING (public.is_yagi_admin(auth.uid()))
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:272:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:277:CREATE POLICY showcase_challenge_winners_admin_write ON public.showcase_challenge_winners
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:279:  USING (public.is_yagi_admin(auth.uid()))
.\supabase\migrations\20260423030001_phase_2_5_g1_hardening.sql:281:    public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:229:CREATE POLICY creators_select ON public.creators
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:235:CREATE POLICY creators_insert_self ON public.creators
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:244:CREATE POLICY creators_update_self ON public.creators
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:253:CREATE POLICY studios_select ON public.studios
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:259:CREATE POLICY studios_insert_self ON public.studios
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:268:CREATE POLICY studios_update_self ON public.studios
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:274:CREATE POLICY challenges_select_public ON public.challenges
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:275:  FOR SELECT USING (state <> 'draft' OR public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:277:CREATE POLICY challenges_admin_insert ON public.challenges
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:278:  FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:280:CREATE POLICY challenges_admin_update ON public.challenges
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:281:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:282:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:284:CREATE POLICY challenges_admin_delete ON public.challenges
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:285:  FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:288:-- owner UPDATE until closed; admin read/update via is_yagi_admin.
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:291:CREATE POLICY challenge_submissions_select ON public.challenge_submissions
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:294:CREATE POLICY challenge_submissions_insert_self ON public.challenge_submissions
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:307:CREATE POLICY challenge_submissions_update_self ON public.challenge_submissions
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:322:CREATE POLICY challenge_submissions_admin_update ON public.challenge_submissions
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:323:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:324:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:329:CREATE POLICY challenge_votes_select ON public.challenge_votes
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:332:CREATE POLICY challenge_votes_insert_self ON public.challenge_votes
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:344:CREATE POLICY challenge_judgments_admin_all ON public.challenge_judgments
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:345:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:346:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:351:CREATE POLICY showcase_challenge_winners_select ON public.showcase_challenge_winners
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:354:CREATE POLICY showcase_challenge_winners_admin_write ON public.showcase_challenge_winners
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:355:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
.\supabase\migrations\20260423030000_phase_2_5_challenge_platform.sql:356:  WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260423020200_create_meeting_with_attendees_rpc.sql:15:-- inserts to ws_admin / yagi_admin, and the caller has already been
.\supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:34:    OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:38:-- Same shape as #2: USING limits WHICH rows a yagi_admin can UPDATE, but
.\supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:48:        AND public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:63:      OR public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:79:-- Same class of gap: a yagi_admin authorized to UPDATE a showcase-media
.\supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:85:    AND public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260422130000_phase_1_9_medium_fixes.sql:96:    AND public.is_yagi_admin(auth.uid())
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:118:  -- Grant workspace_admin role
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:120:  values (v_user_id, 'workspace_admin', v_workspace_id);
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:1891:    deleted_at timestamp with time zone
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3000:CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3729:CREATE POLICY deliverables_rw ON public.project_deliverables TO authenticated USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3747:CREATE POLICY invoice_items_select ON public.invoice_line_items FOR SELECT USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3768:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3775:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3809:CREATE POLICY meeting_attendees_insert ON public.meeting_attendees FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3818:CREATE POLICY meeting_attendees_select ON public.meeting_attendees FOR SELECT USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3854:CREATE POLICY milestones_rw ON public.project_milestones TO authenticated USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3865:CREATE POLICY notif_events_select_own ON public.notification_events FOR SELECT USING ((user_id = auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3872:CREATE POLICY notif_events_update_own ON public.notification_events FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3897:CREATE POLICY prefs_select_own ON public.notification_preferences FOR SELECT USING ((user_id = auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3904:CREATE POLICY prefs_update_own ON public.notification_preferences FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3911:CREATE POLICY prefs_upsert_own ON public.notification_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3952:CREATE POLICY preprod_comments_select ON public.preprod_frame_comments FOR SELECT USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3961:CREATE POLICY preprod_comments_update ON public.preprod_frame_comments FOR UPDATE USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3990:CREATE POLICY preprod_frames_delete ON public.preprod_frames FOR DELETE USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:3999:CREATE POLICY preprod_frames_insert ON public.preprod_frames FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4008:CREATE POLICY preprod_frames_select ON public.preprod_frames FOR SELECT USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4017:CREATE POLICY preprod_frames_update ON public.preprod_frames FOR UPDATE USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4028:CREATE POLICY preprod_reactions_select ON public.preprod_frame_reactions FOR SELECT USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4043:CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4050:CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4057:CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4064:CREATE POLICY proj_refs_rw ON public.project_references TO authenticated USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4075:CREATE POLICY proj_threads_rw ON public.project_threads TO authenticated USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4134:-- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4150:CREATE POLICY showcase_media_delete ON public.showcase_media FOR DELETE USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4159:CREATE POLICY showcase_media_insert ON public.showcase_media FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4168:CREATE POLICY showcase_media_select ON public.showcase_media FOR SELECT USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4179:CREATE POLICY showcase_media_update ON public.showcase_media FOR UPDATE USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4248:CREATE POLICY tc_attachments_insert ON public.team_channel_message_attachments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4257:CREATE POLICY tc_attachments_select ON public.team_channel_message_attachments FOR SELECT USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4279:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4286:CREATE POLICY team_channel_messages_insert ON public.team_channel_messages FOR INSERT WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4295:CREATE POLICY team_channel_messages_select ON public.team_channel_messages FOR SELECT USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4304:CREATE POLICY team_channel_messages_update ON public.team_channel_messages FOR UPDATE USING ((author_id = auth.uid())) WITH CHECK ((author_id = auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4353:CREATE POLICY thread_message_attachments_delete ON public.thread_message_attachments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4362:CREATE POLICY thread_message_attachments_insert ON public.thread_message_attachments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4373:CREATE POLICY thread_message_attachments_select ON public.thread_message_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4390:CREATE POLICY thread_messages_insert ON public.thread_messages FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4400:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4407:CREATE POLICY thread_msgs_rw ON public.thread_messages TO authenticated USING ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4420:CREATE POLICY unsub_tokens_deny_all ON public.notification_unsubscribe_tokens USING (false) WITH CHECK (false);
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4451:-- Name: user_roles user_roles_yagi_admin; Type: POLICY; Schema: public; Owner: -
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4479:CREATE POLICY ws_create_any_auth ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4544:CREATE POLICY avatars_read ON storage.objects FOR SELECT USING ((bucket_id = 'avatars'::text));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4551:CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND (owner = auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4558:CREATE POLICY avatars_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4565:CREATE POLICY brand_logos_read ON storage.objects FOR SELECT USING ((bucket_id = 'brand-logos'::text));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4572:CREATE POLICY brand_logos_write ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'brand-logos'::text));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4597:CREATE POLICY deliverables_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'project-deliverables'::text));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4604:CREATE POLICY deliverables_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'project-deliverables'::text) AND (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4653:CREATE POLICY refs_insert_authorized ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'project-references'::text) AND (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4662:CREATE POLICY refs_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'project-references'::text) AND (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4684:CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4691:CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4708:CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4715:CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4729:CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4736:CREATE POLICY "tc-attachments read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4743:CREATE POLICY "tc-attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4750:CREATE POLICY thread_attachments_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4759:CREATE POLICY thread_attachments_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4768:CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4778:CREATE POLICY thread_attachments_select ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4793:CREATE POLICY ws_logos_read ON storage.objects FOR SELECT USING ((bucket_id = 'workspace-logos'::text));
.\supabase\migrations\20260422120000_phase_2_0_baseline.sql:4800:CREATE POLICY ws_logos_write ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'workspace-logos'::text));
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:15:-- Validates: caller ownership OR yagi_admin, lock state, count cap (30),
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:48:  -- Role check: owner OR yagi_admin
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:49:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:110:-- Validates: caller ownership OR yagi_admin, lock state, count cap (50),
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:144:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:205:-- Validates: caller ownership OR yagi_admin, lock state.
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:232:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:283:-- Validates: caller ownership OR yagi_admin, lock state, note length (500).
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:309:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:15:-- Validates: caller ownership OR yagi_admin, lock state, count cap (30),
.\supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:48:  -- Role check: owner OR yagi_admin
.\supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:49:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:110:-- Validates: caller ownership OR yagi_admin, lock state, count cap (50),
.\supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:144:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:205:-- Validates: caller ownership OR yagi_admin, lock state.
.\supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:232:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:283:-- Validates: caller ownership OR yagi_admin, lock state, note length (500).
.\supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:309:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:41:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:124:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:202:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:269:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:322:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:368:CREATE POLICY project_boards_update_client ON project_boards
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:371:    is_yagi_admin(auth.uid())
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:385:    is_yagi_admin(auth.uid())
.\supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:41:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:124:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:202:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:269:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:322:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
.\supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:368:CREATE POLICY project_boards_update_client ON project_boards
.\supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:371:    is_yagi_admin(auth.uid())
.\supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:385:    is_yagi_admin(auth.uid())
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:37:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:37:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:8:    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:11:-- yagi_admin workspace requires a MANUAL UPDATE after verify
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:69:-- SELECT: yagi_admin (all rows) + project owner client (own rows)
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:70:CREATE POLICY "project_licenses_select_admin" ON project_licenses
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:75:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:82:CREATE POLICY "project_licenses_select_owner" ON project_licenses
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:90:-- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 stage)
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:91:CREATE POLICY "project_licenses_write_admin" ON project_licenses
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:96:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:102:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:8:    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:11:-- yagi_admin workspace requires a MANUAL UPDATE after verify
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:69:-- SELECT: yagi_admin (all rows) + project owner client (own rows)
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:70:CREATE POLICY "project_licenses_select_admin" ON project_licenses
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:75:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:82:CREATE POLICY "project_licenses_select_owner" ON project_licenses
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:90:-- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 stage)
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:91:CREATE POLICY "project_licenses_write_admin" ON project_licenses
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:96:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:102:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:61:  v_is_admin := is_yagi_admin(v_caller_id);
.\supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:61:  v_is_admin := is_yagi_admin(v_caller_id);
supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:23:--   2. yagi_admin: bypass (admin-driven role changes via support tools).
supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:54:  -- yagi_admin can change roles freely (e.g., support migrations,
supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:56:  IF public.is_yagi_admin(v_caller) THEN
supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:97:  '(artist, future yagi_admin) and forbids non-NULL -> non-NULL role '
supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:98:  'transitions for non-admin callers. service_role + yagi_admin bypass.';
.\supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:23:--   2. yagi_admin: bypass (admin-driven role changes via support tools).
.\supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:54:  -- yagi_admin can change roles freely (e.g., support migrations,
.\supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:56:  IF public.is_yagi_admin(v_caller) THEN
.\supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:97:  '(artist, future yagi_admin) and forbids non-NULL -> non-NULL role '
.\supabase\migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:98:  'transitions for non-admin callers. service_role + yagi_admin bypass.';
.\supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:37:--   4. Keeps the existing auth + project status gates (yagi_admin OR
.\supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:101:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:37:--   4. Keeps the existing auth + project status gates (yagi_admin OR
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:101:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:5:-- {brand, artist, yagi_admin}. The `ws_update_admin` RLS policy
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:6:-- permits is_ws_admin OR is_yagi_admin to UPDATE the workspaces row,
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:7:-- and the column-set is unconstrained — so a workspace_admin (who
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:9:-- 'yagi_admin' and any code path that branches on workspaces.kind
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:26:-- OR is_yagi_admin), so workspace admins can edit their own row's
supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:27:-- editable columns. yagi_admin can also use the service-role client
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:5:-- {brand, artist, yagi_admin}. The `ws_update_admin` RLS policy
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:6:-- permits is_ws_admin OR is_yagi_admin to UPDATE the workspaces row,
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:7:-- and the column-set is unconstrained — so a workspace_admin (who
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:9:-- 'yagi_admin' and any code path that branches on workspaces.kind
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:26:-- OR is_yagi_admin), so workspace admins can edit their own row's
.\supabase\migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:27:-- editable columns. yagi_admin can also use the service-role client
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:65:-- SELECT: project 의 workspace member 또는 yagi_admin
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:66:CREATE POLICY "briefing_documents_select" ON briefing_documents
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:76:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:81:-- workspace AND created_by MUST equal auth.uid() (no spoof). yagi_admin
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:85:CREATE POLICY "briefing_documents_insert" ON briefing_documents
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:98:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:104:-- yagi_admin bypass.
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:110:CREATE POLICY "briefing_documents_update" ON briefing_documents
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:124:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:138:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:144:-- yagi_admin not granted DELETE here (admin destructive action goes
supabase\migrations\20260504052541_phase_5_briefing_documents.sql:147:CREATE POLICY "briefing_documents_delete" ON briefing_documents
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:65:-- SELECT: project 의 workspace member 또는 yagi_admin
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:66:CREATE POLICY "briefing_documents_select" ON briefing_documents
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:76:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:81:-- workspace AND created_by MUST equal auth.uid() (no spoof). yagi_admin
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:85:CREATE POLICY "briefing_documents_insert" ON briefing_documents
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:98:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:104:-- yagi_admin bypass.
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:110:CREATE POLICY "briefing_documents_update" ON briefing_documents
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:124:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:138:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:144:-- yagi_admin not granted DELETE here (admin destructive action goes
.\supabase\migrations\20260504052541_phase_5_briefing_documents.sql:147:CREATE POLICY "briefing_documents_delete" ON briefing_documents
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:24:-- yagi_admin bypass branch is preserved AS-IS (status-agnostic) so the
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:40:CREATE POLICY "briefing_documents_insert" ON briefing_documents
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:54:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:64:CREATE POLICY "briefing_documents_update" ON briefing_documents
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:79:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:94:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:24:-- yagi_admin bypass branch is preserved AS-IS (status-agnostic) so the
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:40:CREATE POLICY "briefing_documents_insert" ON briefing_documents
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:54:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:64:CREATE POLICY "briefing_documents_update" ON briefing_documents
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:79:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:94:      WHERE id = auth.uid() AND role = 'yagi_admin'
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:6:-- (deleted_at = now()) then INSERTs a fresh draft. Without this index
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:9:-- ignores deleted_at, so the fresh INSERT collides with 23505.
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:12:-- deleted_at IS NULL. Soft-deleted drafts no longer occupy the slot
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:14:-- side is unchanged: a live draft with NULL deleted_at still blocks
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:26:    AND deleted_at IS NULL;
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:39:  IF v_indexdef NOT LIKE '%deleted_at IS NULL%' THEN
.\supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:40:    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq predicate does not include deleted_at IS NULL — got: %', v_indexdef;
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:6:-- (deleted_at = now()) then INSERTs a fresh draft. Without this index
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:9:-- ignores deleted_at, so the fresh INSERT collides with 23505.
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:12:-- deleted_at IS NULL. Soft-deleted drafts no longer occupy the slot
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:14:-- side is unchanged: a live draft with NULL deleted_at still blocks
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:26:    AND deleted_at IS NULL;
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:39:  IF v_indexdef NOT LIKE '%deleted_at IS NULL%' THEN
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:40:    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq predicate does not include deleted_at IS NULL — got: %', v_indexdef;
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:4:-- the workspace creator the 'workspace_admin' role. The original
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:5:-- transition_project_status RPC matched the actor as 'workspace_admin'
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:7:-- workspace_admin matrix does NOT include `draft → submitted`. Result:
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:18:--   ELSIF v_is_yagi_admin THEN
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:19:--     v_actor_role := 'yagi_admin';
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:21:--     v_actor_role := 'workspace_admin';
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:26:-- Side effect: a yagi_admin acting on a project they themselves created
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:28:-- yagi_admin is internal staff role; the "yagi staff member also creates
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:31:-- yagi_admin draft → submitted entry to is_valid_transition's matrix.
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:37:-- nor a workspace_admin for the project's workspace).
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:62:  v_is_yagi_admin      boolean;
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:71:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:86:       AND role = 'workspace_admin'
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:92:  -- workspace_admin / yagi_admin privileges.
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:95:  ELSIF v_is_yagi_admin THEN
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:96:    v_actor_role := 'yagi_admin';
.\supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:98:    v_actor_role := 'workspace_admin';
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:4:-- the workspace creator the 'workspace_admin' role. The original
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:5:-- transition_project_status RPC matched the actor as 'workspace_admin'
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:7:-- workspace_admin matrix does NOT include `draft → submitted`. Result:
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:18:--   ELSIF v_is_yagi_admin THEN
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:19:--     v_actor_role := 'yagi_admin';
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:21:--     v_actor_role := 'workspace_admin';
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:26:-- Side effect: a yagi_admin acting on a project they themselves created
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:28:-- yagi_admin is internal staff role; the "yagi staff member also creates
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:31:-- yagi_admin draft → submitted entry to is_valid_transition's matrix.
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:37:-- nor a workspace_admin for the project's workspace).
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:62:  v_is_yagi_admin      boolean;
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:71:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:86:       AND role = 'workspace_admin'
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:92:  -- workspace_admin / yagi_admin privileges.
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:95:  ELSIF v_is_yagi_admin THEN
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:96:    v_actor_role := 'yagi_admin';
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:98:    v_actor_role := 'workspace_admin';
.\supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:20:--   actor_role='yagi_admin'      -> NO * -> draft
.\supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:21:--   actor_role='workspace_admin' -> NO * -> draft
.\supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:33:-- a workspace creator who also holds workspace_admin will be resolved
.\supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:77:    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
.\supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:78:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:20:--   actor_role='yagi_admin'      -> NO * -> draft
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:21:--   actor_role='workspace_admin' -> NO * -> draft
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:33:-- a workspace creator who also holds workspace_admin will be resolved
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:77:    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:78:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
rg: db: 지정된 파일을 찾을 수 없습니다. (os error 2)

codex
The action has the intended service-role filter chain, and the review protocol confirms this table write requires the multi-role RLS walk. I’m narrowing now on the Phase 3 policy text and exact line references for any finding.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/[id]/delete-actions.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg --files supabase/migrations | rg \"20260427164421_phase_3_0_projects_lifecycle\\.sql"'$|phase_3_0_projects_lifecycle"' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "CREATE POLICY projects_update|projects_update|deleted_at|WITH CHECK|is_yagi_admin|is_ws_admin" supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 608ms:
   1: "use server";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave C Hotfix-2 HF2_2 ??deleteProjectAction
   5: //
   6: // Soft-deletes a project owned by the current user, gated on status IN
   7: // ('submitted', 'in_review'). Hard rules:
   8: //
   9: //   1. Validate input shape (uuid).
  10: //   2. Authenticate via createSupabaseServer().auth.getUser().
  11: //   3. SELECT the project (id, status, created_by, deleted_at).
  12: //      Row missing or already deleted ??'not_found'.
  13: //   4. created_by !== user.id ??'forbidden_owner'.
  14: //   5. status NOT IN ('submitted', 'in_review') ??'forbidden_status'.
  15: //   6. Write deleted_at via createSupabaseService() (service-role bypass
  16: //      required: RLS WITH CHECK denies deleted_at writes from the client
  17: //      role ??same pattern as ensureBriefingDraftProject defensive
  18: //      soft-delete in briefing-actions.ts).
  19: //      Authorization is preserved by the explicit filter chain:
  20: //        .eq("id", projectId)
  21: //        .eq("created_by", user.id)          ??different-user blocked here
  22: //        .in("status", ["submitted", "in_review"])  ??TOCTOU safety net
  23: //        .is("deleted_at", null)             ??idempotency guard
  24: //   7. revalidatePath('/[locale]/app/projects', 'page') so the list
  25: //      immediately drops the deleted row.
  26: //   8. Return { ok: true }.
  27: //
  28: // L-049 multi-role audit:
  29: //   - client role: RLS WITH CHECK blocks deleted_at write ??service-role ??//   - ws_admin role: same RLS rule applies ??service-role ??//   - yagi_admin: bypasses RLS but action layer enforces creator + status ??//   - different-user same-workspace: .eq("created_by", user.id) blocks ??// =============================================================================
  30: 
  31: import { z } from "zod";
  32: import { revalidatePath } from "next/cache";
  33: import { createSupabaseServer } from "@/lib/supabase/server";
  34: import { createSupabaseService } from "@/lib/supabase/service";
  35: 
  36: const deleteProjectInput = z.object({
  37:   projectId: z.string().uuid(),
  38: });
  39: 
  40: export type DeleteProjectResult =
  41:   | { ok: true }
  42:   | {
  43:       ok: false;
  44:       error:
  45:         | "validation"
  46:         | "unauthenticated"
  47:         | "not_found"
  48:         | "forbidden_status"
  49:         | "forbidden_owner"
  50:         | "db";
  51:       message?: string;
  52:     };
  53: 
  54: export async function deleteProjectAction(
  55:   input: unknown,
  56: ): Promise<DeleteProjectResult> {
  57:   // 1. Parse input
  58:   const parsed = deleteProjectInput.safeParse(input);
  59:   if (!parsed.success) {
  60:     return { ok: false, error: "validation", message: parsed.error.message };
  61:   }
  62:   const { projectId } = parsed.data;
  63: 
  64:   // 2. Authenticate
  65:   const supabase = await createSupabaseServer();
  66:   const {
  67:     data: { user },
  68:     error: authErr,
  69:   } = await supabase.auth.getUser();
  70:   if (authErr || !user) {
  71:     return { ok: false, error: "unauthenticated" };
  72:   }
  73: 
  74:   // 3. SELECT project row (status, owner, soft-delete state)
  75:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
  76:   const sb = supabase as any;
  77:   const { data: project, error: selErr } = await sb
  78:     .from("projects")
  79:     .select("id, status, created_by, deleted_at")
  80:     .eq("id", projectId)
  81:     .maybeSingle();
  82: 
  83:   if (selErr) {
  84:     console.error("[deleteProjectAction] SELECT error:", selErr);
  85:     return { ok: false, error: "db", message: selErr.message };
  86:   }
  87: 
  88:   // Row missing or already soft-deleted ??treat as not_found
  89:   if (!project || project.deleted_at !== null) {
  90:     return { ok: false, error: "not_found" };
  91:   }
  92: 
  93:   // 4. Owner check
  94:   if (project.created_by !== user.id) {
  95:     return { ok: false, error: "forbidden_owner" };
  96:   }
  97: 
  98:   // 5. Status gate ??only submitted / in_review deletable by owner
  99:   const DELETABLE_STATUSES = ["submitted", "in_review"] as const;
 100:   if (!DELETABLE_STATUSES.includes(project.status)) {
 101:     return { ok: false, error: "forbidden_status" };
 102:   }
 103: 
 104:   // 6. Soft-delete via service-role client (bypasses RLS WITH CHECK
 105:   //    that denies deleted_at writes from non-yagi_admin client sessions).
 106:   //    Authorization triple-lock preserved in the WHERE chain:
 107:   //      created_by = user.id  ?? different-user blocked even under service role
 108:   //      status IN (...)       ?? TOCTOU: admin may have transitioned status
 109:   //                               between our SELECT and this UPDATE
 110:   //      deleted_at IS NULL    ?? idempotency: concurrent delete attempt is a no-op
 111:   const sbAdmin = createSupabaseService();
 112:   const { error: updateErr } = await sbAdmin
 113:     .from("projects")
 114:     .update({ deleted_at: new Date().toISOString() })
 115:     .eq("id", projectId)
 116:     .eq("created_by", user.id)
 117:     .in("status", ["submitted", "in_review"])
 118:     .is("deleted_at", null);
 119: 
 120:   if (updateErr) {
 121:     console.error("[deleteProjectAction] UPDATE error:", updateErr);
 122:     return { ok: false, error: "db", message: updateErr.message };
 123:   }
 124: 
 125:   // 7. Invalidate project list cache
 126:   revalidatePath("/[locale]/app/projects", "page");
 127: 
 128:   // 8. Success
 129:   return { ok: true };
 130: }

 succeeded in 602ms:
382:  v_is_yagi_admin      boolean;
383:  v_is_ws_admin        boolean;
394:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
408:  v_is_ws_admin := EXISTS (
416:  IF v_is_yagi_admin THEN
418:  ELSIF v_is_ws_admin THEN
503:--   AND NOT is_yagi_admin(auth.uid())  -- yagi_admin admin console escape hatch
514:--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
539:  IF public.is_yagi_admin(auth.uid()) THEN
584:  USING (public.is_yagi_admin(auth.uid()));
591:  WITH CHECK (false);
628:    OR public.is_yagi_admin(auth.uid())
635:  WITH CHECK (
654:  WITH CHECK (
677:-- The existing projects_update policy (from Phase 2.8.2 hardening) allows
687:-- and deleted_at IS NULL. Admins retain their existing path.
689:DROP POLICY IF EXISTS projects_update ON public.projects;
691:CREATE POLICY projects_update ON public.projects
698:      AND deleted_at IS NULL
702:      public.is_ws_admin(auth.uid(), workspace_id)
703:      AND deleted_at IS NULL
706:    OR public.is_yagi_admin(auth.uid())
708:  WITH CHECK (
709:    -- Client: own project, non-deleted only (no writing deleted_at)
712:      AND deleted_at IS NULL
716:      public.is_ws_admin(auth.uid(), workspace_id)
717:      AND deleted_at IS NULL
720:    OR public.is_yagi_admin(auth.uid())
723:COMMENT ON POLICY projects_update ON public.projects IS

 succeeded in 692ms:
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | ForEach-Object { "'$i++; if ($i -ge 490 -and $i -le 728) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"revalidatePath\\(\\\"/\\[locale\\]/app/projects|revalidatePath\\('/\\[locale\\]/app/projects|revalidatePath\\(\" src -g \"*.ts\" -g \"*.tsx\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'package.json'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 424ms:
 490: --     RLS and triggers on the Supabase server side (no trigger fires for
 491: --     service_role direct writes via pg_net/supabase-js server client)
 492: --     NOTE: if the server action uses the authenticated client, it must
 493: --     call transition_project_status() for submitted?뭝n_review.
 494: --     The 'system' path is reserved for that server action's direct write.
 495: --   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
 496: --
 497: -- Justification for trigger over USING(false): the USING(false) approach
 498: -- would block ALL updates from clients, including wizard autosave of non-status
 499: -- columns (title, brief, budget_band, etc.) on draft projects. The trigger
 500: -- is more surgical ??it fires only on status column change.
 501: 
 502: CREATE OR REPLACE FUNCTION public.guard_projects_status_direct_update()
 503: RETURNS TRIGGER
 504: LANGUAGE plpgsql
 505: SECURITY DEFINER
 506: SET search_path = public
 507: AS $$
 508: BEGIN
 509:   -- Only intervene when status is being changed
 510:   IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
 511:     RETURN NEW;
 512:   END IF;
 513: 
 514:   -- Allow if the SECURITY DEFINER RPC set the session flag
 515:   IF current_setting('local.transition_rpc_active', true) = 'true' THEN
 516:     RETURN NEW;
 517:   END IF;
 518: 
 519:   -- Allow yagi_admin for emergency console fixes
 520:   IF public.is_yagi_admin(auth.uid()) THEN
 521:     RETURN NEW;
 522:   END IF;
 523: 
 524:   -- Block all other direct status mutations
 525:   RAISE EXCEPTION
 526:     'direct_status_update_forbidden: use transition_project_status() RPC'
 527:     USING ERRCODE = '42501';
 528: END $$;
 529: 
 530: DROP TRIGGER IF EXISTS trg_guard_projects_status ON public.projects;
 531: 
 532: CREATE TRIGGER trg_guard_projects_status
 533:   BEFORE UPDATE ON public.projects
 534:   FOR EACH ROW
 535:   EXECUTE FUNCTION public.guard_projects_status_direct_update();
 536: 
 537: COMMENT ON FUNCTION public.guard_projects_status_direct_update() IS
 538:   'Phase 3.0 ??BEFORE UPDATE trigger guard on projects. Raises 42501 if any '
 539:   'caller attempts a direct status column change outside the '
 540:   'transition_project_status() RPC. Exceptions: (1) transition RPC sets '
 541:   'local.transition_rpc_active=true, (2) yagi_admin bypass for emergencies.';
 542: 
 543: -- =============================================================================
 544: -- SECTION G: RLS ??project_status_history
 545: -- =============================================================================
 546: 
 547: ALTER TABLE public.project_status_history ENABLE ROW LEVEL SECURITY;
 548: 
 549: -- SELECT: client can read history for own projects
 550: DROP POLICY IF EXISTS psh_select_client ON public.project_status_history;
 551: CREATE POLICY psh_select_client ON public.project_status_history
 552:   FOR SELECT TO authenticated
 553:   USING (
 554:     EXISTS (
 555:       SELECT 1 FROM public.projects p
 556:        WHERE p.id = project_status_history.project_id
 557:          AND p.created_by = auth.uid()
 558:     )
 559:   );
 560: 
 561: -- SELECT: yagi_admin can read all history
 562: DROP POLICY IF EXISTS psh_select_admin ON public.project_status_history;
 563: CREATE POLICY psh_select_admin ON public.project_status_history
 564:   FOR SELECT TO authenticated
 565:   USING (public.is_yagi_admin(auth.uid()));
 566: 
 567: -- INSERT: deny all direct inserts ??only SECURITY DEFINER RPC may insert
 568: -- (no policy = deny by default once RLS is enabled, but we make it explicit)
 569: DROP POLICY IF EXISTS psh_insert_deny ON public.project_status_history;
 570: CREATE POLICY psh_insert_deny ON public.project_status_history
 571:   FOR INSERT TO authenticated
 572:   WITH CHECK (false);
 573: 
 574: -- UPDATE: deny all
 575: DROP POLICY IF EXISTS psh_update_deny ON public.project_status_history;
 576: CREATE POLICY psh_update_deny ON public.project_status_history
 577:   FOR UPDATE TO authenticated
 578:   USING (false);
 579: 
 580: -- DELETE: deny all
 581: DROP POLICY IF EXISTS psh_delete_deny ON public.project_status_history;
 582: CREATE POLICY psh_delete_deny ON public.project_status_history
 583:   FOR DELETE TO authenticated
 584:   USING (false);
 585: 
 586: -- =============================================================================
 587: -- SECTION H: RLS ??project_references (replace single permissive policy)
 588: -- =============================================================================
 589: -- Baseline had a single proj_refs_rw policy (all operations, ws_member OR
 590: -- yagi_admin). Phase 3.0 replaces it with split CRUD policies:
 591: --   - client: full CRUD on own projects
 592: --   - yagi_admin: SELECT only (admins read references but client owns them)
 593: -- We DROP the old blanket policy and replace with named policies.
 594: 
 595: ALTER TABLE public.project_references ENABLE ROW LEVEL SECURITY;
 596: 
 597: DROP POLICY IF EXISTS proj_refs_rw ON public.project_references;
 598: 
 599: -- SELECT: client (own projects) + yagi_admin (all)
 600: DROP POLICY IF EXISTS pref_select_client ON public.project_references;
 601: CREATE POLICY pref_select_client ON public.project_references
 602:   FOR SELECT TO authenticated
 603:   USING (
 604:     EXISTS (
 605:       SELECT 1 FROM public.projects p
 606:        WHERE p.id = project_references.project_id
 607:          AND p.created_by = auth.uid()
 608:     )
 609:     OR public.is_yagi_admin(auth.uid())
 610:   );
 611: 
 612: -- INSERT: client for own projects only
 613: DROP POLICY IF EXISTS pref_insert_client ON public.project_references;
 614: CREATE POLICY pref_insert_client ON public.project_references
 615:   FOR INSERT TO authenticated
 616:   WITH CHECK (
 617:     EXISTS (
 618:       SELECT 1 FROM public.projects p
 619:        WHERE p.id = project_references.project_id
 620:          AND p.created_by = auth.uid()
 621:     )
 622:   );
 623: 
 624: -- UPDATE: client for own projects only
 625: DROP POLICY IF EXISTS pref_update_client ON public.project_references;
 626: CREATE POLICY pref_update_client ON public.project_references
 627:   FOR UPDATE TO authenticated
 628:   USING (
 629:     EXISTS (
 630:       SELECT 1 FROM public.projects p
 631:        WHERE p.id = project_references.project_id
 632:          AND p.created_by = auth.uid()
 633:     )
 634:   )
 635:   WITH CHECK (
 636:     EXISTS (
 637:       SELECT 1 FROM public.projects p
 638:        WHERE p.id = project_references.project_id
 639:          AND p.created_by = auth.uid()
 640:     )
 641:   );
 642: 
 643: -- DELETE: client for own projects only
 644: DROP POLICY IF EXISTS pref_delete_client ON public.project_references;
 645: CREATE POLICY pref_delete_client ON public.project_references
 646:   FOR DELETE TO authenticated
 647:   USING (
 648:     EXISTS (
 649:       SELECT 1 FROM public.projects p
 650:        WHERE p.id = project_references.project_id
 651:          AND p.created_by = auth.uid()
 652:     )
 653:   );
 654: 
 655: -- =============================================================================
 656: -- SECTION I: RLS ??projects UPDATE policy (tighten for status guard)
 657: -- =============================================================================
 658: -- The existing projects_update policy (from Phase 2.8.2 hardening) allows
 659: -- ws_admin or yagi_admin to update non-deleted rows. The trigger guard in
 660: -- Section F handles the status-column-specific blocking. The RLS policy
 661: -- itself is updated to also allow the project creator (client) to update
 662: -- their own draft-status project (for wizard autosave), while keeping the
 663: -- ws_admin path for admin-level field edits.
 664: --
 665: -- Note: the trigger guard is the enforcement layer for status column changes.
 666: -- The RLS policy controls which rows are reachable for UPDATE at all.
 667: -- We tighten: client (created_by) may UPDATE own rows where status='draft'
 668: -- and deleted_at IS NULL. Admins retain their existing path.
 669: 
 670: DROP POLICY IF EXISTS projects_update ON public.projects;
 671: 
 672: CREATE POLICY projects_update ON public.projects
 673:   FOR UPDATE TO authenticated
 674:   USING (
 675:     -- Client: own project, draft only, not deleted
 676:     (
 677:       auth.uid() = created_by
 678:       AND status = 'draft'
 679:       AND deleted_at IS NULL
 680:     )
 681:     -- ws_admin: any non-deleted project in workspace
 682:     OR (
 683:       public.is_ws_admin(auth.uid(), workspace_id)
 684:       AND deleted_at IS NULL
 685:     )
 686:     -- yagi_admin: unrestricted (including trashed project restore)
 687:     OR public.is_yagi_admin(auth.uid())
 688:   )
 689:   WITH CHECK (
 690:     -- Client: own project, non-deleted only (no writing deleted_at)
 691:     (
 692:       auth.uid() = created_by
 693:       AND deleted_at IS NULL
 694:     )
 695:     -- ws_admin: non-deleted only (cannot self-trash via update)
 696:     OR (
 697:       public.is_ws_admin(auth.uid(), workspace_id)
 698:       AND deleted_at IS NULL
 699:     )
 700:     -- yagi_admin: unrestricted
 701:     OR public.is_yagi_admin(auth.uid())
 702:   );
 703: 
 704: COMMENT ON POLICY projects_update ON public.projects IS
 705:   'Phase 3.0 ??client may UPDATE own draft rows (wizard autosave). '
 706:   'ws_admin may UPDATE any non-deleted project in workspace. '
 707:   'yagi_admin unrestricted. Status column changes are additionally gated by '
 708:   'trg_guard_projects_status trigger ??only transition_project_status() RPC '
 709:   'or yagi_admin may change projects.status.';
 710: 
 711: COMMIT;

2026-05-04T17:08:41.053065Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
The string is missing the terminator: '.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : TerminatorExpectedAtEndOfString
 

 exited 1 in 476ms:
The string is missing the terminator: '.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : TerminatorExpectedAtEndOfString
 

 succeeded in 475ms:
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

web search: 
web search: site:nextjs.org/docs revalidatePath dynamic route page type
codex
## VERDICT: NEEDS-ATTENTION

[FINDING 1] MED: `src/app/[locale]/app/projects/[id]/delete-actions.ts:112` — TOCTOU 0-row UPDATE is treated as success. The UPDATE has the right defensive filters (`id`, `created_by`, `status IN`, `deleted_at IS NULL`), but Supabase/PostgREST returns no error when those filters match 0 rows. If status flips to `in_progress` after the SELECT, the project is not deleted, yet the action revalidates and returns `{ ok: true }`. Recommended fix: append `.select("id")`, inspect returned rows, and return an error when length is 0.

RLS audit complete: `client` and `ws_admin` cannot write `deleted_at` through `projects_update` WITH CHECK; this action correctly uses `createSupabaseService()` and preserves creator/status/deleted filters. `yagi_admin` gets no special branch, which is consistent with the creator-only action contract. Different-user same-workspace is blocked before UPDATE by `created_by !== user.id`.

`revalidatePath("/[locale]/app/projects", "page")` is consistent with Next.js App Router route-pattern revalidation for a dynamic segment; `type: "page"` is required for dynamic patterns per the current docs: https://nextjs.org/docs/app/api-reference/functions/revalidatePath

Run log: NEEDS-ATTENTION — one MED TOCTOU result-check gap; auth/RLS/service-role filters otherwise hold.
tokens used
36,867
## VERDICT: NEEDS-ATTENTION

[FINDING 1] MED: `src/app/[locale]/app/projects/[id]/delete-actions.ts:112` — TOCTOU 0-row UPDATE is treated as success. The UPDATE has the right defensive filters (`id`, `created_by`, `status IN`, `deleted_at IS NULL`), but Supabase/PostgREST returns no error when those filters match 0 rows. If status flips to `in_progress` after the SELECT, the project is not deleted, yet the action revalidates and returns `{ ok: true }`. Recommended fix: append `.select("id")`, inspect returned rows, and return an error when length is 0.

RLS audit complete: `client` and `ws_admin` cannot write `deleted_at` through `projects_update` WITH CHECK; this action correctly uses `createSupabaseService()` and preserves creator/status/deleted filters. `yagi_admin` gets no special branch, which is consistent with the creator-only action contract. Different-user same-workspace is blocked before UPDATE by `created_by !== user.id`.

`revalidatePath("/[locale]/app/projects", "page")` is consistent with Next.js App Router route-pattern revalidation for a dynamic segment; `type: "page"` is required for dynamic patterns per the current docs: https://nextjs.org/docs/app/api-reference/functions/revalidatePath

Run log: NEEDS-ATTENTION — one MED TOCTOU result-check gap; auth/RLS/service-role filters otherwise hold.

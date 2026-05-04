# Phase 5 Wave B.5 (Client Recall) — Builder questions

Status: **HALTED at Step 1** awaiting yagi input. Builder did not guess
or proceed past the first tool call beyond context loading.

## Q-1 (BLOCKER) — `SPEC.md` missing

The kickoff message in chat instructs:

> Read this kickoff + sibling `SPEC.md` before any tool call.
> ...
> Implement SPEC.md exactly. Do not expand scope.

But:

- Directory `.yagi-autobuild/phase-5-wb5-recall/` did not exist on disk
  before this halt (Builder created it just now to host this file +
  pending follow-ups).
- No `SPEC.md` is present anywhere under `.yagi-autobuild/` matching
  `wb5` / `recall` / `client_recall` / `B.5`. (Verified via `ls` +
  Glob; pre-halt scan returned 0 hits.)
- Earlier phase-5 directories (`phase-5/`, `phase-5-wb5-recall/`) only
  hold the Wave A/B/C codex review artifacts already shipped; nothing
  spec-shaped for the Recall feature.

Builder cannot infer SPEC content without guessing on:

1. **Exact `is_valid_transition` matrix delta** — kickoff says "2
   added client rows" but does not name them. Plausible candidates
   (a → b for client role):
   - `submitted → draft` (client recalls before YAGI starts review)
   - `in_review → draft` (client recalls during review window)
   - `submitted → cancelled` + reopen as new draft
   None of these is unambiguous from the kickoff alone. The matrix
   change interacts with the Wave B trigger guard
   (`trg_guard_projects_status`) and the SECURITY DEFINER RPC
   `transition_project_status` (creator-first patch already applied),
   so guessing here is high-blast-radius.

2. **`projectDetail.recall.*` i18n key list and copy** — kickoff says
   "SPEC.md table is source of truth" but no table is in the kickoff.
   At minimum I would need:
   - button label (KO + EN)
   - dialog title / description / cancel / proceed copy
   - toast.success / toast.error_unauthorized / toast.error_wrong_status
     / toast.error_db copy
   None of these are derivable from existing patterns without
   inventing new strings.

3. **RecallButton placement on detail page** — kickoff says "Conditional
   render only — single block. Do NOT touch other detail page surfaces."
   But what is the condition? Plausible:
   - `status === 'submitted' AND viewer === creator`
   - `status IN ('submitted','in_review') AND viewer === creator AND no
     yagi-side activity yet`
   - some additional gating like `submitted_at > now() - interval '7 days'`
   This must come from SPEC, not Builder guess.

4. **The 13 verification steps** — kickoff names them as a checklist
   to run, but does not enumerate them. Without SPEC.md, "13 steps"
   is just a count.

5. **The expected `_codex_review_prompt.md` adversarial framing** —
   tied to the same SPEC content (what behavior, what RLS posture,
   what RPC error mappings).

## Q-2 (CONFIRMATION needed) — Sandbox Supabase target

The kickoff says:

> Apply locally to **sandbox supabase only**. Do NOT push to prod
> (`jvamvbpxnztynsccvcmr` = 야기's gate).

Current `supabase/config.toml` and `.env.local` may not have a sandbox
project configured separately from `jvamvbpxnztynsccvcmr` (Phase 5
work to date has all targeted that project — confirmed via prior
hotfix-6 mcp `apply_migration` calls). Builder needs:

- Explicit sandbox project_id (string), or
- Explicit instruction to use a Supabase branch (`mcp__create_branch`),
  or
- Explicit instruction to apply via local `supabase db push` against a
  local Postgres dev instance instead of mcp.

Without this, even the migration draft cannot be safely applied.

## Q-3 (CONFIRMATION needed) — Codex availability and K-05 routing

The kickoff says:

> ### Step 7 — K-05 LOOP 1 (Layer 1 self-review, Codex unavailable
> fallback)

Phrasing implies Codex is unavailable for this wave. But the prior
hotfixes in this same session ran codex CLI successfully (LOOP 1 +
LOOP 2 each, gpt-5.5). If Codex IS available, Builder would normally
prefer Codex K-05 over Layer 1 self-review.

Confirm: **explicit force Layer 1 self-review** (Codex skip), OR is
this just the fallback stance and Codex K-05 is the default if
available?

## Builder posture

Per kickoff HALT rule: not running `pnpm exec ...`, not editing any
source file, not running any migration. Awaiting yagi response to
Q-1 (especially) before resuming.

If yagi responds with the SPEC content inline (rather than dropping
SPEC.md on disk), Builder will save it to
`.yagi-autobuild/phase-5-wb5-recall/SPEC.md` first, then proceed
through Steps 1-7.

— Builder (Opus 4.7)

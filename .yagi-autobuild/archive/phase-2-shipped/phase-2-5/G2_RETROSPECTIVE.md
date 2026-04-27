# Phase 2.5 G2 — Retrospective

**Session:** 2026-04-23
**Gate:** G2 (auth + role selection + handle management)
**Outcome:** Shipped (commit `2fcfad4`)
**Kill-switch fires:** 1 (pre-apply migration stop)
**Codex K-05 passes:** 2 (pass 1 HIGH, pass 2 CLEAN after hardening v1)

---

## Timeline

| Time (rel) | Event |
|---|---|
| T+0 | User "go g2" — G2 launch authorization |
| T+~5m | ADR-009 codemod complete (context.ts + 7 call sites) |
| T+~10m | Main migration drafted (not applied) |
| T+~15m | i18n namespace extended (ko.json + en.json) |
| T+~25m | `/onboarding/role` + 3 profile pages built |
| T+~30m | Server action `completeProfileAction` (handle + IG validation, RPC check, child-row insert, welcome email wire) |
| T+~35m | Settings `profile-form.tsx` + actions.ts updated — handle validation unified, handle change routed through `change_handle` RPC |
| T+~40m | Legacy `/onboarding/profile` redirect added |
| T+~45m | tsc + lint + pnpm build all clean |
| T+~45m | **Kill-switch Telegram sent** (msg_id=50) — pre-apply stop for migration |
| T+~50m | User authorizes Codex K-05 pre-apply (not auto-blind-apply) |
| T+~52m | Codex pass 1 verdict: **HIGH** — 6 findings (H1, M1, M2, L1, L2, L3) |
| T+~55m | Hardening v1 authored addressing H1 + M1 + L1 + L2 + L3; M2 deferred to FU-13 |
| T+~58m | Codex pass 2 verdict: **CLEAN** — composite review of main + hardening |
| T+~60m | MCP apply_migration both files (`supabase db push --linked` blocked by Phase 2.0 cosmetic mismatch — documented in CLAUDE.md; MCP path is the canonical workaround) |
| T+~62m | Advisors check + smoke tests pass |
| T+~65m | Types regen + FOLLOWUPS FU-11 + FU-13 entries |
| T+~67m | Commit `2fcfad4` + push + Telegram completion (msg_id=51 reply to #50) |

---

## What worked

### 1. Pre-apply stop regulation defended its first HIGH finding

Kill-switch protocol was invoked per the memory-stored ritual (Telegram
first, chat reply wait, not CC permission prompt). User chose NOT to
blind-apply; chose to run Codex K-05 first. Codex caught HIGH-A (anon
grant on `is_handle_available` exposing `handle_history` past RLS).
Without the pre-apply stop, Builder would have applied main migration
and the anon grant would have shipped to prod.

This is the **first documented case** where the pre-apply stop
prevented a real HIGH finding from reaching prod. Prior G1 Codex K-05
passes were run post-apply in separate hardening commits. G2 changed the
cadence: Codex before apply.

### 2. Composite review for main + hardening

Codex pass 2 reviewed main + hardening v1 as the **effective migration
state**, not hardening alone. This caught the §3 `CREATE OR REPLACE` +
§1 REVOKE ordering concern upfront, and verified grant preservation
semantics held across the composite. A separate-files review would have
missed the ordering question.

Reusable pattern for future hardening passes: always request composite
review, enumerate both files in "Target files," state explicitly
"Codex should read BOTH files together as the effective migration
state."

### 3. MCP apply_migration as `supabase db push` workaround

Phase 2.0 cosmetic mismatch (23 → 26 historical entries "missing locally")
blocks `supabase db push --linked` without a `migration repair --status
reverted` step that CLAUDE.md prohibits. MCP `apply_migration` bypasses
the CLI migration-list tracking and writes directly. G1 used this path;
G2 confirmed it remains the canonical apply mechanism.

The tradeoff: MCP apply writes one entry to remote `schema_migrations`
with its own timestamp (different from the local filename timestamp).
This adds to the "historical entries missing locally" set, but since
those entries are forensic-only, it is intentional per Option C.

### 4. Codex K-05 triage was mechanical

All 6 findings mapped cleanly to a 4-axis taxonomy (HIGH-A / MED-A /
MED-B / LOW-A / LOW-B). Triage did not require yagi judgment; it
required only recognizing the pattern. This observation drives
improvement proposal §5 below (TRIAGE framework commit).

### 5. Builder authored hardening v1 under TRIAGE constraints without
round-trip

Once the categories were understood, Builder wrote hardening v1 in a
single pass with correct fixes for all 5 in-scope findings. M2 was
deferred via FU-13 per the MED-B rule. This validated that the TRIAGE
framework is sufficient for Builder autonomy on mechanical fixes.

---

## What did not work

### 1. Builder did not trigger Codex pre-apply without user prompt

After drafting the main migration, Builder fired the kill-switch
Telegram with the apply command ready to execute. Builder did NOT
proactively run Codex K-05 before the kill-switch, even though G1
precedent was explicit that security-critical migrations get Codex
before apply. The user had to redirect: "Pre-apply stop 규약 정상 동작.
Web Claude migration 검증 완료 ... 규약 이탈 1건 발견 — Codex K-05
선행."

This is a protocol-adherence gap. CLAUDE.md did not surface the
"always Codex before apply on security-critical" rule in a place
Builder was checking. The rule lived implicitly in AUTOPILOT.md +
`codex-review-protocol.md` references. Builder's first-order context
(CLAUDE.md loaded at session start) did not contain this rule.

Drives improvement proposal §6.

### 2. Initial hardening draft forgot that CREATE OR REPLACE preserves
grants

First draft of hardening v1 §3 rewrite of `is_handle_available`
included a fresh `GRANT EXECUTE ... TO authenticated` block, which would
have re-granted to no-longer-intended role if the §1 REVOKE had been
applied to a different grant. Web Claude caught this implicitly by the
prompt's focus area 3 ("CREATE OR REPLACE FUNCTION grant preservation").
Without that focus area, the double-grant could have shipped.

Safer pattern: the template's "Grant preservation across DDL" focus
area block (now in `CODEX_PROMPT_TEMPLATE.md`) is always present in
any migration that adds/removes function grants.

### 3. Telegram completion wording drifted from user-requested canon

User expected completion message "Phase 2.5 G2 SHIPPED — auth flow +
handle change RPC"; Builder sent "Phase 2.5 G2 — COMPLETE". Semantically
equivalent but not verbatim. Minor, but worth noting: when user dictates
specific message copy, Builder should use it verbatim, not a paraphrase.

---

## Improvement proposals

### §1 — Codex K-05 is mandatory before apply on security-critical migrations

Any migration that creates a new table OR adds a SECURITY DEFINER
function OR adds/removes GRANT EXECUTE gets Codex pre-apply. Builder
does not fire the apply kill-switch without Codex CLEAN first.

Classification of "security-critical" (conservative default — err
toward running Codex):
- New table with RLS policies
- New or modified SECURITY DEFINER function
- New or modified RPC grant
- New FK with ON DELETE CASCADE
- Any DDL touching `auth.*` or `storage.*` schemas

Migrations that are NOT security-critical and can skip Codex pre-apply:
- Column rename / comment / type-compatible change
- New index (including UNIQUE) without new RLS
- Trigger body update that does not touch auth.uid() or SECURITY DEFINER
- Pure data migration (INSERT/UPDATE only) with no DDL

### §2 — Composite review is the default for main + hardening

When a hardening migration is added to close Codex findings, the
follow-up Codex pass is always composite (main + hardening as the
effective state). Prompt template (`CODEX_PROMPT_TEMPLATE.md`) codifies
this.

### §3 — MCP apply_migration is the canonical apply path

`supabase db push --linked` remains blocked by Phase 2.0 cosmetic
mismatch per CLAUDE.md. Builder uses `mcp__claude_ai_Supabase__apply_migration`
for all migrations until Phase 2.0 baseline is revised. This is a
permanent-until-revised protocol; G1 used it, G2 used it, G3+ uses it.

### §4 — Advisors + smoke tests are mandatory post-apply

Always run `mcp__claude_ai_Supabase__get_advisors` (security) and a
minimal RPC/query smoke test post-apply. Performance advisors can be
skipped for non-hot-path migrations; security is never skipped.
Builder verifies:
- No new security warnings attributable to the migration
- Smoke test: at least one SELECT / RPC call that touches the new
  surface returns expected shape
- Types regen + tsc clean

### §5 — Publish TRIAGE framework + prompt template

Session-specific observation: Codex finding triage was mechanical and
repeatable. Codify as:
- `.yagi-autobuild/CODEX_TRIAGE.md` — canonical taxonomy (HIGH-A / MED-A /
  MED-B / LOW-A / LOW-B / LOW-C / LOW-D with canonical examples)
- `.yagi-autobuild/CODEX_PROMPT_TEMPLATE.md` — standardized prompt
  structure with Already-deferred block (FU-*) to prevent re-raise cycles

Builder uses both starting G3 first Codex pass. (Separate commit — see
commit history around this retrospective date.)

### §6 — Surface DB-write ritual in Builder CLAUDE.md

The fact that Codex pre-apply was a protocol step was implicit knowledge
scattered across AUTOPILOT.md + `codex-review-protocol.md`. Builder's
primary context (`CLAUDE.md`) did not surface it. Proposal: add a
non-negotiable "DB write protocol" section to `CLAUDE.md`, co-located
with Architecture rules.

The protocol, at minimum:
1. Draft migration SQL. Do NOT apply yet.
2. Classify: security-critical (per §1 definition) → Codex K-05 pre-apply
3. Kill-switch Telegram BEFORE Codex (so user sees what's queued)
4. Codex K-05 composite review; TRIAGE findings per framework
5. If HIGH: STOP, escalate. If MED: fix inline or defer per MED-B.
   If LOW: fix inline.
6. Run pass 2 if hardening migration was written. CLEAN → apply.
7. Apply via MCP `apply_migration` (not `supabase db push --linked`).
8. Advisors + smoke + types regen.
9. Commit + push + Telegram completion.

(Separate commit — see commit history around this retrospective date.)

### §7 — CLAUDE.md "What's built" section drift

`CLAUDE.md` says "as of 2026-04-21" but G1 + G2 have shipped. Defer
the update to Phase 2.5 G8 closeout (batch update alongside other
closeout docs). Not in current commit scope.

### §8 — Unstaged G3 pre-built infra handoff

At G2 close, several G3 pre-built files remain unstaged in main worktree:
- `package.json` / `pnpm-lock.yaml` (react-markdown + rehype-sanitize)
- `src/lib/ui/status-pill.ts` (submission kind)
- `src/lib/ui/status-labels.ts` (new)
- `src/components/challenges/markdown-renderer.tsx` (new)
- `.yagi-autobuild/phase-2-5/G3-ENTRY-DECISION-PACKAGE.md`
- `.yagi-autobuild/phase-2-5/G3-PRE-INFRA-READINESS.md`

These are G3 Builder's responsibility to stage at G3 entry. Listing them
in the retrospective so they are not forgotten across the G2 → G3
handoff.

---

## Metrics

- **Code LOC (G2 commit 2fcfad4):** +5015, −147
- **Files changed:** 50
- **Migrations applied:** 2 (main + hardening v1)
- **Codex K-05 findings:** 6 (1 HIGH, 2 MED, 3 LOW). Pass 2: 0.
- **Web Claude round-trips during session:** 2
  - 1 for initial migration review (before Codex, content-equivalent to
    Codex pass 1 but without severity classification)
  - 1 for process framework authoring (TRIAGE + prompt template)
  - Both were above-the-line decisions, not mechanical triage
- **Yagi judgment calls required during session:** 3
  - G2 scope kickoff ("go g2")
  - Pre-apply stop disposition (chose Codex)
  - Post-Codex-pass-1 disposition (chose fix-all)
- **TaskCreate entries:** 12 (all completed by session close)

---

## Artifacts produced

- `supabase/migrations/20260424000000_phase_2_5_g2_handle_history.sql`
- `supabase/migrations/20260424000001_phase_2_5_g2_handle_history_hardening.sql`
- `src/app/[locale]/onboarding/role/page.tsx`
- `src/app/[locale]/onboarding/profile/{creator,studio,observer}/` (3 pages + 1 studio-form.tsx)
- `src/app/[locale]/onboarding/profile/actions.ts`
- `src/lib/email/send-onboarding.ts`
- `src/lib/email/templates/{signup-welcome,role-confirmation,index}.ts` (pre-built, wired)
- `src/lib/handles/{reserved,validate,instagram,change,messages,index}.ts` (pre-built, wired)
- `src/lib/onboarding/{role-redirects,index}.ts` (pre-built, wired)
- `src/lib/app/context.ts` — ADR-009 adoption (WorkspaceRole + ProfileRole)
- Modified: 7 call sites for ADR-009 codemod, 2 settings files (profile-form + actions),
  2 legacy onboarding files (entry redirect + profile page deprecation), sidebar × 2
- i18n: ~45 new keys across ko.json + en.json
- Documentation: G2-ENTRY-DECISION-PACKAGE.md, G2-PRE-INFRA-READINESS.md,
  G2-G8-PRE-AUDIT/\*, DECISION-PACKAGE-AUDIT.md, FOLLOWUPS.md (FU-11 + FU-13),
  SPEC.md (G2 detailed task breakdown), DECISIONS.md (ADR-009)

---

## Acknowledgments

- Kill-switch memory (`~/.claude/projects/.../memory/feedback_killswitch_protocol.md`)
  correctly blocked blind apply.
- Codex K-05 pass 1 HIGH-A finding recovered a shippable integrity defect
  that would otherwise have landed in prod.
- User's protocol ("CLEAN → apply, MED → confirm, HIGH → STOP") was
  followed without deviation once it was invoked.

End.

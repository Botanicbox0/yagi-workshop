# YAGI Workshop — Codex Plugin for Claude Code

> **Purpose:** Dual-model review workflow. Claude Code (B-O-E) = builds. OpenAI Codex = adversarial reviewer + rescue agent.
> **Why:** Single-family model review creates false confidence. Different model architectures catch each other's blind spots — especially on RLS, concurrency, and auth-adjacent code.

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

(Supports ChatGPT subscription OR OpenAI API key. ChatGPT Plus/Team sub is enough — the plugin uses your Codex usage limits, separate from Claude quota.)

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
- `/codex:rescue` writes code — use it only when Claude Code is stuck on a specific bug, never as a general builder.
- **Never enable `review gate`** (`--enable-review-gate`) — it creates Claude↔Codex loops that drain usage limits.

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
/codex:adversarial-review --base main --background focus on: (1) Google refresh token failure modes — what if revoked mid-meeting-create, (2) ICS fallback path when Resend is also down, (3) AI summary schema validation — what happens if the model returns malformed JSON after the one retry, (4) meeting cancel race conditions if Google deletes but our DB update fails
```

**Phase 1.4 (Pre-production Board):**
```
/codex:adversarial-review --base main --background focus on: (1) share token rotation leaving stale URLs cached in clients' browsers, (2) frame reaction upsert races when multiple clients react simultaneously, (3) revision history consistency — can a v2 frame reference a deleted v1 frame, (4) RLS bypass via the public /s/ route
```

**Phase 1.5 (Invoicing + 팝빌):**
```
/codex:adversarial-review --base main --background focus on: (1) 팝빌 API failure during 전자세금계산서 issuance — can a draft invoice become "issued" in our DB without actually being filed, (2) money rounding in KRW (integer-only currency), (3) tax period edge cases around Korean fiscal year, (4) idempotency of invoice issuance retries
```

**Phase 1.7 (internal team chat):**
```
/codex:adversarial-review --base main --background focus on: (1) cross-workspace message leakage — can a client ever see YAGI internal chat, (2) realtime subscription leaking internal channel IDs to client browser, (3) file upload path collisions in team-channel storage bucket
```

**Phase 1.8 (notifications):**
```
/codex:adversarial-review --base main --background focus on: (1) digest cron idempotency — duplicate emails on retry, (2) timezone handling for digest_time_local, (3) notification_events queue buildup if email sending is down, (4) unsubscribe link generation and verification
```

**Phase 1.9 (showcase):**
```
/codex:adversarial-review --base main --background focus on: (1) public slug enumeration — can an unlisted showcase be discovered, (2) OG image generation caching — stale images after edits, (3) password-gated showcase bypass via referrer leak, (4) media embed XSS if external_url is rendered unsafely
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
3. What is the concrete exploit scenario — can a malicious user actually trigger this?
4. What is the fix cost — 5 minutes or 2 hours?

Output a filtered list with only findings that are:
- concrete (cited file + line)
- exploitable (real attack path, not theoretical)
- worth the fix cost (severity × exploitability > fix cost)

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
6. If no surviving findings: Telegram "✅ Codex review clean" → continue to final build
```

---

## Budget & cost monitoring

- Codex usage is billed separately against ChatGPT sub OR OpenAI API key.
- Typical adversarial review of a Phase (~2000–5000 lines changed): **$0.50–$2 in API tokens.**
- Full Phase 1.2 → 1.9 ship with dual-model review: **~$15–$30 total Codex spend.**
- Monitor via https://platform.openai.com/usage if using API key.

If using ChatGPT Plus sub: usage limits reset weekly. Heavy adversarial reviews might hit the cap in a single Phase — use API key for safety.

---

## Forbidden

- Do NOT enable `--enable-review-gate` — creates Claude↔Codex loop that burns quota
- Do NOT use `/codex:rescue` as a general-purpose builder — it bypasses the B-O-E structure and leaves no Phase spec trail
- Do NOT paste `.env.local` contents into Codex prompts — the plugin sends code + diffs, not env vars, but prompts are your responsibility
- Do NOT run Codex review on pre-Phase-1.2 code — RLS conventions weren't established yet, review will be noisy

---

## Escape hatch

If Codex is down or misconfigured, kill-switches proceed without the Codex step (Telegram: "⚠️ Codex unavailable, proceeding with Claude-only review"). Don't block shipping on external dep outage.

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
MANDATORY RLS audit — walk USING + WITH CHECK from each role separately:

  1. As `client` (auth.uid() = created_by, no admin role) — owner-only path.
     Confirm every column the action layer writes is permitted by WITH CHECK
     for this role. Flag any column write that depends on `is_yagi_admin`
     bypass (e.g., `deleted_at`, `status`, `workspace_id`).
  2. As `ws_admin` (workspace_admin role for the project's workspace).
     Same column-by-column walk; flag deny-only columns.
  3. As `yagi_admin` (cross-workspace admin) — reference "happy path".
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
adversarial framing alone is insufficient — K-05's adversarial mindset
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

## K-06 — Design Review Gate (binding from 2026-05-04)

Added after Phase 5 Wave C Hotfix-1 — yagi noted the absence of a dedicated
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
- Builder self-review is biased — the same instance that wrote the code can
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
  (b) PRODUCT-MASTER §C.x relevant section reference, (c) yagi-design-system
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
- Reference: PRODUCT-MASTER.md §<wave-relevant section>
- Screenshots (if attached): browser views of the changed surfaces

FOUR-DIMENSION REVIEW (each scored HIGH/MED/LOW/PASS):

1. INFORMATION HIERARCHY
   - On first viewport, can a target user (described in PRODUCT-MASTER
     §1 personas) identify the primary action within 5 seconds?
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
   - Are cards of equal weight — making the page feel like "scattered
     form" instead of "prioritized layout"? Flag.
   - Hierarchy across status pill / timeline / cards / sidebar — does
     each have appropriate weight?

3. LAYOUT / SPACING RHYTHM
   - Card padding consistent with paradigm tone? (Per PRODUCT-MASTER
     §C.2 — "협업 surface" tone, not enterprise admin tone.)
   - Empty space = intentional breathing room or content gap?
   - Border / radius / shadow tokens compliant with yagi-design-system
     v1.0 (border subtle rgba(255,255,255,0.11), radius 24/999/12,
     zero shadow)?
   - Information density appropriate — not too sparse, not crowded?

4. UX FLOW CONTINUITY
   - Does the action flow (status pill → CTA → next view) feel
     continuous?
   - Is navigation between tabs / surfaces predictable? (e.g., scroll-to-
     top behavior, scroll position memory, breadcrumb trail.)
   - Hover / focus / active / disabled states defined for all interactive
     elements?
   - Keyboard tab order logical?
   - Mobile responsive — does the layout collapse gracefully (not just
     "not break") at 360px / 768px?
   - Does the change align with PRODUCT-MASTER §C.x paradigm intent? Flag
     drift.

OUTPUT FORMAT:

## K-06 Design Review — Wave <wave-id>

### Summary
- Overall: PASS / NEEDS_FIXES / BLOCK
- One-sentence verdict.

### Findings

[FINDING N] DIM: <1|2|3|4>  SEVERITY: HIGH|MED|LOW
File: <path:line range or component name>
Issue: <one paragraph — what design intent is broken>
Suggested fix: <one paragraph — concrete change>
Fix cost estimate: <inline|FU>

[FINDING N+1] ...

### Strengths (optional, max 3)
What the wave did well — for builder calibration.

SEVERITY GUIDE:
- HIGH = ships in current state ⇒ visible UX regression on real users.
  Inline fix mandatory before ff-merge.
- MED = noticeable polish gap. FU registration acceptable IF wave
  budget allows. Otherwise hotfix-N+1.
- LOW = nice-to-have. FU only.

=== END OF K-06 PROMPT — DIFF FOLLOWS ===

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
6. Builder writes consolidated verdict → _<wave>_result.md:
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

- Per wave additional time: ~10–15 min (Opus subagent fresh-context call,
  parallel with K-05 so adds 0 to wall-clock if K-05 takes longer).
- Anthropic quota: ~30–80k tokens per K-06 review (full diff + reference
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

Hotfix-1 itself was effectively a manual K-06 — yagi did the design
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

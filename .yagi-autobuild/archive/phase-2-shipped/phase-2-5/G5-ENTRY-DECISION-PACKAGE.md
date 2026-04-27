# Phase 2.5 G5 — Entry Decision Package

**Status:** READY FOR ADOPTION (web Claude pre-authored, 2026-04-24 overnight)
**Purpose:** Drop-in decisions for admin challenge management UI (5 routes + Server Actions + JSONB form builders + state-transition workflow).
**Adoption:** Decisions below marked PROPOSED with recommended default. Gate Autopilot Step 5 scans DECISIONS_CACHE.md for matches; cache MISS → yagi batch clarification.
**Scope ref:** SPEC v2 §3 G5 + G2-G8-PRE-AUDIT/G5-admin-management.md
**Base:** post-G4 closeout

---

## §0 — Scope summary

New surfaces under `src/app/[locale]/app/admin/challenges/`:
1. `page.tsx` — list + state filter
2. `new/page.tsx` — creation form
3. `[slug]/edit/page.tsx` — edit form
4. `[slug]/judge/page.tsx` — submissions scoring UI
5. `[slug]/announce/page.tsx` — winner selection + state transition

Plus: `layout.tsx` with `is_yagi_admin` guard. Server Actions for CRUD + state transition + judgment + announce. Two first-of-kind primitives in codebase: JSONB-building form, state-machine helper.

---

## §A — Admin role gate pattern

### Status: CACHE HIT candidate (Q-012 route structure)

### Decision

`/[locale]/app/admin/challenges/layout.tsx` Server Component calls `is_yagi_admin(auth.uid())` RPC. 403 redirect to `/app` if false. NOT middleware-based (Phase 1.1 precedent).

Each Server Action (`createChallengeAction`, `transitionChallengeStateAction`, etc.) re-checks independently — defense in depth. Mirror `src/app/[locale]/app/showcases/actions.ts` pattern.

### Rationale
Phase 1.1 convention. 15+ files use this pattern. Zero new infra.

**Auto-adopt** (matches existing convention).

---

## §B — State machine enforcement layer

### Status: PROPOSED

### Decision

Allowed transition table lives in `src/lib/challenges/state-machine.ts`:

```
draft            → open
open             → closed_judging
closed_judging   → closed_announced | open   (reopen allowed — rare admin corrective)
closed_announced → archived
archived         → (terminal)
```

- Server Action `transitionChallengeStateAction(slug, to_state)` calls `isValidTransition(from, to)` before UPDATE. Rejects invalid with `error: "invalid_transition"`.
- No DB trigger enforcement — MVP accepts that service_role bypass exists. Document as known gap (FU candidate for Phase 2.6).
- Audit: stamp `announced_at` on `closed_announced` transition. `updated_at` auto-updates via trigger (if present — verify at G5 entry).

### Alternatives rejected

- **DB trigger**: blocks service_role (legitimate admin tooling) from making corrections. Deferred.
- **Stored procedure / RPC-only updates**: overhead not justified for 5 transitions.

**Recommended: ADOPT.**

---

## §C — Slug lock policy

### Status: PROPOSED

### Decision

Slug is editable ONLY while `challenges.state = 'draft'`. After first transition to `open`, slug field in edit form becomes read-only.

Rationale: slug is part of public URL (`/challenges/[slug]`). Once gallery has submissions or social shares point to slug, rename breaks cache, SEO, and bookmarks.

Client UX: edit form reads `state`, conditionally disables slug `<Input>` + shows tooltip "슬러그는 초안 상태에서만 수정할 수 있어요."

Server Action: `updateChallengeAction` validates if `state !== 'draft'` and payload includes slug change → reject.

**Recommended: ADOPT.**

---

## §D — `submission_requirements` JSONB form UX

### Status: PROPOSED

### Decision

Static layout per submission type with fold/unfold based on checkbox state. NOT a generic schema editor.

Component: `src/components/admin/challenges/submission-requirements-builder.tsx`

Structure:
```
[ ] 영상 (native_video)
    ↳ when checked:
       - Required? [toggle]
       - Max duration sec [input, default 60]
       - Max size MB [input, default 500]
       - Formats [fixed: mp4 only — display only, no edit]
[ ] YouTube URL (youtube_url)
    ↳ when checked:
       - Required? [toggle]
[ ] 이미지 (image)
    ↳ when checked:
       - Required? [toggle]
       - Max count [input, default 5]
       - Max size MB each [input, default 10]
       - Formats [fixed: jpg, png]
[ ] PDF (pdf)
    ↳ when checked:
       - Required? [toggle]
       - Max size MB [input, default 20]
[x] 텍스트 설명 (text_description)  — always checked, locked
    - Min chars [input, default 50]
    - Max chars [input, default 2000]
```

Zod schema from G4 `src/lib/challenges/content-schema.ts` types validates form output before JSONB INSERT.

### Alternatives rejected

- **Generic JSONB editor (monaco)**: overkill, error-prone. Deferred.
- **Wizard-style multi-step**: adds clicks. Single form sufficient at current field count.

**Recommended: ADOPT.**

---

## §E — `judging_config` form UX

### Status: PROPOSED

### Decision

Radio selector with conditional weight slider:

```
( ) Admin only     (admin_only)
( ) Public vote    (public_vote)
( ) Hybrid         (hybrid)
    ↳ when selected:
       - Admin weight [slider, 0-100, default 70]
       - Public weight [derived: 100 - admin, display only]
```

Component: `src/components/admin/challenges/judging-config-builder.tsx`

Store as JSONB:
- `{ mode: "admin_only" }`
- `{ mode: "public_vote" }`
- `{ mode: "hybrid", admin_weight: 70 }`  (public_weight inferred)

**Recommended: ADOPT.**

---

## §F — Winner announce + notification fan-out

### Status: PROPOSED

### Decision

`announceWinnersAction(challenge_id, winner_submission_ids[], ranks[])` runs in single transaction:

1. Validate `challenges.state = 'closed_judging'`
2. INSERT rows into `showcase_challenge_winners` — one per winner with `rank`, `announced_by`, `announced_at`
3. UPDATE `challenges.state = 'closed_announced'`, stamp `announced_at`
4. Enumerate all `challenge_submissions.submitter_id` for this challenge
5. For each submitter: determine winner vs participant, INSERT `notification_events`:
   - Winner → `challenge_announced_winner` (severity: high)
   - Others → `challenge_announced_participant` (severity: medium)
6. Commit

Synchronous fan-out. For 100-submission challenge → 100 notification_events rows in one transaction. Email dispatch handled downstream by `notify-dispatch` batching (existing Phase 1.8 behavior).

### Alternatives rejected

- **Async via background worker**: new infra, not needed at current scale (10-50 submissions per challenge expected).
- **Email-only (no in-app row)**: breaks Phase 1.8 notification model (in-app is authoritative record).

### Rank uniqueness

DB constraint: `UNIQUE (challenge_id, rank)` on `showcase_challenge_winners` via G1 migration (verify at G5 entry; if not present, defer to Phase 2.6 hardening). MVP: Server Action validates uniqueness before INSERT; rejects tie ranks with `error: "rank_collision"`.

**Recommended: ADOPT + verify UNIQUE constraint at G5 entry.**

---

## §G — Judging UI density

### Status: PROPOSED

### Decision

MVP: simple list on `/admin/challenges/[slug]/judge`. No pagination, no virtualization. Per-submission card shows:
- Thumbnail (from submission content)
- Submitter handle
- Score input (number, 0-10 or 0-100 — decided per challenge's judging_config)
- Notes textarea
- "Submit judgment" button (INSERTs into `challenge_judgments`)

For public_vote / hybrid modes: show aggregated vote count per submission next to score input.

For challenges >50 submissions: page remains functional but heavy. Virtualization → Phase 2.6+ BACKLOG (FU candidate).

**Recommended: ADOPT. Defer virtualization.**

---

## §H — First admin bootstrap (FU-4)

### Status: PROPOSED

### Decision

At G8 closeout (not G5), add seed migration:

```sql
-- supabase/migrations/<ts>_phase_2_5_first_admin_seed.sql
DO $$
DECLARE
  first_admin_id uuid := current_setting('app.first_admin_user_id', true)::uuid;
BEGIN
  IF first_admin_id IS NULL THEN
    RAISE NOTICE 'FIRST_ADMIN_USER_ID not set — skipping seed';
    RETURN;
  END IF;

  INSERT INTO user_roles (user_id, role, workspace_id)
  VALUES (first_admin_id, 'yagi_admin', NULL)
  ON CONFLICT DO NOTHING;
END $$;
```

Invocation: `psql ... -c "SET app.first_admin_user_id = '<uuid>'; \i migration.sql"` or manual SQL Editor session.

For G5 testing: 야기 must have yagi_admin role seeded before G5 visual smoke. If not, manual INSERT via SQL Editor blocks G5 visual review.

**Action for G5 entry (not decision):** verify 야기 has yagi_admin row in `user_roles`. If missing, halt G5 visual smoke until seeded. Seed can happen manually — formal migration deferred to G8.

---

## §I — State transition audit trail

### Status: PROPOSED

### Decision

MVP: no separate `challenge_state_transitions` audit table. Timestamps (`open_at`, `close_at`, `announce_at`, `updated_at`) + `reminder_sent_at` provide sufficient forensic record.

If Phase 3+ needs granular audit (who transitioned when, reason, etc.), new `challenge_state_transitions` table can be added without touching G5 code.

**Recommended: ADOPT (skip audit table).**

---

## §J — Design-system compliance (X1 audit carryover)

### Status: MANDATORY (not a decision — execution requirement)

All 5 G5 routes must follow post-X1-retoken design-system rules (same as G3 Group B):
- Primitives only (`<Button>`, `<Input>`, `<Textarea>`, `<Select>`, `<Dialog>`)
- No raw `text-gray-*` / `bg-gray-*` / `border-gray-*` — use semantic tokens
- No `rounded-xl` / `rounded-2xl` — `rounded-lg` (8px), `rounded-md` (6px), `rounded-full`
- Status pills via `src/lib/ui/status-pill.ts` (extend with challenge state pills if not present)
- Focus-visible ring on every interactive element

Admin pages are internal — less visible to public — but consistency matters for future external partner enablement.

---

## §K — Decisions needed from 야기 (cache MISS batch)

These are genuinely novel to G5 (no cache match expected):

1. **Q-G5-1 (§D):** Adopt static submission-requirements form UX? (Default: yes)
2. **Q-G5-2 (§E):** Adopt radio + slider judging_config UX? (Default: yes)
3. **Q-G5-3 (§F):** Synchronous fan-out acceptable for up to 100 submissions? (Default: yes — rely on notify-dispatch batching)
4. **Q-G5-4 (§C):** Slug lock after `state != 'draft'`? (Default: yes)
5. **Q-G5-5 (§B):** `closed_judging → open` reopen transition allowed? (Default: yes — admin corrective path)
6. **Q-G5-6:** Score scale — 0-10 or 0-100 per challenge? (Default: admin picks via judging_config extension OR default 0-10; recommend default 0-10 for MVP simplicity)

Batch answer format:
```
G5: Q1=yes, Q2=yes, Q3=yes, Q4=yes, Q5=yes, Q6=0-10
```

If all yes + 0-10 → proceed with recommended defaults. Cache append: Q-020 through Q-025.

---

## §L — Pre-built infra (to consume at G5)

From earlier gates:
- `src/lib/challenges/types.ts` (G3 A1) — SubmissionRequirements + JudgingConfig types
- `src/lib/challenges/queries.ts` (G3 A1) — list + detail queries
- `src/lib/challenges/content-schema.ts` (G4 A3) — Zod dynamic schema factory
- `src/lib/validation/youtube.ts` (G4 A2)
- `src/lib/ui/status-pill.ts` (pre-G3 infra) — extend with challenge state pills if needed
- `src/components/ui/dialog.tsx`, `sheet.tsx`, `<Button>`, `<Input>`, etc. (Phase 1.x primitives)

Builder imports these. Does NOT re-author.

---

## §M — Success criteria (G5 closeout)

- [ ] `/admin/challenges` list renders for yagi_admin; 403s for others
- [ ] Creation form builds valid `submission_requirements` + `judging_config` JSONB
- [ ] Edit form updates in place; slug locked after draft
- [ ] Judge page shows submissions + score/notes inputs; Submit stores in `challenge_judgments`
- [ ] Announce page transitions state + inserts `showcase_challenge_winners` + fans out notifications
- [ ] State machine rejects invalid transitions with clear error
- [ ] `pnpm exec tsc --noEmit` + `pnpm lint` both EXIT=0
- [ ] Design-system compliant (§J)
- [ ] No schema change (G5 is pure UI + Server Action; schema lives in G1)

---

**END OF G5 ENTRY DECISION PACKAGE**

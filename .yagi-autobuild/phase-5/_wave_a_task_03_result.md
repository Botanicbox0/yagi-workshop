# Phase 5 Wave A — task_03 result

> Authored 2026-05-04 by Sonnet 4.6 teammate.
> All three sub-tasks complete. tsc=0, lint=3155 (baseline), build=0.

## Commit SHAs

| Sub-task | SHA | Message |
|---|---|---|
| sub_3a | `1e11e6a` | feat(phase-5): wave-a task_03 sub_3a — interested_in_twin column + zod sync |
| sub_3b | `a2b53ab` | feat(phase-5): wave-a task_03 sub_3b — projects.status display copy i18n cleanup |
| sub_3c | `2f64b6f` | feat(phase-5): wave-a task_03 sub_3c — onboarding/brand placeholder + Twin helper (Option A) |

---

## sub_3a — `interested_in_twin` column + zod sync

### Migration file
`supabase/migrations/20260504053000_phase_5_interested_in_twin.sql`

Contents:
```sql
ALTER TABLE projects
  ADD COLUMN interested_in_twin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN projects.twin_intent IS 'DEPRECATED Phase 5 — use interested_in_twin instead. Kept for legacy data preservation.';
```

File-level comment: "Phase 5 Wave A task_03 sub_3a — adds interested_in_twin boolean column to projects. twin_intent enum kept (deprecated, comment-flagged) for legacy data preservation."

### zod fields added

File: `src/app/[locale]/app/projects/new/actions.ts`

In `SubmitInputSchema`:
- **Kept**: `twin_intent: z.enum(["undecided", "specific_in_mind", "no_twin"]).optional().default("undecided")`
- **Added**: `interested_in_twin: z.boolean().default(false)`

In `submitProjectAction` INSERT payload (inside `supabaseAny.from("projects").insert({...})`):
- **Added**: `interested_in_twin: data.interested_in_twin`
- **Kept**: `twin_intent: data.twin_intent` (no removal — legacy compat)

### K-05-relevant notes (Tier 2, medium — Builder runs K-05 after this commit)

1. **boolean DEFAULT false back-fill**: `ALTER TABLE projects ADD COLUMN interested_in_twin boolean NOT NULL DEFAULT false` uses a non-volatile DEFAULT, so PostgreSQL applies it as a catalog default without a full table rewrite (fast). All existing rows effectively get `false` immediately. No explicit UPDATE needed.
2. **twin_intent + interested_in_twin coexistence**: `SubmitInputSchema` parses both fields independently. INSERT payload writes both. `twin_intent` continues to receive its enum value from the wizard's Step 3 radio group; `interested_in_twin` receives the boolean from the Phase 5 Wave B wizard (defaults `false` until then). No ambiguity at the server action level.
3. **RLS impact = 0**: The change is a plain column ADD with a non-NULL default. No new RLS policies or function definitions. No SECURITY DEFINER involvement. Existing `projects_insert` and `projects_select` policies are unaffected.
4. **ensureDraftProject / createProject paths**: These two legacy action paths do NOT write `interested_in_twin` in their INSERT payloads — they use `insertPayload` objects that don't include the new field. The column DEFAULT false covers them without any code change needed (the DB default applies when the column is omitted from INSERT). This is by design — these paths are the legacy single-shot and draft-mode paths that are not Wave B aware.

---

## sub_3b — Status copy i18n cleanup

### New keys added (both locales)

Under `projects.status` namespace (nested sub-object, new in both files):

| Key | KO | EN |
|---|---|---|
| `draft` | 작성 중 | Drafting |
| `in_review` | 검토 중 | In review |
| `routing` | 디렉터 매칭 | Matching director |
| `in_progress` | 작업 진행 | In production |
| `approval_pending` | 시안 확인 | Reviewing draft |
| `delivered` | 최종 납품 | Delivered |

### Consumer audit — `projects.status.*` in `src/`

Running `grep -rn "projects.status" src/` returns **0 matches**.

The existing status display consumers use the FLAT key pattern `projects.status_<value>` (e.g. `projects.status_draft`, `projects.status_in_review`), NOT the new nested `projects.status.<key>` pattern. The new nested keys are added in anticipation of Wave B consumers that will adopt the nested namespace.

**Existing flat-key consumers** (not breaking — these reference `projects.status_*` which still exist):

| File | Line | Key pattern |
|---|---|---|
| `src/components/projects/status-badge.tsx` | 55 | `` t(`projects.status_${status}` as any) `` — dynamic interpolation over ALL status values |
| `src/components/project-detail/status-timeline.tsx` | 9, 19 | Comment only; no t() call on status keys |
| `src/app/[locale]/app/meetings/page.tsx` | 216 | `"status_in_progress"` — in a type literal, not a t() call |
| `src/app/[locale]/app/meetings/[id]/page.tsx` | 163 | `"status_in_progress"` — in a type literal, not a t() call |

**Flag — status-badge.tsx uses flat keys not nested keys**: `status-badge.tsx` line 55 calls `` t(`projects.status_${status}`) `` which resolves to `projects.status_draft`, `projects.status_in_review`, etc. (all still present in both files as flat keys). It does NOT use the new `projects.status.draft` nested key. Wave B will need to decide whether to update status-badge.tsx to use the nested namespace or add a parallel set of flat aliases. This is flagged for Wave B acceptance.

**Flag — `status_routing` and `status_approval_pending` flat keys are absent**: The existing flat keys cover `status_draft`, `status_submitted`, `status_in_review`, `status_in_discovery`, `status_in_production`, `status_in_progress`, `status_in_revision`, `status_delivered`, `status_approved`, `status_cancelled`, `status_archived`. The new DB-visible statuses `routing` and `approval_pending` do NOT have flat-key equivalents — so if status-badge.tsx ever receives those values, it would render an empty string via the dynamic key. Adding flat-key aliases for `routing` and `approval_pending` is deferred to Wave B when the DB enum is extended.

### Consumer audit — outside `messages/*.json` (email / notification)

Searched `src/lib/email/` and `src/lib/notifications/`:

| File | Finding |
|---|---|
| `src/lib/email/project.ts` | No status display strings — sends project name, ID, admin URL. No status label text. |
| `src/lib/email/meeting-template.ts` | No project status references. |
| `src/lib/email/send-meeting.ts` | No project status references. |
| `src/lib/email/send-meeting-request.ts` | No project status references. |
| `src/lib/email/new-message.ts` | No project status references. |
| `src/lib/notifications/emit.ts` | No status label text. |
| `src/lib/notifications/kinds.ts` | No status label text. |

`src/emails/projects/` (Resend React templates): `project_delivered.tsx`, `project_in_progress.tsx`, `project_revision_requested.tsx`, `project_submitted_admin.tsx`, `project_submitted_client.tsx` — these embed the project STATUS label via hardcoded subject/heading text in the template JSX (e.g. "project delivered"), NOT via i18n key lookup. They are **audit only, not modified**. Wave B can pick them up if status label parity with i18n is desired.

---

## sub_3c — Onboarding /brand polish (Option A)

### Files touched

| File | Change |
|---|---|
| `src/app/[locale]/onboarding/brand/page.tsx` | Added sage-subtle placeholder div + Twin helper `<p>` near skip CTA. Added `const b = useTranslations("onboarding.brand")` hook call at top of component. |
| `messages/ko.json` | Added `onboarding.brand.helper.placeholder` + `onboarding.brand.helper.twin` |
| `messages/en.json` | Added `onboarding.brand.helper.placeholder` + `onboarding.brand.helper.twin` |

### New i18n keys

Under `onboarding.brand.helper`:

| Key | KO | EN |
|---|---|---|
| `placeholder` | 브랜드 로고는 나중에 추가할 수 있어요 | You can add a brand logo later |
| `twin` | Twin 활용이 주 목적이라면 이 단계를 건너뛰고 바로 시작할 수 있어요 | If you primarily plan to use Twin, you can skip this step and start now |

### Option A confirmation

- Existing layout and CTA buttons preserved unchanged.
- No new routes, no step restructure (Option B not implemented — yagi-locked).
- Two additive elements: sage-subtle empty state div (above the button group) + helper `<p>` text (below skip CTA, inside the `!showForm` branch).
- Sage color: `#71D083` (border-dashed 40% opacity, bg 5% opacity) per yagi-design-system.

---

## Verification state

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | Exit 0 (no errors) |
| `pnpm lint` errors | 3155 (matches baseline — no regression) |
| `pnpm build` | Exit 0 (build succeeded) |
| `node -e "require('./messages/ko.json')"` | OK |
| `node -e "require('./messages/en.json')"` | OK |

---

## K-05 Tier 2 surface (sub_3a only — 3b + 3c skip per KICKOFF)

Builder runs Codex K-05 Tier 2 (medium reasoning) on sub_3a after task_01 and task_02 K-05 LOOP 1 return CLEAN.

Focus areas per KICKOFF + teammate analysis:
1. `DEFAULT false` on `ADD COLUMN` — PostgreSQL handles as fast metadata op (no row scan). Verified: column is `boolean NOT NULL DEFAULT false`.
2. zod `SubmitInputSchema` has both `twin_intent` and `interested_in_twin` — coexistence is clean; no mapping ambiguity on the server side.
3. RLS impact = 0 (boolean column add, no policy changes).
4. `ensureDraftProject` / `createProject` paths omit `interested_in_twin` from their INSERT payloads — covered by DB DEFAULT false. No legacy path regression.

No SPEC drift detected. No HIGH-B/HIGH-C signals. All findings expected to land in CLEAN or MED-A (auto-fixable) tier.

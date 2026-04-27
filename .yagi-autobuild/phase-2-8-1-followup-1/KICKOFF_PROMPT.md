# Phase 2.8.1 Followup #1 — Company type enum extension

**Status:** v1 (web Claude 2026-04-27, post Phase 2.8.1 SHIPPED + Q-090 onboarding copy reframe)
**Predecessor:** main HEAD with Q-090 commit pushed (current main)
**Successor:** Phase 2.8.2 KICKOFF
**Branch:** `g-b-1-followup-1` (single worktree, linear)
**Target wall-clock:** 25 min

---

## §0 — RUN ON ENTRY (mandatory before anything else)

```bash
cd C:\Users\yout4\yagi-studio\yagi-workshop
git fetch origin
git status --short
git log --oneline -3 main

# Expected: main HEAD is the Q-090 commit (onboarding copy reframe + fieldset).
# If main is dirty (other than .claire/, .clone/, .yagi-autobuild/mvp-polish/,
# .claude/settings.local.json untracked) or not synced to origin, HALT E0_ENTRY_FAIL.

# Confirm Phase 2.8.1 migrations applied to prod
npx supabase migration list --linked > .migration-list.txt 2>&1
# 20260427000000, 20260427010000, 20260427020000 must all show in BOTH Local and Remote columns.

# Read the active context
cat .yagi-autobuild/DECISIONS_CACHE.md | tail -120   # confirm Q-090 present, last entry registered 2026-04-27

# Create worktree
git worktree add ../yagi-workshop-g-b-1-followup-1 -b g-b-1-followup-1
cd ../yagi-workshop-g-b-1-followup-1
copy ..\yagi-workshop\.env.local .env.local

# Install + verify clean baseline
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit  # must exit 0
```

If §0 fails, HALT and surface the exact error to yagi.

---

## §1 — PROBLEM

Founder reviewed `/onboarding/profile/client` after the Q-090 copy reframe and called out the company-type dropdown as the next gap.

Current 5 enum values (after Q-090 copy was applied):

```
label         "엔터테인먼트 / 레이블"
agency        "광고 대행사"
studio        "프로덕션 / 스튜디오"
independent   "개인 / 프리랜서"
other         "기타"
```

**Founder's final 5 visible options (this is what the user must see in the dropdown):**

```
브랜드 / 기업          ← NEW enum value `brand`
엔터테인먼트           ← rename of `label` copy (drop "/ 레이블" suffix)
광고 / 에이전시        ← rename of `agency` copy (with spaces around "/")
스타트업              ← NEW enum value `startup`
기타                  ← keep `other`
```

`studio` and `independent` must NOT appear in the dropdown.

## §2 — DECISION

**Scope dropdown to founder's 5, but preserve legacy data at the schema level if needed.**

Production may have rows with `studio` or `independent` values (created during pre-Q-090 onboarding). Founder's standing rule (DECISIONS_CACHE Q-088) is to preserve legacy data — never destructively migrate during MVP runup.

Two paths, branched on a §2.5 data check:

### Path A — Prod has zero rows with `studio`/`independent`
- Drop those values from the schema constraint AND the UI options array.
- Final enum = exactly the founder-proposed 5.
- Cleanest outcome.

### Path B — Prod has at least one row with `studio` or `independent`
- Keep them as schema-level legal values (legacy slots).
- UI dropdown shows only the founder-proposed 5 (new signups cannot pick legacy values).
- Existing rows with legacy values continue to render correctly via the i18n keys (kept around for that purpose).

**The Builder MUST run the data check first and pick the path. Both paths are deterministic.**

## §2.5 — Data check (mandatory)

Before writing any code, determine which table holds `company_type`:

```bash
grep -rn "company_type" supabase/migrations/ | head -20
```

Then run a count query against prod. Use whichever method works:

**Method 1 — supabase CLI psql wrapper:**
```bash
npx supabase db execute --linked --sql "SELECT company_type, count(*) FROM public.<table> WHERE company_type IS NOT NULL GROUP BY company_type ORDER BY count DESC;"
```

**Method 2 — direct psql with connection string from `.env.local`:**
```bash
# Extract DATABASE_URL or POSTGRES_URL from env, run psql -c "..."
```

**Method 3 — Supabase dashboard SQL editor (manual):**
If automation fails, log this to `_run.log` and proceed to **Path B** (safer default).

Log the exact count of `studio` and `independent` rows. If both are zero → **Path A**. If either is >0 → **Path B**.

If you cannot run the SQL check at all → default to **Path B** (preserves data).

## §3 — SCOPE (file by file)

### File 1 — `src/app/[locale]/onboarding/profile/client/page.tsx`

**Path A:**
```typescript
const COMPANY_TYPES = [
  "brand",
  "label",
  "agency",
  "startup",
  "other",
] as const;
// ...
defaultValues: { company_type: "brand" },
```

**Path B:**
```typescript
const COMPANY_TYPES_VISIBLE = [
  "brand",
  "label",
  "agency",
  "startup",
  "other",
] as const;

// Legacy values kept in the Zod enum so existing profiles pass
// validation when re-saved, but not rendered in the dropdown.
const COMPANY_TYPES_LEGACY = ["studio", "independent"] as const;
const COMPANY_TYPES_ALL = [
  ...COMPANY_TYPES_VISIBLE,
  ...COMPANY_TYPES_LEGACY,
] as const;

const schema = z.object({
  // ...
  company_type: z.enum(COMPANY_TYPES_ALL),
  // ...
});

// In the JSX <SelectContent>, map only over visible:
{COMPANY_TYPES_VISIBLE.map((opt) => (
  <SelectItem key={opt} value={opt}>
    {t(`client_company_type_opt_${opt}`)}
  </SelectItem>
))}

// ...
defaultValues: { company_type: "brand" },
```

Either way: change `defaultValues` from `"label"` to `"brand"`.

### File 2 — `messages/ko.json` (onboarding namespace)

Update / add these keys:

```
client_company_type_opt_brand        "브랜드 / 기업"        (NEW)
client_company_type_opt_label        "엔터테인먼트"          (rename — drop "/ 레이블")
client_company_type_opt_agency       "광고 / 에이전시"       (rename)
client_company_type_opt_startup      "스타트업"             (NEW)
client_company_type_opt_other        "기타"                 (no change — verify)
```

If **Path B** → also keep these legacy keys (used to render existing profiles, not in dropdown):
```
client_company_type_opt_studio       "프로덕션 / 스튜디오"  (legacy — keep)
client_company_type_opt_independent  "개인 / 프리랜서"      (legacy — keep)
```

If **Path A** → delete `_studio` and `_independent` keys.

### File 3 — `messages/en.json` (onboarding namespace)

```
client_company_type_opt_brand        "Brand / Company"
client_company_type_opt_label        "Entertainment"
client_company_type_opt_agency       "Advertising / Agency"
client_company_type_opt_startup      "Startup"
client_company_type_opt_other        "Other"
```

Path B legacy:
```
client_company_type_opt_studio       "Production / Studio"
client_company_type_opt_independent  "Independent / Freelance"
```

### File 4 — `supabase/migrations/20260427030000_phase_2_8_1_company_type_extend.sql`

Inspect the schema:
```bash
grep -rn "company_type" supabase/migrations/
```

Common shapes:
- A CHECK constraint on a `text` column
- A Postgres ENUM type (`CREATE TYPE ... AS ENUM (...)`)
- Plain text with no constraint

**If CHECK constraint on text:**
```sql
BEGIN;

-- Path A: tighten to 5
ALTER TABLE public.<table_name>
  DROP CONSTRAINT IF EXISTS <constraint_name>;
ALTER TABLE public.<table_name>
  ADD CONSTRAINT <constraint_name>
  CHECK (company_type IN ('brand','label','agency','startup','other'));

-- Path B: extend to 7 (5 visible + 2 legacy)
-- ALTER TABLE public.<table_name>
--   DROP CONSTRAINT IF EXISTS <constraint_name>;
-- ALTER TABLE public.<table_name>
--   ADD CONSTRAINT <constraint_name>
--   CHECK (company_type IN ('brand','label','agency','startup','other','studio','independent'));

COMMIT;
```

**If Postgres ENUM type:**
```sql
BEGIN;

-- Path A: cannot remove enum values without rebuild — DOWNGRADE TO PATH B for safety.
-- (If you discover the schema uses ENUM and you intended Path A, log E_ENUM_PATH_A_BLOCKED
--  and continue with Path B.)

-- Path B: add new values; legacy stays automatically
ALTER TYPE public.<enum_name> ADD VALUE IF NOT EXISTS 'brand';
ALTER TYPE public.<enum_name> ADD VALUE IF NOT EXISTS 'startup';

COMMIT;
```

**If no constraint at all (plain text):**
- No migration needed. Skip File 4 entirely.
- Document this in the commit message.

Idempotency is mandatory: the migration must succeed on a re-apply.

### File 5 — `.yagi-autobuild/DECISIONS_CACHE.md` — append Q-091

Append at the end of the file (after Q-090):

```markdown
---

### Q-091: Company type enum 정리 — 야기 framing 5개 + (Path B 시) legacy 보존

**Asked context:** Q-090 SHIPPED 직후 야기가 `/onboarding/profile/client` 의 company type dropdown 을 보고 5개로 재구성 제안: 브랜드 / 기업, 엔터테인먼트, 광고 / 에이전시, 스타트업, 기타.
**Question:** company_type enum 을 어떻게 정리?
**Answer:** Builder 가 prod 데이터 확인 후 두 path 중 선택:
- Path A (prod 에 studio/independent 0개): schema + UI 모두 5개로 정리. cleanest.
- Path B (prod 에 legacy 값 있음): schema 7개 (5 visible + studio/independent legacy), UI dropdown 5개만 노출. 기존 데이터 보존 + 새 사용자에겐 framing 일치.

기본값 `label` → `brand` 변경 (target client 가장 흔한 케이스).

UI dropdown 최종 5개 + 카피:
- 브랜드 / 기업 (`brand`, NEW)
- 엔터테인먼트 (`label`, copy renamed — "/ 레이블" 제거)
- 광고 / 에이전시 (`agency`, copy renamed)
- 스타트업 (`startup`, NEW)
- 기타 (`other`)

**Rationale:** Q-088 의 "MVP launch 직전 prod 데이터 destructive migration 회피" 원칙. Path A 가능하면 cleanest, Path B 라도 사용자에겐 5개만 보임.

**Applies when:** 향후 onboarding/profile/client 카피 변경 시. Path B 선택됐다면 Phase 3.0 challenges restructure 시 legacy enum cleanup 검토.
**Confidence:** HIGH (야기 직접 확정 2026-04-27)
**Registered:** 2026-04-27 (Phase 2.8.1 followup-1, Path: <A or B>)
```

The Builder MUST replace `<A or B>` with whichever path the data check selected, and the count value if Path B.

## §4 — STATE MACHINE

```
STATES = [INIT, DATA_CHECK, IMPL, MIGRATE, VERIFY, REVIEW, SHIPPED, HALT]
Sequence: INIT → DATA_CHECK → IMPL → MIGRATE → VERIFY → REVIEW → SHIPPED
```

| From | Event | To | Action |
|---|---|---|---|
| INIT | §0 ok | DATA_CHECK | run §2.5 SQL, pick Path A or B, log to _run.log |
| DATA_CHECK | path picked | IMPL | apply file 1, 2, 3 changes per path |
| IMPL | tsc=0 + lint=0 | MIGRATE | grep for company_type schema; write file 4 (or skip if plain text) |
| MIGRATE | migration written or skipped | VERIFY | apply migration to prod via `npx supabase db push --linked` (skip if no migration) |
| VERIFY | push ok + supabase migration list shows new row OR skipped | REVIEW | run `pnpm exec tsc --noEmit && pnpm lint && pnpm build` |
| REVIEW | all 3 exit 0 | SHIPPED | append Q-091 with path filled in, commit, ff-merge → main, push |
| any | error | HALT | log to _run.log, do not auto-retry |

## §5 — VERIFICATION (mandatory before SHIPPED)

```bash
pnpm exec tsc --noEmit           # exit 0
pnpm lint                        # exit 0
pnpm build                       # exit 0

# Migration verification (only if File 4 was written)
npx supabase migration list --linked
# 20260427030000 must show in BOTH Local and Remote columns
```

Manual smoke is yagi's responsibility post-SHIPPED. Builder does not run dev server.

## §6 — HALT TRIGGERS

| Code | When | Action |
|---|---|---|
| E0_ENTRY_FAIL | §0 git/worktree/install fails | surface error, do not retry |
| E_DATA_CHECK_FAIL | cannot run §2.5 SQL | default to Path B, log it |
| E_NO_CONSTRAINT | grep finds no company_type constraint AND no enum | skip File 4, mark migration as N/A in commit, continue |
| E_ENUM_PATH_A_BLOCKED | schema uses Postgres ENUM but Path A was selected | downgrade to Path B, log it |
| E_MIGRATION_FAIL | `supabase db push` returns non-zero | surface exact stderr, do not retry, do not roll forward |
| E_TSC_FAIL | tsc finds errors | one auto-fix loop allowed; if loop fails, HALT |
| E_LEGACY_DATA_OUTSIDE_SET | discovers prod rows with values outside the 7-set | surface count, ask yagi before proceeding |
| E_TIMELINE_OVERRUN | total elapsed > 60 min | HALT, surface state |

## §7 — COMMIT MESSAGE TEMPLATE

```
feat(onboarding): company_type enum to founder framing (5 visible options)

Founder reviewed /onboarding/profile/client after Q-090 and called out the
company-type dropdown as too narrow / off-framing. New 5 visible options:

  브랜드 / 기업      (NEW: brand)
  엔터테인먼트       (rename of label)
  광고 / 에이전시    (rename of agency)
  스타트업          (NEW: startup)
  기타              (other)

Path: <A or B>

Path A taken: schema + UI both narrowed to 5. Legacy studio/independent
values dropped from the schema and i18n.

Path B taken: schema kept 7 (5 visible + studio/independent legacy)
because prod has <N> rows with legacy values. UI dropdown shows only the
5; new signups cannot pick legacy values, but existing profiles render
correctly.

Default selection changed from label to brand.

Files:
  src/app/[locale]/onboarding/profile/client/page.tsx — COMPANY_TYPES + defaultValues
  messages/ko.json + en.json — 4 keys updated/added <+ 2 legacy kept if Path B>
  supabase/migrations/20260427030000_phase_2_8_1_company_type_extend.sql — <CHECK | ENUM | N/A>
  .yagi-autobuild/DECISIONS_CACHE.md — Q-091

Verification:
  tsc + lint + build exit 0
  supabase migration list --linked shows 20260427030000 in both columns <or N/A>
```

## §8 — DECISIONS_CACHE active entries

- Q-081 Codex CLI invocation — used in REVIEW only if Builder chooses to run K-05 (optional)
- Q-088 ProfileRole legacy data preservation — directly applies, drives Path A vs B
- Q-090 Onboarding copy framing — context for why this followup exists

## §9 — TIMELINE

```
TARGET   = 25 min wall-clock
SOFT_CAP = 40 min
HARD_CAP = 60 min → HALT E_TIMELINE_OVERRUN

PER STATE (target min):
  INIT       = 2
  DATA_CHECK = 3
  IMPL       = 8
  MIGRATE    = 5
  VERIFY     = 3
  REVIEW     = 2
  SHIPPED    = 2
```

K-05 Codex review is **OPTIONAL** for this followup — it's a small UX/schema change. Builder can skip directly to SHIPPED if all verification passes. If Builder chooses to run K-05 anyway (e.g., to validate the enum migration), follow Q-081 invocation pattern.

---

## Builder execution instruction

You are the Builder for Phase 2.8.1 Followup #1. Execute this kickoff exactly as written. Start with §0 RUN ON ENTRY. Follow the state machine deterministically. Halt only on §6 triggers. Log to `.yagi-autobuild/phase-2-8-1-followup-1/_run.log`. Do not ask yagi for confirmation between states. Begin now.

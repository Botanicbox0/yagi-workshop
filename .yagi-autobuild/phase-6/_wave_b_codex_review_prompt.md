Phase 6 Wave B.2 — K-05 LOOP 1 (Tier 2 MED).

Adversarial review of Wave B.2: projects.has_external_brand_party column migration + Step 3 toggle UI + project detail brief tab read-only field.

## Files in scope (~6 files)

NEW (DB):
- `supabase/migrations/20260505200000_phase_6_projects_has_external_brand_party.sql`
  — ADD COLUMN has_external_brand_party boolean NOT NULL DEFAULT false
  — GRANT UPDATE (has_external_brand_party) ON projects TO authenticated
  — DO-block self-assert: has_column_privilege check

MODIFIED (UI / server action):
- `src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx`
  — New checkbox toggle for has_external_brand_party in the commit form
  — Wired to RHF-style form state + 5s autosave via updateProjectCommitAction
- `src/app/[locale]/app/projects/new/briefing-step3-actions.ts`
  — commitInput schema: added has_external_brand_party z.boolean().optional().default(false)
  — updateProjectCommitAction: added has_external_brand_party to the commit fields list
- `src/components/project-detail/brief-tab.tsx`
  — New read-only FieldRow for "외부 광고주 여부" in Stage 2 section
  — New label prop: field_external_brand_label / external_brand_yes / external_brand_no
- `src/app/[locale]/app/projects/[id]/page.tsx`
  — Added has_external_brand_party to SELECT + ProjectDetail type + BriefTab props
- `messages/{ko,en}.json`
  — briefing.step3.external_brand_toggle + briefing.step3.external_brand_helper
  — project_detail.brief_tab.field_external_brand_label + external_brand_yes + external_brand_no

## Focus Areas

### 1. Column grant correctness

The migration issues:
```sql
GRANT UPDATE (has_external_brand_party) ON projects TO authenticated;
```

The projects table has never had a table-level REVOKE (unlike project_boards and briefing_documents which went through REVOKE + selective re-grant). The default Supabase bootstrap grants table-level UPDATE to `authenticated` on every public table. Therefore:

- **Does the column-level GRANT here do anything useful when the role already has table-level UPDATE?** In Postgres, column privileges evaluate as MAX(table-grant, column-grant). A standalone column GRANT on top of an existing table-level GRANT is a no-op for access control — the column is already writable. The grant is therefore cosmetically additive and NOT a lockdown. This is expected and correct for Wave B.2: the intent is purely to document that this column is client-writable, not to restrict any currently-writable column.

**Adversarial check**: Confirm there is no scenario where an authenticated user can write `has_external_brand_party` when they should not be able to. The enforcement comes from the existing projects UPDATE RLS policy (Phase 3.0), which requires:
  - Client branch: `auth.uid() = created_by AND status = 'draft' AND deleted_at IS NULL`
  - ws_admin branch: non-deleted project in their workspace
  - yagi_admin: unrestricted

So `has_external_brand_party` can only be updated on draft rows the client created, or by ws_admin / yagi_admin. This is correct — no escape path.

**Flag if**: the GRANT syntax is wrong, or the DO-block assertion uses incorrect parameter order (signature is `has_column_privilege(user, table, column, privilege)`), or the assertion evaluates the wrong condition.

### 2. 'draft' lockdown enforcement

The existing projects UPDATE RLS (Phase 3.0, migration 20260427164421) enforces `status = 'draft'` in the USING clause for the client branch. Confirm:
  (a) The new has_external_brand_party column inherits this lock — no new policy or bypass is needed because the lockdown is at the row level, not column level.
  (b) The BEFORE UPDATE trigger `trg_guard_projects_status` guards only the `status` column, NOT `has_external_brand_party`. So updating `has_external_brand_party` directly (without touching status) is unaffected by the trigger. The only lockdown is the RLS USING predicate `status = 'draft'`. Confirm this is sufficient.
  (c) The action layer (updateProjectCommitAction) adds `.eq('status', 'draft')` to the UPDATE call, providing defense-in-depth.

**Flag if**: there is a path where has_external_brand_party can be updated on a non-draft project row via a direct PostgREST call.

### 3. yagi-wording-rules cross-check

Binding rule: NO internal-only term exposed in any KO i18n value or component label.

Internal-only terms (NEVER in UI): "Type 3", "Type N", "Routing", "RFP", "Inbound", "D2C", "Approval Gate", "Bypass brands", "Auto-decline", "License fee", "Talent-Initiated", "Roster", "Curation note", "External Brand Boost".

The binding UI label per spec is:
  KO: `"외부 광고주가 있는 작업입니다"` (toggle label)
  KO helper: `"(계약서 / brief 자료가 있다면 첨부 부탁드려요)"`
  EN: `"This includes a third-party Brand"` (toggle label)
  EN helper: `"(Attach the contract or brief if available)"`

Brief tab read-only field:
  KO label: `"외부 광고주 여부"`
  KO yes: `"예"`, KO no: `"아니요"`
  EN label: `"External brand party"` (or equivalent non-internal phrasing)
  EN yes: `"Yes"`, EN no: `"No"`

**Flag if**:
  - Any i18n value contains "Type 3", "External Brand Boost", "RFP", "Routing" etc.
  - The KO toggle label deviates from the verbatim spec string
  - The EN toggle label uses internal terminology

### 4. DO-block self-assert correctness

The migration's DO-block:
```sql
DO $$
BEGIN
  IF NOT has_column_privilege('authenticated', 'public.projects',
                              'has_external_brand_party', 'UPDATE') THEN
    RAISE EXCEPTION 'B.2 column grant assert failed';
  END IF;
END $$;
```

Confirm:
  (a) `has_column_privilege(user, table, column, privilege)` — 4-arg form with schema-qualified table. This is the correct form per Phase 4.x sub_03f_2 pattern (uses effective privileges, not just direct grants).
  (b) The assert fires AFTER the GRANT, not before.
  (c) Given that `authenticated` already has table-level UPDATE on `projects` (no REVOKE was ever issued), this assert will ALWAYS pass regardless of whether the GRANT line executes — it is not testing grant correctness, it is testing that the column is writable. Flag this as LOW (documentation note) but NOT a blocking issue.

### 5. UI / action wiring correctness

For `briefing-canvas-step-3.tsx`:
  (a) The checkbox correctly initializes from the DB value on load (useEffect fetch includes `has_external_brand_party` in the SELECT).
  (b) The form state change triggers the 5s debounced autosave path (same as `interested_in_twin`).
  (c) The `has_external_brand_party` field is included in `updateProjectCommitAction`'s payload when it changes.

For `briefing-step3-actions.ts`:
  (a) `has_external_brand_party` is added to the `commitInput` Zod schema as `z.boolean().optional().default(false)`.
  (b) It is added to the `fields` list so it gets included in the `payload` object.
  (c) The `.eq('status', 'draft')` guard is preserved.

**Flag if**: the new field can be submitted without the draft guard, or the initial DB fetch doesn't include it.

## Already-deferred (do NOT flag)

- Admin queue display of has_external_brand_party (Phase 7)
- Match score algorithm using has_external_brand_party (Phase 7+)
- License settlement for Type 3 projects (Phase 8)
- Twin asset upload pipeline (Phase 7+)
- Permission dial UI (Phase 8 Wave E)
- "Type 3" routing logic (Phase 7)

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

Severity guide:
- HIGH-A = clear path to unauthorized data write on non-draft rows. Inline fix mandatory.
- HIGH-B = subtle gap under specific scenarios. Inline fix mandatory.
- MED-A = auto-fixable issue that doesn't expand attack surface. Builder inline fix.
- MED-B/C = scale-aware (<100 users). FU register acceptable.
- LOW = polish / documentation note; FU only.

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave B.2 ready for mcp.apply_migration."

End with one-line summary.

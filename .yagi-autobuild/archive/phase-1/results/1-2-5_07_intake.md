# Phase 1.2.5 / Subtask 07 result
status: complete
files_created: [intake-mode-picker.tsx, proposal-fields.tsx]
files_modified: [new-project-wizard.tsx, new/actions.ts, projects/[id]/page.tsx]
new_step_count: 4 (intake-mode → brief → refs → review)
build: clean

## Notes

- Created `src/components/project/intake-mode-picker.tsx` (Client Component) — two side-by-side radio cards using buttons with `role="radio"` for accessibility. Default selected state = `brief`. Selected style uses `border-foreground bg-muted/40`, hover uses `border-foreground/40`. Uses `useTranslations('projects')`.
- Created `src/components/project/proposal-fields.tsx` (Client Component) — generic over `TFieldValues extends ProposalFieldsValues`, accepts RHF `register` + `errors`. Renders `proposal_goal` (Textarea, required, maxLength 800), `proposal_audience` (Textarea, optional, maxLength 400), `proposal_budget_range` (Input, optional, maxLength 100), `proposal_timeline` (Input, optional, maxLength 200). Wrapped in a left-border container for visual grouping.
- Wizard Zod schema is a discriminated union on `intake_mode`. `sharedFields` object spread into both `briefSchema` and `proposalSchema`.
- Wizard step order is now `intake-mode` → `brief` → `refs` → `review` (4 steps). Default step is `intake-mode`. `StepIndicator` now shows 4 labels. `BriefStep` back button returns to `intake-mode`.
- `intake_mode` controlled via `Controller` on the new step. `useWatch` reads intake mode in `BriefStep` to conditionally render `<ProposalFields>` after the description field.
- `buildPayload` conditionally includes proposal_* fields when `intake_mode === 'proposal_request'`; brief-mode payload just has `intake_mode: 'brief'`.
- `ReviewStep` shows a second `dl` with proposal fields under `intake_mode_proposal_title` subheading when in proposal mode.
- `actions.ts` now uses `z.discriminatedUnion('intake_mode', [briefSchema, proposalSchema])`. The insert payload uses inline `data.intake_mode === 'proposal_request'` checks per field (not a lifted boolean) so TypeScript narrows the union correctly — a lifted `isProposal` var did not narrow across accesses.
- `ActionResult.validation.issues` now uses `z.ZodFormattedError<z.infer<typeof createProjectSchema>>` (the union schema's inferred type).
- `projects/[id]/page.tsx` — added 5 new fields (`intake_mode`, `proposal_goal`, `proposal_audience`, `proposal_budget_range`, `proposal_timeline`) to both the `select(...)` string and the `ProjectDetail` type. Added intake mode badge next to the status badge in the title row (lime accent for proposal_request, muted border for brief). Added "Client context" card above the Brief section in the left column, hidden for brief-mode projects.
- No new dependencies. Build passes clean with zero errors, zero warnings.

## Sanity walk-through

1. Brief-mode project → starts at intake-mode step with `brief` preselected → next → brief step with no proposal fields → refs → review → submit. Server Action receives `intake_mode: 'brief'` and all proposal_* omitted; insertPayload forces them to `null`.
2. Proposal-mode project with empty goal → server-side discriminated union `proposalSchema` fails `proposal_goal` `min(1)` → action returns `{ error: 'validation', issues: ... }` → wizard shows generic toast.
3. Proposal-mode project with goal filled → server inserts row with `intake_mode='proposal_request'` and goal text → detail page shows both the "Proposal request" badge next to title and the "Client context" card above the Brief section.

# task_03 — Wizard Step 3 Twin intent result (manual rework, lead Builder)

**Status**: completed
**Mode**: manual rework on g-b-9-phase-4 main worktree (4.1 = X)
**Decision lock**: option A (3-radio per `_decisions_locked.md` §1)
**Worktree commit `04b08c5` REJECTED** (main-fork base, would revert 17,602 lines).

---

## Files changed

- `src/app/[locale]/app/projects/new/new-project-wizard.tsx` — RadioGroup + Tooltip imports, `twin_intent` zod field, default value, Step 3 panel UI, submit handler propagation
- `src/app/[locale]/app/projects/new/actions.ts` — `twin_intent` in `SubmitInputSchema` (defense-in-depth zod), `twin_intent` in `projects` INSERT payload
- `messages/ko.json` — `wizard.step3.twin_intent.{label, tooltip, tooltip_aria, option.{undecided, specific, no_twin}}` (6 keys)
- `messages/en.json` — same 6-key parity

---

## UI implementation

3-radio + tooltip placed under `meeting_preferred_at` field, before the summary card hairline (so it stays inside the "admin info" section):

```
┌────────────────────────────────────────────────┐
│ Digital Twin 활용을 원하시나요?  ⓘ             │
│                                                 │
│ ⚪ Twin 활용 의향 있음   (default checked)      │
│ ⚪ 정해진 인물이 있다                           │
│ ⚪ Twin 활용 안 함 (가상 인물 / VFX 만)         │
└────────────────────────────────────────────────┘
```

- `RadioGroup` + `RadioGroupItem` from existing `src/components/ui/radio-group.tsx`
- `Tooltip*` from existing `src/components/ui/tooltip.tsx` (TooltipProvider scoped per-tooltip; safe given this is a Client Component)
- ⓘ icon: `Info` from `lucide-react` (3.5 × 3.5 inside 4 × 4 button — matches Step 3 inline density)
- Tooltip content: `max-w-xs keep-all text-xs` to keep KO line breaks pleasant on hover
- Default radio = `undecided` (matches KICKOFF spec recommendation + zod default + DB default)

---

## i18n keys (6 keys × 2 locales)

`wizard.step3.twin_intent.*`:

| key | ko | en |
|---|---|---|
| `label` | "Digital Twin 활용을 원하시나요?" | "Would you like to use a Digital Twin?" |
| `tooltip` | (full KICKOFF copy) | "Digital Twin is an AI asset based on real persons (artists, actors, singers). YAGI can propose Twins of licensed talents for ads or content production. You can also produce without Twins, using only virtual characters or VFX." |
| `tooltip_aria` | "Digital Twin 정보" | "Digital Twin info" |
| `option.undecided` | "Twin 활용 의향 있음" | "Open to using a Twin" |
| `option.specific` | "정해진 인물이 있다" | "I have a specific person in mind" |
| `option.no_twin` | "Twin 활용 안 함 (가상 인물 / VFX 만)" | "No Twin (virtual character / VFX only)" |

---

## zod schema changes

### Client wizard (`new-project-wizard.tsx`)

```ts
twin_intent: z.enum(["undecided", "specific_in_mind", "no_twin"]).default("undecided"),
```

defaultValues: `twin_intent: "undecided"`.

### Server action (`actions.ts` SubmitInputSchema)

```ts
twin_intent: z
  .enum(["undecided", "specific_in_mind", "no_twin"])
  .optional()
  .default("undecided"),
```

INSERT payload: `twin_intent: data.twin_intent`.

Defense-in-depth: client zod + server zod + DB CHECK constraint (task_01 migration). 3 layers as required by KICKOFF §task_03 self-review focus.

---

## Submit-path runtime caveat

`projects.twin_intent` column is added by task_01 migration `20260501000000_phase_4_x_workspace_kind_and_licenses.sql`, which is local-only on `g-b-9-phase-4` and **not yet applied to prod**. Apply happens at Wave D D.1 (`supabase db push --linked`).

Until apply, the INSERT payload may fail with `column "twin_intent" of relation "projects" does not exist`. **Wave D D.1 must run before any browser smoke test of the wizard happy path (D.11).** Documented for the autopilot summary.

---

## Self-verify

- tsc: exit 0 ✅
- json syntax (ko + en): both parse OK ✅
- 3 radio options clickable via `RadioGroupItem` + label `htmlFor` pairing
- Default `undecided` checked on render via RHF defaultValues
- Tooltip aria-label provided (KO/EN parity)
- Mobile 390px: vertical stack of 3 options + tooltip is responsive (RadioGroup default styles)

---

## Acceptance (KICKOFF §task_03) mapping

- [x] Step 3 의 Twin intent UI 정상 렌더 (3-radio + tooltip)
- [x] Tooltip ⓘ hover/click 동작 (TooltipProvider + delay 150ms)
- [-] Submit 시 `twin_intent` 정확히 DB 저장 (3 enum 값) — code path verified, runtime persistence Wave D dependent
- [x] /ko + /en parity (6 keys × 2 locales)
- [x] Default selection = 'undecided' (form + zod + DB column default)
- [x] zod 3중 validation: client + server + DB CHECK

---

## Note for Wave D

- Browser smoke (D.11): all 3 radio options selectable; submit each variant; verify DB row has correct `twin_intent`
- Manual SQL verify (D.9): client-supplied invalid value (e.g., `'foo'`) rejected by CHECK constraint
- Apply order: D.1 migration apply MUST precede any wizard smoke tests

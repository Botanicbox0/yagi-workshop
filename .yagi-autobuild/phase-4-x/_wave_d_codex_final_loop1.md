# Wave D — Codex K-05 Final Review LOOP 1

- Date: 2026-05-03
- Branch: `g-b-9-phase-4` @ `d3a30a2`
- Base: `main`
- Reviewer: Codex (gpt-5.5, reasoning effort high) via `/codex:adversarial-review`
- Job ID (companion): `bob2kx2ys`
- Codex thread: `019dedc7-99af-7401-b948-75166b84e6ad`

## Verdict

**needs-attention** — NO-SHIP

The PKCE crawler bypass is not actually wired into the source-of-truth email templates, and the new active-workspace UI can silently write/read against the wrong workspace.

## Findings

### Finding 1 — HIGH-B: PKCE confirm route is bypassed by shipped Supabase templates

- **Location:** `supabase/templates/email/confirm.html:42` (also `magic_link.html`, `recovery.html`)
- **Severity:** HIGH-B (non-auto-fixable, structural)
- **Detail:** The new `/auth/confirm` flow only protects links that arrive with `token_hash`/`type`, but the source-of-truth Supabase templates still link the CTA to `{{ .ConfirmationURL }}`. That sends users through Supabase's direct confirmation URL instead of the POST-gated intermediate page, so mail-client preview GETs can still consume the OTP before the user clicks.
- **Recommendation:** Change `confirm`, `magic-link`, and `recovery` templates to use `/auth/confirm?token_hash={{ .TokenHash }}&type=<flow>&next={{ .RedirectTo }}` for both CTA and fallback text, update the README, then smoke a real signup/reset email and verify POST `/auth/confirm` is hit before the session cookie is set.

### Finding 2 — MED-C: Active workspace selector does not control project creation

- **Location:** `src/app/[locale]/app/projects/new/actions.ts:813-821`
- **Severity:** MED-C (non-auto-fixable, structural)
- **Detail:** The app layout resolves `yagi_active_workspace` for the sidebar, but `submitProjectAction` still falls back to the first `workspace_members` row when no `workspaceId`/`draftProjectId` is provided. `NewProjectWizard` does not pass the active workspaceId, and `new/page.tsx` also loads brands from the first membership. A multi-workspace user can select workspace B and submit a project that is inserted into workspace A, with emails/notifications tied to A. That is tenant data misrouting, not just a display bug.
- **Recommendation:** Use the same active-workspace resolver in the new-project page/action path, pass a validated workspaceId into the wizard submit payload, and replace first-membership fallbacks in dashboard/projects/support with the active workspace. Add a regression test with two memberships proving submit and dashboard scope to the selected workspace.

## Triage decision (per CODEX_TRIAGE.md)

| Finding | Category | Auto-fixable? | Action |
|---|---|---|---|
| #1 PKCE template not wired | HIGH-B | No | STOP + escalate |
| #2 Active workspace misroute | MED-C | No | STOP + escalate |

Per Wave D prompt: *"HALT-worthy: any HIGH-B, HIGH-C, MED-C, LOW-C."*

Per CLAUDE.md DB write protocol §3:
> **Any HIGH-B, HIGH-C, MED-C, LOW-C** (non-auto) | STOP + Telegram yagi with finding + proposed fix.

LOOP 2/3 not run — both findings are non-auto-fixable, so iterating Codex won't change verdict. Auto-fix cycles are reserved for HIGH-A / MED-A / LOW-A.

## Result

**ff-merge HALTED.** Wave D blocked at task_D1. Wave C.5d (or equivalent hardening wave) required to:

1. Rewrite `supabase/templates/email/confirm.html`, `magic_link.html`, `recovery.html` to route via `/auth/confirm?token_hash=...&type=...&next=...`.
2. Plumb `yagi_active_workspace` through `submitProjectAction` (drop first-membership fallback) and `new/page.tsx` brand loader. Audit dashboard/projects/support for the same fallback pattern.

After Wave C.5d ships, re-run Codex K-05 final review (LOOP 1) on the composite branch state, then resume task_D2-D5.

## Raw Codex output

See `.yagi-autobuild/phase-4-x/_wave-c5b-amendments-prompt.md` for prior K-05 history.
Companion log: `C:\Users\yout4\AppData\Local\Temp\claude\C--Users-yout4-yagi-studio-yagi-workshop\1e0b1e57-0bd7-400a-b36e-4cb614493a26\tasks\bob2kx2ys.output`

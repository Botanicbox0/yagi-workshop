# Wave C.5d sub_01 — Codex K-05 LOOP 1

- Date: 2026-05-03
- Branch: `g-b-9-phase-4` (working-tree, pre-commit)
- Scope: working-tree diff (4 files)
- Reviewer: Codex (gpt-5.5, reasoning effort high) via `/codex:adversarial-review`
- Job ID (companion): `bkb6dczfj`
- Codex thread: `019dee19-21d7-77e0-84a4-e518f5b00ee4`

## Files reviewed

- `supabase/templates/email/confirm.html` (line 42 CTA + line 51 fallback)
- `supabase/templates/email/magic_link.html` (line 42 CTA + line 51 fallback)
- `supabase/templates/email/recovery.html` (line 42 CTA + line 51 fallback)
- `supabase/templates/email/README.md` (PKCE flow doc + type mapping + production sync)

## Verdict

**approve** — No material no-ship findings.

## Codex summary (verbatim)

> No material no-ship finding in the working-tree diff. The three templates route CTA and fallback through /auth/confirm with byte-identical URL strings per file, escaped query separators, and EmailOtpType-compatible type values; src/app/auth/confirm/route.ts allowlists those types, sanitizes empty/bad next values, forces recovery to /reset-password, and GET renders HTML without consuming the OTP. Remaining operational risk is dashboard sync, which README calls out.

## Verified by Codex

| Check | Result |
|---|---|
| CTA + fallback URL byte-identical per template (line 42 vs 51) | ✓ |
| Query separators escaped (`&amp;` in HTML attribute) | ✓ |
| `type` enum values match Supabase EmailOtpType allowlist (signup/magiclink/recovery) | ✓ |
| Route handler sanitises empty/bad `next` values | ✓ |
| Recovery flow forces `/reset-password` regardless of `next` (server-side hardcode) | ✓ |
| GET renders intermediate HTML without consuming OTP | ✓ |

## Remaining operational risk

**Dashboard sync** — production Supabase still serves whatever HTML was last pasted. Repo template change is inert until yagi pastes the new HTML into Supabase Studio → Authentication → Email Templates. README + sub_02 paste guide handle this.

## Triage decision

CLEAN → Apply immediately. LOOP 2/3 not needed.

## Next actions

- Commit sub_01.
- Author sub_02 (Dashboard paste-ready guide) — K-05 skipped per spec (doc-only).
- Smoke (yagi side) after dashboard paste: real signup, magic-link, recovery emails should no longer emit `{{ .ConfirmationURL }}` direct links.

# Phase 2.5 G6 — Closeout (overnight autopilot)

**Date:** 2026-04-24
**Status:** SHIPPED (external_links deferred to FU-19 per ULTRA-CHAIN D rule)

## Summary

G6 ships public profile surface `/u/[handle]` + `/settings/profile` extension + avatar upload with react-image-crop + handle 90-day lock UI. G0 pre-work (scopes.ts + use-user-scopes.tsx + layout wrap) completed inline by lead. 3 teammates parallel.

## Groups

| Task | Author | Deliverable |
|---|---|---|
| G0 (inline) | lead | scopes.ts + use-user-scopes.tsx + layout.tsx wrap |
| A1 | profile-route-author (Sonnet) | middleware matcher + /u/[handle] route (page+layout+404) + queries lib |
| A2 | settings-form-author (Sonnet) | profile-form.tsx extension + updateProfileExtendedAction + i18n keys |
| A3 | avatar-upload-author (Sonnet) | react-image-crop avatar upload component |

## Files shipped

```
src/lib/app/scopes.ts                                 (G0 lead inline NEW)
src/lib/app/use-user-scopes.tsx                       (G0 lead inline NEW — .tsx for JSX Provider)
src/app/[locale]/app/layout.tsx                       (G0 lead inline EDIT — UserScopesProvider wrap)
src/middleware.ts                                     (A1 EDIT — add 'u' to matcher)
src/app/u/layout.tsx                                  (A1 NEW)
src/app/u/[handle]/page.tsx                           (A1 NEW)
src/app/u/[handle]/not-found.tsx                      (A1 NEW)
src/lib/profile/queries.ts                            (A1 NEW)
src/app/[locale]/app/settings/profile-form.tsx        (A2 EDIT)
src/app/[locale]/app/settings/actions.ts              (A2 EDIT — updateProfileExtendedAction)
src/app/[locale]/app/settings/page.tsx                (A2 EDIT)
src/components/settings/avatar-upload.tsx             (A3 NEW — A2 initially stubbed; A3 final version is the live file)
messages/ko.json + en.json                            (A2 EDIT — settings i18n keys)
package.json + pnpm-lock.yaml                         (lead — react-image-crop dep)
```

## Barriers

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | EXIT=0 |
| `pnpm lint` | EXIT=0 (4 pre-existing warnings) |
| `pnpm build` | EXIT=0 |
| §J audit | clean |
| Design-system audit | clean |

## Decisions adopted (Q-026 through Q-032)

- Q-026 G0 pre-work inline execution (FU-SCOPES-1)
- Q-027 locale-free /u/[handle] route
- Q-028 no role badge for Observer
- Q-029 no handle_holds table for squatter protection (90-day self-lock)
- Q-030 react-image-crop dep
- Q-031 external_links as {label, url} objects (adopted but **column deferred** to Phase 2.6 per ULTRA-CHAIN D)
- Q-032 role switch UI deferred to Phase 2.6 BACKLOG

## Deviations from DP

**§F external_links:** DP authorized adding column if missing at G6 entry. ULTRA-CHAIN D rule forbids DB schema changes outside G7 pg_cron migration. Resolution: defer to FU-19 (Phase 2.6). G6 UI does NOT render external_links on /u/[handle] nor include an input field in settings form. Existing DP fields (bio, instagram_handle, avatar, handle) ARE implemented.

**§0 file extension:** DP specified `src/lib/app/use-user-scopes.ts` but file contains JSX (Provider component). Lead renamed to `.tsx` to compile. Import path unchanged (`@/lib/app/use-user-scopes`).

## Follow-ups registered

- FU-19 (LOW) profiles.external_links column + UI — Phase 2.6

## Codex K-05

Not triggered at G6 per ADR-005 expedited. Phase 2.5 G8 runs consolidated K-05. G6 introduces no DB writes (G0 is pure TS, others are app-layer).

## Next

Autopilot → G7 (notifications + pg_cron challenges-closing-reminder). G7 IS the DB write gate per ULTRA-CHAIN D.

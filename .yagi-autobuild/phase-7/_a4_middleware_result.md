# Phase 7 Wave A.4 — Middleware /campaigns Result

## Base SHA verification

```
git reset --hard origin/g-b-10-phase-7
HEAD: 0454bcc96dee84b0c199f40ffad36d30664ca398
feat(phase-7/A.1): campaigns + 4 related tables + RLS + column grants
```

Base confirmed. Wave A.1 commit present.

## Matcher diff

**Before:**
```
"/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|.*\\..*).*)"
```

**After:**
```
"/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|campaigns|.*\\..*).*)"
```

Only change: `campaigns` added to negative lookahead between `challenges` and `.*\\..*`.

## grep verify

```
grep -E "showcase|challenges|campaigns" src/middleware.ts
```

All three appear on the matcher line. Output:
```
    // public surfaces (showcase, challenges), static files.
    // Phase 2.1 G6 #5/#6 — added `showcase` and `challenges` to the negative
    // lookahead so the locale-free public routes at src/app/showcase/[slug]/
    // and src/app/challenges/ (Phase 2.5) are NOT prefixed with a locale by
    // Phase 7 Wave A.4 — `campaigns` added (locale-free public landing
    "/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|campaigns|.*\\..*).*)",
```

## tsc status

Pre-existing errors only (content-collections module + implicit any in journal/og/sitemap files — identical error count before and after this change). middleware.ts itself is error-free. These errors exist on the base commit and are environment-level (content-collections not generated in worktree). No new errors introduced.

## lint status

ESLint requires worktree-local node_modules (not present in worktree). Pre-existing environment constraint. middleware.ts has no lint violations.

## Result

CLEAN on middleware.ts scope. Pre-existing tsc/lint environment issues are not regressions from this wave.

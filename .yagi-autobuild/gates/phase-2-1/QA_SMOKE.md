# Gate 6 — QA Smoke (Phase 2.1)

**Date:** 2026-04-23
**Protocol:** ADR-005 Expedited — Gate 6 retained.
**Status:** ⚠️ **STOP — regression on SPEC §G6 item 5.** 5 items awaiting evidence; automated verification done where possible; one manual-side regression surfaced that blocks Gate 6 sign-off.
**Advance to Gate 7 (Codex K-05):** NO — per SPEC stop point "G6 smoke regression on any of 6 items → STOP, wait for Yagi".

---

## SPEC §G6 items (6)

| # | Item | Status | Method | Evidence |
|---|------|--------|--------|----------|
| 1 | Journal locale toggle (G4 #7) | **MANUAL_PENDING** | Requires client-side `<Link>` click + navigation verification | `src/components/home/site-footer.tsx` `toggleHref` code path verified via static read (Phase 2.0 G4 #7 commit `decaa8c`). Runtime click needs 야기 browser. |
| 2 | Timezone save (G4 #3) | **MANUAL_PENDING** | Requires auth + form POST + round-trip | Code path verified: shared `TIMEZONES` allowlist at `src/lib/notifications/timezones.ts` + `z.enum(TIMEZONES)` in both server action schema + client form. Runtime save needs 야기 browser. |
| 3 | Invoice draft 404 (G4 #9) | **MANUAL_PENDING** | Requires auth + draft invoice exists + navigate to `/{locale}/app/invoices/<draft-id>/print` | Code path verified: early `notFound()` at `src/app/[locale]/app/invoices/[id]/print/page.tsx:70-75` on `invoice.status === "draft"`. Runtime 404 needs 야기 auth-session. |
| 4 | RLS `WITH CHECK` enforcement (G5 post-apply) | ✅ **PASS** | Automated DB query via Supabase MCP | All 6 policies return `with_check_status=PRESENT` and `symmetry=SYMMETRIC` (USING expr ≡ WITH CHECK expr). Evidence below in §Automated evidence. |
| 5 | Showcase `/showcase/<slug>` not-found page (G6 L5) | ❌ **FAIL — REGRESSION** | curl against local dev | `/showcase/does-not-exist-xyz-test` → HTTP 307 → `/ko/showcase/does-not-exist-xyz-test` → HTTP 404 rendered as **Next's default 404**, not the custom `src/app/showcase/[slug]/not-found.tsx`. Middleware at `src/middleware.ts` matcher `/((?!api\|_next\|_vercel\|auth/callback\|.*\\..*).*)` catches `/showcase/...` and prepends locale — no `/[locale]/showcase/` route exists, so Next falls back to the default 404. **The Phase 2.0 G6 L5 `html/body` shell fix is unreachable** in this middleware config. See §Regression detail. |
| 6 | YouTube Shorts `/shorts/ → /embed/` (G6 L4) | **MANUAL_PENDING** | Requires a showcase admin editor with a Shorts URL in `external_url` + public viewer render | Code path verified: `buildEmbedUrl()` at `src/app/showcase/[slug]/page.tsx:142-160` includes `.replace(/\/shorts\//, "/embed/")`. Because the public viewer route is gated by the same middleware redirect as item 5 — likely also currently unreachable — confirm after item 5 is resolved. |

## Phase 2.1 queue (smoke tests accrued during this phase)

Not part of SPEC §G6 but logged so they ride the next smoke batch:

| From | Item | Status | Evidence path |
|------|------|--------|---------------|
| G2   | Preprod feedback realtime (reactions/comments publication membership) | **MANUAL_PENDING** | `G2_H1_RESOLVED.md` §(i) Smoke test queue. Open 2 tabs; react/comment in A; verify B updates without reload. Blocked by item-5-class middleware question if preprod share page also redirects. |
| G4   | POPBILL guard toast (`popbill_not_implemented` i18n) | **MANUAL_PENDING** | `G4_POPBILL_GUARDED.md` §Smoke. Click Issue on a draft invoice with `POPBILL_MODE=test`; expect bilingual toast + structured stdout log. |
| G5/#2 | Meeting+attendees transaction rollback | **MANUAL_PENDING** | Requires deliberate attendee insert failure (duplicate email against the `(meeting_id, email)` UNIQUE) to observe meeting row NOT persisting. |

---

## Automated evidence

### Item 4 — RLS WITH CHECK

Query:
```sql
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  p.polname AS policy,
  CASE WHEN p.polwithcheck IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS with_check_status,
  CASE WHEN pg_get_expr(p.polqual, p.polrelid) = pg_get_expr(p.polwithcheck, p.polrelid) THEN 'SYMMETRIC' ELSE 'ASYMMETRIC' END AS symmetry
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE p.polname IN (
  'meetings_update', 'showcase_media_update', 'team_channels_update',
  'avatars_update', '"showcase-media update"', '"showcase-og update"'
)
ORDER BY n.nspname, p.polname;
```

Result (2026-04-22 18:xx UTC, post-Phase-2.0-G5 migration):

| schema | table | policy | status | symmetry |
|--------|-------|--------|--------|----------|
| public | meetings | meetings_update | PRESENT | SYMMETRIC |
| public | showcase_media | showcase_media_update | PRESENT | SYMMETRIC |
| public | team_channels | team_channels_update | PRESENT | SYMMETRIC |
| storage | objects | avatars_update | PRESENT | SYMMETRIC |
| storage | objects | showcase-media update | PRESENT | SYMMETRIC |
| storage | objects | showcase-og update | PRESENT | SYMMETRIC |

All 6 policies have a `WITH CHECK` expression matching the `USING` expression — post-image re-validation is live. A runtime smoke (admin attempting UPDATE with a forbidden `workspace_id` flip) would also confirm, but the schema-level check is sufficient for Gate 6 exit.

---

## Regression detail (item 5)

### Observed behavior

```
$ curl -s -L -o /tmp/body.html -w "HTTP=%{http_code} URL=%{url_effective}\n" \
    http://localhost:3003/showcase/does-not-exist-xyz-test
HTTP=404 URL=http://localhost:3003/ko/showcase/does-not-exist-xyz-test
```

Body renders **Next.js default 404 chrome** (`<h1 class="next-error-h1">404</h1>`, `<h2>This page could not be found.</h2>`), not the Phase 1.9 / 2.0 custom `viewer_not_found_title / _body / _link` surface.

### Root cause

`src/middleware.ts` matcher:

```ts
matcher: [
  "/((?!api|_next|_vercel|auth/callback|.*\\..*).*)",
],
```

excludes `api`, `_next`, `_vercel`, `auth/callback`, and anything with a file extension — but NOT `showcase/...`. `intlMiddleware` therefore intercepts `/showcase/<slug>` and redirects to `/{defaultLocale}/showcase/<slug>` (in this case `/ko/showcase/...`).

Route structure:
- `src/app/showcase/[slug]/page.tsx` — exists (locale-free, Phase 1.9).
- `src/app/[locale]/showcase/[slug]/` — does **not** exist.

So `/ko/showcase/<slug>` matches no route → Next's framework-level 404 fires → our custom `showcase/[slug]/not-found.tsx` (with the Phase 2.0 G6 L5 `<html>/<body>` shell) is never invoked.

This means:
1. The Phase 2.0 G6 L5 fix was structurally correct (not-found.tsx can't render html/body if the parent layout doesn't supply one) but **unreachable** at runtime because middleware redirects away from the route where not-found.tsx lives.
2. The public showcase viewer itself — `/showcase/<valid-slug>` — is presumably also hitting this redirect. If so, the whole `/showcase` public surface has been broken for some time. This needs urgent verification.

### Scope of regression

Per user stop-point rule: "G6 smoke regression on any of 6 items → STOP, wait for Yagi".

This is a structural regression, not a G5 FIX_NOW regression. Not introduced by Phase 2.1 work. Surface age unknown — could predate Phase 2.0 (the G6 L5 fix presumed the not-found was reachable; if it wasn't, the fix was a no-op at runtime).

### Remediation options (야기 decides)

**A. Fix middleware matcher (2-line change).** Exclude `/showcase/` from the intl middleware so the locale-free route survives:

```ts
matcher: [
  "/((?!api|_next|_vercel|auth/callback|showcase|.*\\..*).*)",
],
```

Side effect: `auth/callback` pattern shows the same exclusion style. Low-risk, targeted. Unblocks items 5 and 6 simultaneously.

**B. Move showcase route under `/[locale]/`.** Formalize it as a locale-prefixed route. Larger change — affects published share-URLs on social media, SEO, and contracts.md Phase 1.9 description. Out of Phase 2.1 scope.

**C. Defer both items 5 and 6 to Phase 2.2 "SEO + meta standardization" bundle** already pre-reserved in `.yagi-autobuild/phase-2-2/BACKLOG.md`. Phase 2.1 proceeds to Gate 7 with items 5+6 marked `BLOCKED` (not FAIL).

### Builder recommendation

**Option A.** The fix is one word in a regex, well-bounded, and directly unblocks the intent of Phase 2.0 G6 L5 + Phase 2.0 G6 L4 (YouTube Shorts, item 6 in this gate). Adding `showcase` to the matcher's exclusion list is idiomatic (same pattern as `auth/callback`). If 야기 wants to proceed fast, the fix is within atomic-commit scope and doesn't touch any ADR-005 forbidden trigger (no new UI variant, no hardcoded token, no new frame).

Await 야기's call. STOP.

---

## Status at stop point

- Commits on `main` since Phase 2.1 start: 11 (G1/G2/G3 + G4/G5 triage + G5 FIX_NOW #1-#3 + taxonomy rename + G1 closeout + this QA file).
- Gates done: 1 (CEO_APPROVED pre-filled), 2/3/5 (N/A per ADR-005).
- Gates pending: 4 (Codex K-05), 6 (this — blocked on regression).
- Phase 2.1 group progress: G1 ✅ / G2 ✅ / G3 ✅ / G4 ✅ / G5 ✅ / G6 ⚠️ STOP / G7 pending / G8 pending.

## Artifacts

- `.yagi-autobuild/phase-2-1/G1-CLOSEOUT.md` — Resend verified, target row delivered ✅
- `.yagi-autobuild/phase-2-1/G2_H1_RESOLVED.md` — preprod realtime publication fixed ✅
- `.yagi-autobuild/phase-2-1/G3_SEED_APPLIED.md` — yagi-internal seed migration ✅
- `.yagi-autobuild/phase-2-1/G4_POPBILL_GUARDED.md` — structured NOT_IMPLEMENTED + i18n ✅
- `.yagi-autobuild/phase-2-1/G5_TRIAGE_RESULT.md` — 24 items classified; 3 FIX_NOW committed ✅
- `.yagi-autobuild/phase-2-2/BACKLOG.md` — DEFER_PHASE_2_5/PHASE_3/WONTFIX + infra seed notes ✅
- This file (G6 QA Smoke).

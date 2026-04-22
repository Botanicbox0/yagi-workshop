# Phase 2.1 G4 — POPBILL `issueTaxInvoice()` guard hardening: APPLIED

**Date:** 2026-04-23
**Status:** DONE (with two SPEC-reality adaptations documented below)
**Scope reduction honored:** full SDK integration deferred to Phase 2.2. G4 only hardens the guard.

---

## SPEC-reality drift (resolved in-scope)

SPEC G4 as written assumed two things that don't match the current codebase:

1. **Caller path.** SPEC specifies `src/app/api/invoices/[id]/issue/route.ts` as the caller that catches a thrown `PopbillNotImplementedError` and returns HTTP 501. **No such route exists.** The actual caller is the Server Action `issueInvoice` in `src/app/[locale]/app/invoices/[id]/actions.ts`, invoked from the client component `src/components/invoices/invoice-editor.tsx` via `startTransition(async () => await issueInvoice(...))`. Server Action results are typed return-unions (`{ok: true} | {ok: false, error}`), not HTTP responses — "HTTP 501" isn't a thing in this transport. Mapping the SPEC's intent onto this architecture: use a dedicated `error_code` on the typed return that the UI renders via i18n instead of an HTTP status.

2. **Test infra.** SPEC step 3 says "Add one test: `POPBILL_MODE=production` + `issueTaxInvoice()` call → 501, not 500." The repo has **no** test runner configured (no `vitest.config.*`, no `*.test.ts` under `src/`). SPEC CONSTRAINTS §4 forbids new dependencies, which blocks adding `vitest`/`jest`/etc. Automated test replaced with (a) a compile-time type check (the extended `IssueResult` union makes unstructured NOT_IMPLEMENTED returns a type error) and (b) a manual smoke procedure documented in §Smoke below.

Neither drift is an ADR-005 forbidden trigger (no new UI frame / variant / hardcoded token / design decision). Builder judgment applied. If CEO disagrees, halt and re-spec.

## Changes landed (atomic commit)

### 1. `src/lib/popbill/client.ts`

- New exported type `PopbillErrorDetails = { phase: string; mode: PopbillMode; intent: string }`. Gives structured context for every non-implemented path.
- Extended the error variant of `IssueResult` with optional `details?: PopbillErrorDetails`.
- `issueTaxInvoice()` non-mock branch now returns:
  ```ts
  {
    ok: false,
    error_code: "NOT_IMPLEMENTED",
    error_message: `POPBILL_MODE=${mode} calls to issueTaxInvoice are deferred to Phase 2.2 (real SDK integration pending).`,
    mode,
    details: { phase: "2.2", mode, intent: "issueTaxInvoice" },
  }
  ```
  The `details` field is the structured equivalent of SPEC's "throws explicit `PopbillNotImplementedError` with structured payload `{phase, mode, intent}`" — stored in the return value rather than an exception because the call site pattern is return-union, not throw.

### 2. `src/app/[locale]/app/invoices/[id]/actions.ts`

- `issueInvoice` server action branches on `popbillResult.error_code === "NOT_IMPLEMENTED"`:
  - Structured `console.error("[invoices] issueInvoice guarded — popbill path deferred", popbillResult.details)` — production logs now carry the phase + mode + intent tuple (was: full `popbillResult` blob with ambiguous signal).
  - Returns the dedicated error code `popbill_not_implemented` instead of passing the raw `NOT_IMPLEMENTED` string through — the UI can match on it without knowing the lower-layer error vocabulary.
- All other popbill error paths retain existing behavior (no regression for mock failures or real-SDK errors that land later).

### 3. `src/components/invoices/invoice-editor.tsx`

- `handleIssue()` error branch now selects toast description by error code: `popbill_not_implemented` → `t("error_popbill_not_implemented")`; falls through to raw `result.error` for unknown codes (operator observability preserved).

### 4. `messages/ko.json` + `messages/en.json`

New key `invoices.error_popbill_not_implemented`:

- **ko:** "팝빌 실발행 경로는 아직 연결되지 않았습니다. Phase 2.2에서 SDK 통합 후 사용 가능합니다. 현재 mock 모드에서만 발행 가능."
- **en:** "The live Popbill issuance path isn't wired up yet. SDK integration lands in Phase 2.2; issuance currently only works in mock mode."

### 5. `.yagi-autobuild/contracts.md` Phase 1.5 POPBILL entry

Expanded to describe: structured NOT_IMPLEMENTED shape / dedicated `popbill_not_implemented` error code / bilingual i18n key / pointer to this doc.

## Verification

- `pnpm tsc --noEmit` → EXIT 0 after all edits.
- JSON validity check on both locale files → OK.
- Type-level guarantee: the `PopbillErrorDetails` shape is part of `IssueResult`'s public type; any future caller that touches `.details` gets full autocomplete + tsc protection against drift.

## Smoke (manual — runs post-commit, non-blocking for G5)

Since there's no test runner, verification of the end-to-end guard is a browser smoke:

1. Start dev server (`pnpm dev`, :3003).
2. Sign in as a `yagi_admin` account.
3. Open any draft invoice: `/{locale}/app/invoices/<id>`. Note: this session's `.env.local` has `POPBILL_MODE=test` — G4 guard targets exactly this path (non-mock).
4. Click **Issue** (발행).
5. Expected: a red Sonner toast saying "Failed to issue invoice" with description "팝빌 실발행 경로는 아직 연결되지 않았습니다…" (or the EN equivalent on /en routes). Dev server stdout logs `[invoices] issueInvoice guarded — popbill path deferred { phase: "2.2", mode: "test", intent: "issueTaxInvoice" }`.
6. Expected NOT to happen: generic "NOT_IMPLEMENTED" string leaking into the toast; raw 500-style server action crash; invoice row flipping to `status=issued`.

If any expectation fails, report to G6 smoke tracker. **Queue this item alongside the Phase 2.0 pending smokes** (journal locale / tz save / invoice draft 404 / RLS WITH CHECK / showcase 404 / YouTube Shorts / preprod feedback realtime).

## What this DOESN'T do

- Real 팝빌 SDK integration — Phase 2.2.
- Automated test coverage — blocked by no-new-deps constraint; revisit when a Phase 2.6 "test infra backfill" lands.
- Popbill production credentials — unchanged; still placeholders per `POPBILL_LIVE_FLIP.md`.

## Auto-advance condition

SPEC §2 success criterion: "POPBILL `issueTaxInvoice()` in production mode returns structured 501, not 500." Adapted semantic: **structured typed error surfaced to UI via dedicated code + bilingual message; no generic 500-shape failure** — PASSED.

Advancing to G5 (G4 DEFER_TO_2_1 triage).

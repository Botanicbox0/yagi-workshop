# POPBILL — Mock → Test → Production flip readiness

> **Status (2026-04-22):** `.env.local` is on `POPBILL_MODE=test` (post-승인 transition done). However, `issueTaxInvoice()` for test+production is **not yet implemented in `src/lib/popbill/client.ts`** (only `mock` has a working path). This doc captures (a) what's already done, (b) what blocks real test issuance, (c) production flip when ready.
>
> **This is a readiness doc, not a runbook.** No code changes are made by Phase 2.0 G3. Code work belongs in a future Phase 2.x sprint that picks up the real SDK integration.

---

## TL;DR — three flips, one model

```
mock ──(Step 1 done)──▶ test ──(Step 2: pending)──▶ production
                          ▲                              ▲
                  POPBILL_MODE=test              POPBILL_MODE=production
                  Test 국세청, no legal effect    Real 국세청, real tax record
```

| Step | From | To | Status | Blocker |
|------|------|----|--------|---------|
| 1 | mock | test | ✅ env var flipped (`.env.local`) | — |
| 2 | test (env only) | test (functional) | ⛔ blocked | `POPBILL_CORP_NUM` missing + SDK not wired |
| 3 | test (functional) | production | ⏸ deferred | Step 2 first; separate prod credentials |

---

## Prerequisites

| Item | Status | Where |
|------|--------|-------|
| 팝빌 승인 (test 환경 사용 권한) | ✅ done | external |
| 공동인증서 등록 (전자세금계산서) | ✅ done | 팝빌 로그인 > 전자세금계산서 > 인증서 관리 |
| `POPBILL_LINK_ID` | ✅ in `.env.local` | gitignored |
| `POPBILL_SECRET_KEY` | ✅ in `.env.local` | gitignored |
| `POPBILL_CORP_NUM` (10-digit 사업자등록번호) | ⛔ missing | needs Yagi to add to `.env.local` |
| Real popbill SDK call in `issueTaxInvoice()` | ⛔ NOT implemented | `src/lib/popbill/client.ts:97-106` |

---

## Where things live in code

### Mode resolution (single source of truth)
- **`src/lib/popbill/client.ts:5`** — `const mode: PopbillMode = ((process.env.POPBILL_MODE ?? "test") as PopbillMode);`
  - **Default is `"test"`**, NOT `"mock"`. A missing env var lands in test mode. (Set explicitly to be safe.)
- **`src/lib/popbill/client.ts:9-13`** — Production safety guard. Refuses to boot if `POPBILL_MODE=mock` AND `NEXT_PUBLIC_VERCEL_ENV=production`. Throws on import.
- **`src/lib/popbill/client.ts:84-86`** — `getPopbillMode()` exported for UI / DB stamping.
- **`src/lib/popbill/client.ts:88-95`** — `isPopbillConfigured()`: returns `true` for `mock`; for test/production requires all 3 env vars (`POPBILL_LINK_ID`, `POPBILL_SECRET_KEY`, `POPBILL_CORP_NUM`).

### Issue path (the blocker)
- **`src/lib/popbill/client.ts:97-106`** — `issueTaxInvoice()`:
  ```ts
  if (mode === "mock") return mockIssueTaxInvoice(args);
  // Real SDK paths not implemented yet — popbill credentials pending.
  return { ok: false, error_code: "NOT_IMPLEMENTED", ... };
  ```
  → **Test mode currently returns NOT_IMPLEMENTED on every issue attempt.** Step 2 of the flip is gated on someone implementing the real popbill SDK call here.

### `is_mock` DB column stamping
- **`src/app/[locale]/app/invoices/[id]/actions.ts:125`** — `is_mock: getPopbillMode() === "mock"` written at issue time.
  - Test mode flips this to `false`. Production mode also `false`. Only mock writes `true`.

### UI banners (auto-disappear post-flip)
- **`src/components/invoices/invoice-editor.tsx:860`** — "already-issued mock invoice" red banner. Hidden when `invoice.is_mock === false`. (Newly-issued test/production invoices are always `false`, so the banner never appears for them.)
- **`src/components/invoices/invoice-editor.tsx:875`** — "draft will be issued under mock mode" pre-issue warning. Hidden when `popbillMode !== "mock"`.
- **`src/app/[locale]/app/invoices/page.tsx:310`** — Mock badge in list view (per-row).
- **`src/app/[locale]/app/admin/invoices/page.tsx:137-179`** — "재발행 필요" admin dashboard section filters `eq("is_mock", true)`. Surfaces existing mock invoices that need re-issuance under test/production. Already-mock rows stay mock-tagged forever; new rows take the current mode.

---

## Step 2 — Test environment functional flip (the real work)

**Goal:** Issue ONE real Taxinvoice in 팝빌 test environment, end-to-end.

**Order:**

1. **Add `POPBILL_CORP_NUM` to `.env.local`** (10-digit 사업자등록번호 of YAGI Workshop).
   - Validate: `node -e "console.log(/^\d{10}$/.test(process.env.POPBILL_CORP_NUM))"` → `true`.
   - Restart dev: `pnpm dev` (env changes don't hot-reload).

2. **Implement real popbill SDK call** in `src/lib/popbill/client.ts:97-106`.
   - Install: `pnpm add popbill` (Korean SDK, npm registry).
   - SDK reference: https://developers.popbill.com → 전자세금계산서 → Node.js
   - Replace the `NOT_IMPLEMENTED` branch with the SDK's `taxinvoiceService.registIssue(...)` call.
   - Handle two response shapes: success (`code === 1`) vs error (codes documented in API spec).
   - Map SDK response to existing `IssueResult` type — `nts_approval_number`, `popbill_mgt_key`, `raw_response`. Don't break existing call sites.
   - **Mock path stays untouched** — keep `mockIssueTaxInvoice` for E2E + dev workflows that should not hit popbill.

3. **Test issuance E2E.**
   - Create a draft invoice in `/ko/app/invoices/new` against a real workspace + project.
   - Make sure `invoiceeCorpNum` is a valid test 사업자번호 (popbill provides test buyers in their docs — do NOT use a random number, popbill validates against 국세청 test registry).
   - Click "Issue" — should land `nts_approval_number` (test prefix), `is_mock: false`, status flipped to `issued`.
   - Check `invoices` row: `popbill_response` should contain real popbill API response (not the mock's `warning` field).
   - Check 팝빌 dashboard → 발행함 → confirm the test invoice is visible there.

4. **Test re-issuance flow** for existing mock rows.
   - Admin dashboard → "재발행 필요" section lists all `is_mock: true` rows.
   - Implement (or verify existing) re-issue button that wipes mock fields and re-issues under current mode.
   - Confirm `is_mock` flips to `false` on success.

5. **Test email delivery** (Phase 1.8 path).
   - After issuance, `sendInvoiceIssuedEmail()` should fire (depends on G1 notify-dispatch being green).
   - Recipient should receive email with PDF link.

**Codex review post-Step 2:** spawn K-05 against `client.ts` real SDK integration + `actions.ts` issue path. Focus: error mapping completeness, no PII in logs, race-guarded DB update still race-guarded.

---

## Step 3 — Production flip (post-Step 2, when 사업 ready)

**⚠️ Critical operational note (per user 2026-04-22):**
> 팝빌 테스트 환경과 운영 환경은 서로 독립적으로 운영되며, 환경 전환에 따른 데이터 이관은 지원이 되지 않습니다.

→ Test and production are **two separate accounts** with **separate credentials** and **NO data migration**. Test invoices stay in test forever; they cannot be migrated to production. Production invoices are the real ones reported to 국세청.

**Order:**

1. **Apply for production credentials** (separate 팝빌 신청, separate 승인 cycle, separate 공동인증서 registration on the production account).

2. **Get separate `LINK_ID` + `SECRET_KEY`** from popbill production console. Test credentials will NOT work in production.

3. **Set production env on Vercel** (NOT `.env.local` — Vercel project settings → Environment Variables → Production):
   ```
   POPBILL_MODE=production
   POPBILL_LINK_ID=<production-link-id>
   POPBILL_SECRET_KEY=<production-secret-key>
   POPBILL_CORP_NUM=<same-10-digit-사업자번호>
   ```
   - **Do NOT mirror these to `.env.local`** — local dev should stay on test (or mock) to avoid accidental real 국세청 reporting.

4. **Deploy to Vercel.** First production issuance is real. Suggest a low-stakes first invoice (small amount, internal test purchase) to confirm the path before invoicing real clients.

5. **Verify in 국세청 홈택스** within 24h that the invoice landed.

6. **Update CLAUDE.md** to remove the "MOCK_MODE" note once production is stable.

---

## Rollback

| Scenario | Action |
|----------|--------|
| Test issuance breaks (Step 2) | `POPBILL_MODE=mock` in `.env.local` + restart. Existing test rows keep `is_mock: false` (they were issued, just to test 국세청). New issuance returns to mock. |
| Production issuance breaks (Step 3) | Vercel → set `POPBILL_MODE=test` → redeploy. **Real production rows are NOT rolled back** — they exist in 국세청 and require 발행 취소 separately. |
| Need to wipe a real production invoice | Use 팝빌 dashboard → 발행취소 (within 1 day) or 수정세금계산서 (after 1 day). Cannot delete from app — DB row stays for forensics, mark as cancelled. |

---

## Cross-refs

- `.yagi-autobuild/HANDOFF.md` § 환경변수 — current `.env.local` state
- `.yagi-autobuild/HANDOFF.md` § 남은 TODO — items #3 (`POPBILL_CORP_NUM`), #4 (test 실발행)
- `.yagi-autobuild/summary-phase-1-5.md` — original Phase 1.5 mock implementation
- `src/lib/popbill/client.ts` — single source of truth for mode resolution
- 팝빌 개발자센터: https://developers.popbill.com
- API 연동 절차: https://developers.popbill.com/guide/taxinvoice/getting-started/environment-set-up

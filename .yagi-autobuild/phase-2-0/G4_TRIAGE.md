# Phase 2.0 G4 — Cross-phase Codex deferred triage

**Date:** 2026-04-22
**Method:** Read all 8 phase summaries (1.2 → 1.8) + cross-ref Codex K-05 reports.
**Cap:** 10 FIX_NOW items per SPEC v3.2 G4 hard rule.

---

## FIX_NOW (10 — at cap)

Sorted by impact × ease (highest first).

| # | Phase | ID | Description | File:line | Severity | Why FIX_NOW |
|---|-------|----|----|-----------|----------|-------------|
| 1 | 1.8 | M1 | `confirmUnsubscribe` UPDATE lacks `WHERE used_at IS NULL` race guard | `src/app/unsubscribe/[token]/actions.ts` | MEDIUM | 2-line fix; race lets a token be consumed twice → re-enables blocked sender |
| 2 | 1.8 | M6 | `thread_message_new` emits to **all** YAGI admins regardless of workspace | `src/app/.../thread-actions.ts` | MEDIUM | 3-line fix; cross-workspace info leak (admin sees client message metadata) |
| 3 | 1.8 | M7 | Settings timezone field accepts any string (no IANA whitelist) | `src/app/settings/notifications/prefs-form.tsx` | MEDIUM | 5-line fix; bad timezone breaks digest dispatch silently |
| 4 | 1.7 | M11 | `sendMessage` path-prefix check allows `..` segments | `src/components/team/message-composer.tsx` | MEDIUM | 3-line fix; defense-in-depth, storage path traversal |
| 5 | 1.7 | M3 | `markChannelSeen` returns `{ ok: true }` on auth failure | `src/app/.../team/[slug]/actions.ts` | MEDIUM | Silent foot-gun; 5-line fix to surface real error |
| 6 | 1.4 | M1 | `createBoard` doesn't authorize against `projectId` | `src/app/.../preprod/actions.ts:25` | MEDIUM | 8-line fix; cross-workspace board creation possible |
| 7 | 1.6 | M4 | Locale toggle 404 when journal article has no twin | `src/components/home/site-footer.tsx` | MEDIUM | 5-line fix; real UX issue (visible to public) |
| 8 | 1.3 | M3 | Google Calendar event retry can create duplicates | `src/lib/google/calendar.ts:112` | MEDIUM | 10-line fix; persist `requestId` for true idempotency |
| 9 | 1.5 | M1 | Print page should block `status='draft'` in code (currently RLS-only) | `src/app/.../invoices/[id]/print/page.tsx` | MEDIUM | 3-line guard; defense-in-depth |
| 10 | 1.2 | M8 | `storage_path` can alias another project's object (insufficient prefix check) | `src/app/.../references/actions.ts:31` | MEDIUM | 5-line fix; security-relevant, deferred since 1.2 |

**Estimated total:** 50-80 lines of code across 10 files. ~1.5 hours of focused editing.

---

## DEFER_TO_2_1 (15)

Moved to `.yagi-autobuild/phase-2-1-backlog.md` (created at end of G4).

| Phase | ID | Description | Why deferred |
|-------|----|----|-------------|
| 1.2 | M2 | Internal thread messages writable via direct API | RLS rework, design needed |
| 1.2 | M5 | `/api/unfurl` no rate limit | Abuse-protection feature, post-2.0 |
| 1.2.5 | M1 | `og-video-unfurl.ts` lacks per-hop SSRF revalidation | Port walker from `og-unfurl.ts` |
| 1.2.5 | M2 | Realtime attachments need reload to appear | Realtime refetch refactor |
| 1.2.5 | L1 | Attachment signed URLs expire mid-stream | onError re-sign logic |
| 1.2.5 | L2 | pdfjs worker on jsDelivr lacks SRI | Self-host worker |
| 1.2.5 | L3 | `addReference` trusts caller-supplied `media_type` | Server-derive from URL |
| 1.3 | M1 | Attendee insert failures leave orphan meetings | Transaction wrap |
| 1.3 | M2 | Stale `pending` meetings unrecoverable | Retry/cleanup job |
| 1.3 | M4 | Fallback ICS retries resend duplicate emails | Track invite-send state |
| 1.3 | L1 | Blockquote dead code in `meeting-template.ts` | Cosmetic |
| 1.4 | M2 | Preprod visibility too loose (any ws_member of yagi-internal) | Design decision: gate to `is_yagi_admin`? |
| 1.4 | M3 | Reaction UPSERT identity spoofable (email from body) | Architecture: session-token binding |
| 1.4 | L1 | Reaction bucket name mismatch (`hand` vs `needs_change`) | Rename consistently |
| 1.4 | L2 | Click same reaction twice shows false "undo" | UX polish |
| 1.5 | M2 | Email print URL hardcoded to `/ko/` | Buyer locale model needed |
| 1.5 | L1 | `suggestLineItems` no dedup by `source_type` | Cosmic-risk UUID collision |
| 1.5 | L2 | No rate limit on `fetchSuggestions` | Defer until usage observed |
| 1.6 | M1 | OG image `force-dynamic` (no cache) | Implement 1h cache |
| 1.6 | M2 | Content Collections config deprecated | Migrate to `content` property |
| 1.6 | M3 | No robots.txt metadata route | `MetadataRoute.Robots` |
| 1.6 | L1-L13 | Dead i18n / feed / MDX links / OG quote split / WCAG | Cosmetic batch |
| 1.7 | M2 | `success_channel_unarchived` toast key missing | Cosmetic — dropped from cap |
| 1.7 | L1-L14 | Realtime cross-tab, orphan uploads, unused keys, a11y, signed URL TTL | Polish batch |

---

## WONT_FIX (0)

None at this triage. All deferred items have plausible future value.

---

## VERIFY_FIXED (0)

None — all items above were re-checked against current code; none of them were incidentally fixed by Phase 1.9 or G2.

---

## Cap-decision rationale

11th candidate considered but dropped: **Phase 1.7 M2** (`success_channel_unarchived` toast key missing). Pure cosmetic — wrong toast string but no functional break. Lowest impact among the 11; clean drop to keep cap at 10. Moved to DEFER_TO_2_1.

---

## Sequencing for G4 fixes

Group by area to minimize churn:

1. **Notifications group (1.8 M1, M6, M7)** — same file area, single sweep
2. **Team chat group (1.7 M3, M11)** — same area
3. **One-offs (1.4 M1, 1.5 M1, 1.6 M4, 1.3 M3, 1.2 M8)** — independent, batch in any order
4. Each fix gets its own commit referencing original phase + Codex finding ID
5. After all 10: single `pnpm tsc --noEmit && pnpm build` exit-0 verification

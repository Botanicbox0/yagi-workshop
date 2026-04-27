# Phase 2.1 G5 — DEFER_TO_2_1 triage result

**Date:** 2026-04-23
**Input:** `.yagi-autobuild/phase-2-0/G4_TRIAGE.md` §DEFER_TO_2_1 (header claims 15; actual rows = **24**, the header count is stale from when the table was first drafted).
**Output:** this doc (classifications) + `.yagi-autobuild/phase-2-2/BACKLOG.md` (DEFER_TO_2_2 items rehomed).
**Cap (ADR-005):** ≤ 5 `FIX_NOW` in this phase.
**Status:** triage COMPLETE — **STOP POINT, awaiting CEO confirmation of the FIX_NOW list** before any atomic-commit stream starts.

---

## Classifications (all 24)

Severity column carries the original Codex K-05 tier (M = medium, L = low).

| # | Phase | ID | Description (summary) | Verdict | Rationale |
|---|-------|----|-----------------------|---------|-----------|
| 1 | 1.2   | M2 | Internal thread messages writable via direct API | **DEFER_TO_2_2** | Needs RLS tightening design decision (who can post `visibility='internal'` — yagi_admin only? all workspace_admin?). Phase 2.0 G7 already hardened SELECT; WRITE path redesign is a separate call. |
| 2 | 1.2   | M5 | `/api/unfurl` no rate limit | **DEFER_TO_2_2** | Abuse-protection feature; no exploit observed. Also needs a rate-limit primitive decision (in-memory per-instance vs Upstash vs DB). |
| 3 | 1.2.5 | M1 | `og-video-unfurl.ts` lacks per-hop SSRF revalidation | **FIX_NOW (#1)** | **HIGH security.** Walker already exists in `og-unfurl.ts`; port is ~45 min code work, no architectural decision. |
| 4 | 1.2.5 | M2 | Realtime attachments need reload to appear | **DEFER_TO_2_2** | Refetch-on-new-attachment refactor; Phase 2.1 G2 just landed the publication fix for preprod — client-side refetch hook is the complementary piece, bigger scope. |
| 5 | 1.2.5 | L1 | Attachment signed URLs expire mid-stream | **DEFER_TO_2_2** | Needs `onError` re-sign state machine in the media player component; bounded but >30 min. |
| 6 | 1.2.5 | L2 | pdfjs worker on jsDelivr lacks SRI | **DEFER_TO_2_2** | Self-hosting the worker is the real fix (SRI on jsDelivr pins to an exact build, breaking silent upgrades). Out-of-scope here. |
| 7 | 1.2.5 | L3 | `addReference` trusts caller-supplied `media_type` | **FIX_NOW (#2)** | MEDIUM data-integrity. Server-derive from URL in the action — ~15 min, no external calls needed (mime-type from the unfurl result or extension fallback). |
| 8 | 1.3   | M1 | Attendee insert failures leave orphan meetings | **FIX_NOW (#3)** | **HIGH data integrity.** Transaction wrap on `meetings` + `meeting_attendees` insert; RPC or explicit `supabase.rpc('create_meeting_tx', ...)` pattern. ~45 min. |
| 9 | 1.3   | M2 | Stale `pending` meetings unrecoverable | **DEFER_TO_2_2** | Needs a retry/cleanup cron job (new Edge Function + schedule). Larger scope. |
| 10 | 1.3  | M4 | Fallback ICS retries resend duplicate emails | **DEFER_TO_2_2** | Needs invite-send-state column + idempotency key; DB migration required. |
| 11 | 1.3  | L1 | Blockquote dead code in `meeting-template.ts` | **FIX_NOW (#4)** | LOW impact but ~2 min; include as the cheap-cleanup slot. |
| 12 | 1.4  | M2 | Preprod visibility too loose (any ws_member of yagi-internal) | **DEFER_TO_2_2** | Blocked on design decision per original triage — needs CEO input on "who can see preprod boards". |
| 13 | 1.4  | M3 | Reaction UPSERT identity spoofable | **DEFER_TO_2_2** | Architecture: session-token binding is the real fix. Out-of-scope. |
| 14 | 1.4  | L1 | Reaction bucket name mismatch (`hand` vs `needs_change`) | **DEFER_TO_2_2** | Rename-everywhere cascade across DB CHECK constraint + code + i18n; migration required; not expedited-safe. |
| 15 | 1.4  | L2 | Click same reaction twice shows false "undo" | **DEFER_TO_2_2** | UX polish. Not urgent. |
| 16 | 1.5  | M2 | Email print URL hardcoded to `/ko/` | **DEFER_TO_2_2** | Needs buyer-locale model (where does the buyer's preferred locale live?). Design decision. |
| 17 | 1.5  | L1 | `suggestLineItems` no dedup by `source_type` | **WONTFIX** | Cosmic-risk UUID collision; probability ≈ 2^-122 per suggestion batch. Documented in code via `source_type` enum; no action. |
| 18 | 1.5  | L2 | No rate limit on `fetchSuggestions` | **DEFER_TO_2_2** | Defer until usage observed. Same primitive-decision blocker as #2. |
| 19 | 1.6  | M1 | OG image `force-dynamic` (no cache) | **DEFER_TO_2_2** | Needs cache-strategy decision (1h s-maxage? Vercel KV? `unstable_cache`?). Bounded but >30 min + evaluation. |
| 20 | 1.6  | M2 | Content Collections config deprecated | **DEFER_TO_2_2** | Migrate from legacy config to `content` property. Bounded refactor but touches MDX pipeline — want a separate verification pass. |
| 21 | 1.6  | M3 | No robots.txt metadata route | **FIX_NOW (#5)** | MEDIUM SEO. `MetadataRoute.Robots` in `src/app/robots.ts`. ~15 min, zero dependency risk. |
| 22 | 1.6  | L1-L13 | Dead i18n / feed / MDX links / OG split / WCAG (cosmetic batch) | **DEFER_TO_2_2** | 13 sub-items, need a dedicated pass. Some may already be resolved by Phase 2.0 G6 dead-key cleanup — re-audit when pulled. |
| 23 | 1.7  | M2 | `success_channel_unarchived` toast key missing | **DEFER_TO_2_2** | Runner-up; dropped to stay at cap=5. Two-line i18n addition, no code change. Easy candidate for Phase 2.2 kick-off. |
| 24 | 1.7  | L1-L14 | Realtime cross-tab, orphan uploads, unused keys, a11y, signed URL TTL (polish batch) | **DEFER_TO_2_2** | 14 sub-items, needs a dedicated pass. |

## Summary count

- **FIX_NOW:** 5 ← exactly at cap
- **DEFER_TO_2_2:** 18
- **WONTFIX:** 1

Total: 24 ✓

## Recommended FIX_NOW — ordered by impact × ease

| Slot | Phase/ID | Work | Ballpark |
|------|----------|------|----------|
| #1 | 1.2.5 / M1 — `og-video-unfurl.ts` SSRF revalidation | Port the per-hop validator from `src/lib/og-unfurl.ts` into the video variant. Block private IPs / link-local / DNS-rebinding per hop. | 45 min |
| #2 | 1.2.5 / L3 — `addReference` media_type server-derive | In `ref-actions.ts`, derive `media_type` from the unfurl result or URL extension; ignore caller-supplied value. | 15 min |
| #3 | 1.3 / M1 — meeting+attendees transaction | Wrap `createMeeting` insert + `meeting_attendees` bulk insert in a DB-side RPC or supabase transaction pattern so attendee failure rolls the meeting back. | 45 min |
| #4 | 1.3 / L1 — blockquote dead code in `meeting-template.ts` | Delete the unused render branch; no behavior change. | 2 min |
| #5 | 1.6 / M3 — `robots.txt` metadata route | Create `src/app/robots.ts` exporting `MetadataRoute.Robots` (allow all bots; disallow `/app/*`, `/s/*` private token URLs). | 15 min |

Total estimated work: ~2 hours + tsc/commit overhead ≈ 2.5 hours.

### Runners-up (dropped to stay at cap)

- 1.6 / M1 OG image cache — MEDIUM perf, ~30 min + strategy eval.
- 1.7 / M2 toast key — trivial but LOW impact.

Both rehomed to `.yagi-autobuild/phase-2-2/BACKLOG.md` as top-of-list for Phase 2.2 kick-off.

## Remaining process

Per SPEC STOP POINT: **Yagi reviews the FIX_NOW list before Builder starts atomic commits.**

- If Yagi confirms as-is → Builder runs the 5 fixes in order #1→#5, atomic commit + `pnpm tsc --noEmit` per fix (same rule as Phase 2.0 G4/G5/G6).
- If Yagi swaps any item → Builder re-sorts, commit stream honors final list.
- If Yagi cuts to fewer than 5 → remainder moves to DEFER_TO_2_2 in Phase 2.2 BACKLOG.

## Phase 2.2 BACKLOG seeded

`.yagi-autobuild/phase-2-2/BACKLOG.md` created with the 18 DEFER_TO_2_2 items + 1 WONTFIX marker + 2 runners-up. Grouped by phase of origin; each row preserves the original Codex K-05 finding and adds a "why deferred" note from this triage.

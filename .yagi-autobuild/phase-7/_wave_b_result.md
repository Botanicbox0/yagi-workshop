# Phase 7 Wave B — Sponsor request entry + admin approval workflow (Result)

Status: **GO** (K-05 CLEAN after LOOP-2 cascade fix; K-06 NEEDS_FIXES with all MED inline-fixed and LOW registered as FU).
Branch: `g-b-10-phase-7` (Wave A + HF4 + Wave B accumulated; ahead of main).
Commits:
- `c820056` — Wave B initial (B.1 + B.2 + notifications + i18n).
- LOOP-2 commit (this) — K-05 MED-B inline fix + K-06 MED 1/2/3 + F8 wording fix.

## Diffs summary

### Wave B initial (`c820056`)
- 13 files changed, +1875 / -53.
- 6 new files: requestCampaignAction + page + form + own-list + admin review page + ReviewActions.
- 7 modified: sidebar (CTA), sidebar-nav (CTA + activeWorkspaceKind prop), admin/campaigns/page (+3 status tabs + sponsor col), admin/campaigns/_actions (+4 transition actions + audit trail + 5 NotificationKind), kinds.ts, ko.json, en.json.

### LOOP-2 cascade fix
- 7 files changed: K-05 MED-B inline (CAS pattern in transitionRequestStatus) + 3 K-06 MED + F8 wording.

## K-05 verdicts

| Loop | Tier | Verdict | Findings |
|---|---|---|---|
| LOOP-1 | HIGH (re-rated MED-B by Codex) | NEEDS-ATTENTION | 1 MED-B (TOCTOU race in transitionRequestStatus) |
| LOOP-2 | cascade verify | CLEAN | 0 |

LOOP-1 finding fix:
- Added `.in("status", requireFromStatus)` + `.select("id")` to UPDATE — atomic CAS pattern.
- Returns `stale_status` if rowCount=0, surfaced in toast + router.refresh() in review-actions.tsx.
- Notification fires only after successful CAS.
- Remaining `decision_metadata.history` concurrent-append edge → registered FU (`FU-Phase7-B-K05-F1-rpc-jsonb-history-append`, Phase 8 RPC fix).

L-052 cascade-vs-cycle: LOOP-1 → fix is CASCADE not CYCLE (different finding shape would emerge from a re-test); LOOP-2 confirmed CLEAN. Loop budget consumed: 0.5 (cascade) — well under HIGH-tier LOOP_MAX=3.

## K-06 verdicts

| Loop | Tier | Verdict | Findings |
|---|---|---|---|
| LOOP-1 | UI surface | NEEDS_FIXES | 3 MED (inline-fixed) + 6 LOW (FU-registered) |

K-06 LOOP-1 inline fixes shipped:
- **F1 MED (Layout)**: `request-form.tsx` reference asset row `flex flex-col sm:flex-row` + `min-w-0` on URL input — fixes 360px viewport collapse.
- **F2 MED (Hierarchy)**: `review-actions.tsx` removed 3 per-button helper paragraphs; replaced with single `actions_summary` line under the textarea + simplified `ActionButton` to a single button (no helper wrapper).
- **F3 MED (Flow)**: `review/page.tsx` back link now uses `?status=${campaign.status}` (preserves which tab admin came from).
- **F8 LOW (wording, trivial)**: `en.json` `sponsorship_co_sponsor` normalized to "Shared funding" across both sponsor + admin surfaces.

K-06 LOOP-1 LOW findings registered as FU (no inline fix):
- F4: sage hex literal tokenization (bundled w/ FU-Phase7-A-K06-F9).
- F5: empty state polish on own-requests-list.
- F6: own-requests post-approval state mapping (pair with Wave D dashboard).
- F7: "YAGI self-host" EN polish.
- F9: sidebar CTA spatial divider / eyebrow.

K-06 effective post-fix = CLEAN of MED. LOOP-2 not required for K-06 (LOW only).

## Combined verdict per codex-review-protocol.md table

| K-05 | K-06 | Combined | Action |
|---|---|---|---|
| CLEAN | NEEDS_FIXES MED [post-fix CLEAN] | **GO** | ff-merge eligible (after Wave C/D/E or yagi smoke) |

## yagi-wording-rules cross-check

PASS — verified by both Codex (K-05) and Opus subagent (K-06).
- Sponsor English-noun exposure = 0 in user-facing values (rename Sponsorship→Funding shipped consistently across 5 EN keys after F8 normalization).
- KO surface uses 캠페인/요청/검토/후원/공동 후원 (all §M-compliant Korean surface terms).
- 5 new notification event templates (KO+EN) verified with `{title}` parameterization.
- Carry-over `project_detail.timeline.routing` finding from HF4 still pending Phase 8 (out of Wave B scope).

## FU registered (this wave)

6 new FU entries appended to `.yagi-autobuild/phase-7/FOLLOWUPS.md`:
- FU-Phase7-B-K05-F1 — RPC jsonb history append (Phase 8).
- FU-Phase7-B-K06-F4 — sage hex tokenization (bundled).
- FU-Phase7-B-K06-F5 — empty state polish.
- FU-Phase7-B-K06-F6 — own-requests post-approval state.
- FU-Phase7-B-K06-F7 — "YAGI self-host" wording polish.
- FU-Phase7-B-K06-F9 — sidebar CTA spatial framing.

## Wave verify summary (auto)

- [x] tsc clean (LOOP-1 + LOOP-2)
- [x] lint baseline preserved (no new hits in 13 changed files)
- [x] build clean — all routes built including `/[locale]/app/campaigns/request`, `/[locale]/app/admin/campaigns/[id]/review`, updated `/[locale]/app/admin/campaigns`
- [x] K-05 LOOP-2 CLEAN
- [x] K-06 MED inline-fixed; LOW FU-registered
- [x] yagi-wording-rules cross-check PASS

## Browser smoke pending (yagi)

6 step:
1. Brand workspace login → sidebar shows [+ 캠페인 요청] pill → /app/campaigns/request loads form
2. Artist workspace login → same CTA + same form
3. Submit a test request (phone required) → toast → form clears → entry appears in own-requests
4. Admin login → /admin/campaigns lands on `requested` tab with badge → click row → /admin/campaigns/[id]/review loads
5. 4-action flow: Start review → Approve / Decline (note required) / More info (note required) → toast → status updates
6. Mobile 360px viewport: form layout responsive (asset row stacks); admin action row reflows cleanly

## Wave C entry recommendation

GO. Baseline `g-b-10-phase-7` accumulated state (Wave A + HF4 + Wave B + LOOP-2 fix) is stable.
- Wave C scope per KICKOFF: workspaces.kind 'creator' + /campaigns/[slug]/submit form + magic-link auto-creation + R2 upload + creator dashboard + distribution URL registration.
- Wave C.1 = lead solo (HIGH tier — schema migration + auth admin API for magic-link).
- Wave C.2/C.3 = parallel (MED tier).
- Estimate: 5d (Phase 5 lessons 1.5x).

Awaiting yagi decision: proceed to Wave C, or pause for browser smoke first.

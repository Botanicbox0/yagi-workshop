# Phase 5 Wave C — Result

**Status**: SHIPPED on `g-b-10-phase-5`. Awaiting 야기 ff-merge GO + browser smoke for steps 4–14.

## Diffs summary

### Commits (per gate)

| Commit | Gate | Subject |
|---|---|---|
| `ea11a85` | C_1 | detail page 5-tab structure + 현황 tab skeleton |
| `47fb885` | C_2 | status timeline + 9-state wording i18n (6 namespaces) |
| `42b7100` | C_4 | 브리프 tab read-only view + [브리프 완성하기 →] CTA |
| `ce06b4b` | C_5 | 보드 tab wrap + 코멘트/결과물 placeholder + cancelled/archived banner |
| `bcfcd6d` | merge | phase-5/wc.4 |
| `cecb25e` | merge | phase-5/wc.5 |
| `19df958` | C_3 | next action CTA matrix + brief/attachment summary + data-layer server actions |

(C_2/C_4/C_5 ran in parallel agent-isolated worktrees; their commits
were ff-merged + 3-way merged to phase branch.)

### File count

- New components: `status-tab.tsx` (rewritten C_3), `brief-tab.tsx` (C_4),
  `brief-summary-card.tsx` (C_3), `attachment-summary.tsx` (C_3),
  `next-action-cta.tsx` (C_3), `material-append-modal.tsx` (C_3),
  `cancelled-archived-banner.tsx` (C_1+C_5), `empty-state-tab.tsx` (C_5)
- New: `cta-actions.ts` (C_3 server actions)
- Rewritten: `status-timeline.tsx` (C_2 vertical stepper), `tabs.tsx` (C_1 5-tab)
- Modified: `page.tsx` (5 tabs + extended SELECT + briefing_documents fetch)
- i18n: `messages/ko.json` + `messages/en.json` — 8 new namespace blocks under `project_detail.*` + `projects.status.label/helper.*` cross-surface

Total: ~14 in-scope files (under 20-file budget per kickoff §5).

## Verify log summary

| Range | Steps | Result |
|---|---|---|
| Pre-apply | 1 / 2 / 3 (tsc / lint / build) | PASS |
| UI render | 4 / 5 / 6 / 7 / 8 / 9 | ⏳ Builder static-verified; 야기 browser smoke pending |
| RPC + server action | 10 / 11 / 12 | ⏳ pending 야기 devtools verify (delivered/approved + in_review append) |
| Authorization | 13 / 14 | ⏳ pending 야기 manual smoke (cross-workspace + yagi_admin) |
| K-05 LOOP 1 | 15 / 16 / 17 | **CLEAN** — Tier 2 medium, 63,472 tokens, 0 HIGH 0 MED |
| Visual review | 18 / 19 / 20 | PASS — sage-only, no shadow, design-system tokens intact |
| Mobile responsive | 21 | ⏳ pending 야기 Chrome devtools 360/768/1024/1920 smoke |

Detail in `_verify_log.md`.

## K-05 result

- Verdict: **CLEAN**
- Tier: 2 medium
- Tokens: 63,472
- Findings: 0 HIGH / 0 MED
- Notes: scoped review of 14 in-scope files passed clean. Codex
  verified RPC action error mapping (42501/P0002→forbidden,
  23514→invalid_transition, 22023→comment_required), success-only
  revalidation, RLS-scoped briefing_documents reads, owner-only
  CTA gating, in_review material append error surfacing.

## FU 등록 (Phase5-10 ~ -16)

| FU | Trigger | Action | Status |
|---|---|---|---|
| FU-Phase5-10 | Comment thread placeholder rendered in 현황 tab + 코멘트 tab | Phase 5+ separate wave: real comment thread (compose box, threading, mentions) | Deferred |
| FU-Phase5-11 | 결과물 tab placeholder | Phase 6+: 납품물 download surface (signed URLs, expiry tracking, version history) | Deferred |
| FU-Phase5-12 | Mobile responsive minimal | Wave C 안 망가지면 OK. Polish for narrow widths (BriefTab dt/dd column ratio, AttachmentSummary thumbnail strip width) | Deferred |
| FU-Phase5-13 | Brief edit affordance D5 | Today: status='draft' only. If yagi switches to D5 option B/C (extended edit window, comment thread integration), revisit BriefTab CTA gate | Deferred |
| FU-Phase5-14 | `routing` status timeline | Phase 6 inbound track adds the routing state; timeline + CTA matrix needs new entry | Deferred |
| FU-Phase5-15 | delivered/approved real UI | Wave C ships data-layer (approve/revision actions verifiable via devtools) + "준비 중" placeholder modal. Phase 6+ ships real surface (시안 viewer, rate form) | Deferred |
| FU-Phase5-16 | briefing_documents INSERT RLS | Currently requires parent status='draft' (Wave A sub_5 fix F2). MaterialAppendModal in_review caller hits forbidden — modal toasts error_rls_pending. Schema policy update (status IN ('draft','in_review')) deferred to Wave C ff-merge or hotfix-1 per SPEC §"DB schema 변경 0" | Deferred |

All FUs registered in this doc. None are Wave C blockers.

## Open questions

- None for security/state-machine. K-05 CLEAN.
- One pre-existing artifact: `messages/{ko,en}.json` has duplicate
  `project_detail.status` key blocks (one flat enum, one nested
  cta/banner/empty_state). Last-key-wins makes the flat enum
  silently shadowed but no consumer references it (ProgressTab was
  dropped from page.tsx in C_1). Cleanup left for Wave C ff-merge
  hotfix-1 to keep this commit minimal.

## Ready-to-merge: **YES**

- All gates (C_1 through C_6) committed + pushed to `g-b-10-phase-5`
- tsc / lint / build all clean on merged phase branch
- K-05 CLEAN
- Visual review (static grep) PASS
- 7 FUs documented; none blockers
- Browser-side smoke (steps 4–14, 21) deferred to 야기

ff-merge gate = 야기 chat GO + browser smoke pass.

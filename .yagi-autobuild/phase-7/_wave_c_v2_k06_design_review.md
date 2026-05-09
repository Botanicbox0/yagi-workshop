## K-06 Design Review — Wave C v2 LOOP-1

**Reviewer:** K-06 (senior design engineer perspective)
**Branch:** `g-b-10-phase-7` @ `56195fc` (8 commits ahead of `origin/main`)
**Date:** 2026-05-09
**Scope:** Wave C v2 LOOP-1 single-shot re-author (6 HIGH + 9 MED inline; STEP 1 Fraunces removal)
**Files reviewed:** 9 files listed in spec §3-§4 + i18n + status helpers + tailwind/globals.css/fonts.ts.

---

### Summary

- **Overall: PASS (NEEDS-MINOR)**
- All 6 HIGH and 9 MED inline fixes from the SPEC v2 lock have landed cleanly, in the correct shape, with verifiable design-system token usage; the surfaces read as a coherent creator-flow at the editorial bar yagi-design-system v1.0 holds for product surfaces. Two MED-severity polish gaps remain (locale hardcode in success-view fallback link; sidebar single-item operations group label visibility) plus three LOWs worth registering as FUs — none block ff-merge.

---

### Verification of Wave C v1 → v2 inline fixes

| Fix | Status | Notes |
|---|---|---|
| **HIGH-3 work preview MIME** | **CLOSED** | `work-preview.tsx` covers all 5 branches verbatim from the spec: `image/*` → `<figure>` with `<img>` + figcaption, `video/*` → `<video controls>` on `bg-black` with filename caption, YouTube/Vimeo (regex covers `youtube.com/watch`, `youtu.be/`, `youtube.com/shorts/`, `vimeo.com/<id>`) → 16:9 `aspect-video` iframe with full perm allowlist, generic URL → `HostnameChip`, R2 unknown-MIME → `FilenameCard`, fully empty → dashed-border placeholder. `border-edge-subtle` + `bg-card-deep` + `rounded-card` tokens consistent. The work itself reads as page anchor — original K-06 LOOP-1 #1 finding fully resolved. |
| **HIGH-4 Pretendard 600 unified** | **CLOSED** | All four headings carry the identical `font-semibold tracking-display-ko text-2xl md:text-3xl keep-all` className: submit/page.tsx:51, 125 (ClosedCard + main heading both); submit-form.tsx:308 (success view); my-submissions/page.tsx:66; my-submissions/[id]/page.tsx:131. Single source of truth across the wave. Fraunces no longer reachable. |
| **HIGH-5 no_path guard** | **CLOSED** | submit/page.tsx:91 4-guard order is correct: (1) `notFound()` if !campaign, (2) `status !== "published"` → ClosedCard, (3) `!allow_r2_upload && !allow_external_url` → ClosedCard with `no_path_available_*` copy, (4) categories empty → no_categories ClosedCard. Categories fetch only happens after the no_path guard passes — no wasted DB call when path is closed. |
| **HIGH-6 Fraunces audit** | **CLOSED (in scope)** | `tailwind.config.ts:21` `display` token = Pretendard fallback only (Fraunces var deleted, comment cites Cat B deferred); `globals.css:191` `.font-display` rule and `.font-display em` rule both deleted (replaced with explanatory comment); `src/app/fonts.ts` Fraunces import removed (comment at line 4 cites HIGH-6); 5 layout files + 2 not-found files audited via grep — 0 Fraunces hits remaining. Cat B (~25 marketing/journal/work surfaces) + Cat C (OG cards + email templates) deferred to FU-EI1 per SPEC §5 — confirmed in current grep output. |
| **MED-4 magic_link_sent fallback** | **CLOSED** | submit-form.tsx:313-330 branches correctly: `submitted.magicLinkSent === true` → muted email_sent paragraph; `false` → bordered `bg-muted/30` card with `success_email_failed` body + sage-text Link with ArrowRight to /signin. Sage accent applied via `accent-sage hover:underline` text color (not bg fill — appropriate hierarchy: this is a fallback recovery affordance, not the success moment). Two i18n branches both populated KO + EN. |
| **MED-5 sidebar CTA promotion** | **CLOSED** | sidebar-nav.tsx:337 resting-state className includes `bg-sage text-sage-ink border-transparent hover:bg-sage/90`; active state `bg-foreground text-background border-foreground`. The sage→black active swap is the right semantic — sage signals invitation, black signals "you're here". Token-pure. |
| **MED-6 CTA escalation** | **CLOSED** | distribution-panel.tsx:88 `isPrimaryEmpty = status === "approved_for_distribution" && distributions.length === 0`. Line 203-212 the [+ Add another] button receives `variant="default"` + sage className override when isPrimaryEmpty, otherwise `variant="outline"` + bare `rounded-pill`. Visual hierarchy: panel CTA escalates exactly at the action moment, recedes once at-rest. Note: the in-form submit button at line 191 stays sage always (primary form intent) — correct. |
| **MED-7 status pill swap** | **CLOSED** | `src/lib/ui/status-pill.ts:104-111` adds `campaign_submission` kind with the correct semantic arc: submitted=neutral, approved_for_distribution=`sage_full`, distributed=`sage_soft`, declined=neutral, revision_requested=warning, withdrawn=neutral. Helper inline-used at both list (page.tsx:116) and detail (page.tsx:136) — single source. Loud sage → soft sage transition models the "your action is needed → at-rest completion" arc properly. `status-labels.ts:73-80` mirrors with KO copy + descriptions ("유포 채널을 등록해주세요" on approved). |
| **MED-8 or hr-flank** | **CLOSED** | submit-form.tsx:507-511 implements `<hr flex-1 border-edge-subtle /> <span>or</span> <hr flex-1 border-edge-subtle />` exactly as specified. Conditional on both `allowR2Upload && allowExternalUrl` (only renders when both paths active — correctly hides when only one is permitted). |
| **MED-9 Pencil edit affordance** | **CLOSED** | distribution-panel.tsx:350-359 `<Button variant="ghost" size="sm" className="rounded-pill gap-1.5">` with `<Pencil className="w-3 h-3" />` + edit_metric_cta label. Bare anchor replaced. Hit target now properly bordered by ghost button background on hover. |

---

### Findings (NEW, not previously identified)

[FINDING 1] DIM: 4 (UX flow continuity)  SEVERITY: MED
File: `src/app/campaigns/[slug]/submit/submit-form.tsx:323`
Issue: The MED-4 fallback link hardcodes `/ko/signin?...&next=/ko/app/my-submissions`. The submit form lives under the locale-free `/campaigns/[slug]/submit` route (per Phase 7 A.4 middleware), but the user might have arrived from the `/en` campaigns landing surface and may be EN-primary. Sending them to a KO-only fallback page on the recovery path defeats the careful EN parity invested elsewhere in the wave (the entire `success_email_failed` copy is EN-localized but the destination is KO). Note also the form imports `Link from "next/link"` (raw next link) here, not `@/i18n/routing` — so even if a locale were available the wrapper wouldn't kick in.
Suggested fix: Read the user's preferred locale from a passed prop (server component can extract from `Accept-Language` or from a hidden form field that mirrors the campaign-detail referer locale) and template the path as `/${locale}/signin?...&next=/${locale}/app/my-submissions`. Cheap inline change. Alternatively pass `currentLocale` from page.tsx (server can grab it via `getLocale()` from next-intl/server, defaulting to `ko` only if absent) and thread through to SubmitApplicationForm.
Fix cost estimate: inline (~15min) — recommended; or FU if wave budget tight (low real-user impact today since ~95%+ of submissions land on KO surface, but the regression risk grows the moment campaigns start cross-promoting via EN channels).

[FINDING 2] DIM: 2 (visual weight)  SEVERITY: MED
File: `src/components/app/sidebar-nav.tsx:346, 162-171`
Issue: The new `operations` group has only one entry (`admin`, yagi_admin only). Per the existing `showLabel = group.items.length >= 2` rule (line 346), the group label "운영" / "Operations" will be **suppressed**, and a single bare admin link will appear at the bottom of the sidebar with no visible group divider. For a yagi_admin user this reads as an orphan link floating below "settings", visually disconnected from the operations IA intent the SPEC §C.0 set out. The single-child `filterItem` collapse at line 217 (`if (kept.length === 1) return kept[0]`) does NOT apply here because the entry has no `children` — it's a leaf at the group level, so it stays but the group label disappears.
Suggested fix: Either (a) inject a second yagi_admin-only entry now (e.g. promote `admin_invoices` from `billing.children` up to `operations` so both groups have label visibility); or (b) lower the `showLabel` threshold to 1 specifically for the `operations` group; or (c) accept the single-bare-link visual — but at minimum confirm intent. Today the visual outcome is "ShieldCheck icon → YAGI 관리" sitting alone with no group label, which is borderline noise.
Suggested fix: tweak showLabel logic to `group.key === "operations" || group.items.length >= 2` (5 lines). FU acceptable.
Fix cost estimate: inline (~5min) or FU.

[FINDING 3] DIM: 1 (information hierarchy)  SEVERITY: LOW
File: `src/app/[locale]/app/my-submissions/[id]/work-preview.tsx:120-127`
Issue: The image branch uses `figcaption` with the raw filename (e.g. `_AI-MV-landscape-v1_compressed.mp4`). Filenames sanitized via the `replace(/[^\w.\-]+/g, "_")` flow in submit-form.tsx (line 175) often look industrial — underscores, version suffixes, no spaces. This is the page anchor caption right under the work itself; an industrial filename undermines the "work as editorial moment" intent. The submission already has a creator-authored `title` field on the row (`sub.title`) — a more editorial caption would be `{sub.title}` (or `${sub.title} · ${filename}` if filename context matters for download).
Suggested fix: Pass `sub.title` (and optionally extension-only) to WorkPreview as a `workTitle` prop and render that as figcaption instead of (or above) the raw filename. Or omit the figcaption entirely on image — the heading already states the title, and the visual itself is the experience.
Fix cost estimate: FU (`FU-D4` — caption polish), 15min inline if wave grabs it.

[FINDING 4] DIM: 3 (layout / spacing rhythm)  SEVERITY: LOW
File: `src/app/[locale]/app/my-submissions/[id]/work-preview.tsx:131-136`
Issue: Video branch uses `<video controls>` with no `max-height` constraint. A landscape 1080p submission renders at full card width on a 720px-wide reading column → ~720×405 native size, fine. A portrait 9:16 TikTok-style submission, however, will render at full width × ~1280px tall (9:16 aspect ratio scaled to 720px width = 1280px tall), dominating the entire viewport and pushing the description / decision / distribution panel below the fold by a long way. K-pop creator submissions skew heavily portrait; this is an actual usage case.
Suggested fix: Wrap video in a constrained container (e.g. `max-h-[70vh] mx-auto` with `object-contain`) so portrait videos shrink to fit viewport while still showing full frame. `<video controls className="max-h-[70vh] mx-auto block" />` is one liner.
Fix cost estimate: inline (~5min) or FU.

[FINDING 5] DIM: wording  SEVERITY: LOW
File: `messages/ko.json:2300, 2240, 2245`
Issue: Two minor copy refinements worth noting (not workflow-internal-term violations, just polish):
  - `or_separator: "또는"` is correct but reads as fully spelled out alongside flank `<hr>`s. Floral-style hr-flank "or" usually pairs better with lowercase compact text. Consider keeping `또는` (KO) but reducing to `or` for EN (already lowercase per en.json — fine, ignore EN side).
  - `add_another_cta: "다른 채널 추가"` — when `isPrimaryEmpty` (first-channel state), the button still says "다른 채널 추가" (Add another channel). This reads slightly off since there isn't a first one yet. The empty-state CTA should arguably read `채널 추가하기` and the post-first-add CTA `다른 채널 추가`. Currently the same string serves both states.
  - `edit_metric_cta: "수치 입력"` — KO label is "Enter values" (input-mode). EN is "Log metrics". Slight mismatch in tone (KO is action-imperative, EN is gerund-like). Both work; flagging only.
Suggested fix: Add an `add_first_cta` key for the empty state and conditionally select `add_first_cta` vs `add_another_cta` based on `distributions.length === 0`. The KO `또는` and `수치 입력` are fine — leave as-is or polish.
Fix cost estimate: FU (`FU-W6` — wording polish), 10min inline.

[FINDING 6] DIM: 4 (UX flow continuity)  SEVERITY: LOW
File: `src/app/[locale]/app/my-submissions/page.tsx` (no kind-guard)
Issue: A `brand` or `artist` workspace user who manually navigates to `/app/my-submissions` (the route exists for all authenticated users; only the sidebar entry is gated by `kinds: ["creator"]`) will get an empty list page with the empty-state copy "아직 보낸 응모작이 없어요. 진행 중인 캠페인을 살펴보세요." This isn't quite right — a brand user has no business being on this page at all. RLS via `applicant_workspace_id` membership makes the empty result a no-op, but the messaging implies "you should submit something" rather than "this isn't for you".
Suggested fix: Either (a) add a kind-guard in the server component that redirects non-creator workspaces to `/app/dashboard`; or (b) accept the empty-state-as-noop pattern but tweak copy when `active.kind !== "creator"` to say "이 페이지는 크리에이터 워크스페이스 전용이에요." Today the visual outcome is misleading but harmless. Consider FU.
Fix cost estimate: FU (`FU-D5` — guard or copy fork), 10min inline.

---

### Strengths (max 3 — for builder calibration)

1. **Single-source design tokens, no inline color hexes.** Across all 9 reviewed files I counted zero hardcoded hex colors, zero ad-hoc rgba()s, zero arbitrary tracking values. Every elevation uses `rounded-card` (24px) / `rounded-button` (12px) / `rounded-pill` (999px). Every sage moment uses `bg-sage` / `bg-sage-soft` / `text-sage-ink` / `accent-sage`. Every border uses `border-edge-subtle`. The `statusPillClass` helper centralizes the tone→className mapping so the K-06 LOOP-1 #6 sage-swap concern can never re-drift in another consumer. This is the kind of token discipline that compounds — every new Wave-C-level surface costs less to author from here.

2. **HIGH-6 Fraunces removal scoped surgically.** The audit doc (`_wave_c_v2_fraunces_audit.md`) categorized hits A/B/C/D before removing, the build-path Cat A/D were stripped, and Cat B (editorial marketing surfaces) + Cat C (runtime CDN OG/email) were deferred to FU-EI1 with an honest paper trail. This avoided the temptation to "while I'm here" rip out 25 marketing surfaces and trigger an editorial-identity decision that hadn't yet been made. Restraint = correct call.

3. **Status pill semantic arc + DistributionPanel CTA escalation work as one coherent system.** approved_for_distribution = loud sage pill + sage CTA in panel + "유포 채널을 등록해주세요" description copy, all simultaneously. Once the user adds a channel, status auto-flips to distributed → soft sage pill + outline CTA "다른 채널 추가" + post-distribution intro copy. The four signals move in concert. This is the design-system layer doing its job: a decision made once at `status-pill.ts` propagates visually + verbally + interactively without each consumer re-deciding. Strong K-06 outcome.

---

### Verdict

**PASS (NEEDS-MINOR).** The 6 HIGH + 9 MED inline fixes from SPEC v2 are all correctly landed at the design layer; no design-system violations; no internal-term wording leaks; no Fraunces reachability. Of 6 NEW findings: 0 HIGH, 2 MED, 4 LOW.

Recommend (a) inline FINDING 1 (locale-aware fallback link) before ff-merge, (b) FINDING 2 (operations group single-item label) inline or accepted-as-is per yagi call, (c) register FINDINGS 3-6 as FU-D4 / FU-D5 / FU-W6 polish backlog.

---

**END K-06 LOOP-1 REVIEW**

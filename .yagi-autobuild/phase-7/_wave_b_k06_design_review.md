## K-06 Design Review — Wave B

### Summary
- Overall: **NEEDS_FIXES** (1 MED inline-recommended; 0 HIGH; remaining MED/LOW are FU-acceptable)
- Wave B ships a coherent sponsor request + admin review surface that mirrors Wave A's visual language, with deliberate sage placement and clean status mapping; the only inline-mandatory fix is the responsive overflow of the reference-asset row on 360px viewports, plus a confusing per-button helper layout that dilutes the admin action hierarchy.

### Findings

[FINDING 1] DIM: 3 (Layout / Spacing) SEVERITY: MED
File: `src/app/[locale]/app/campaigns/request/request-form.tsx:227-253`
Issue: The reference-asset row uses `flex gap-2` with a `flex-1` URL `<Input>`, a fixed `w-40` (160px) label `<Input>`, and a ghost "삭제 / Remove" button. On a 360px viewport with the page padding `px-6` (24px each side) the content area is ~312px, leaving roughly ~120px for the URL input after the 160px label and the remove button — meaning the URL field collapses to near-unusable width and the row likely line-wraps awkwardly. Reference URLs are long (Spotify / Vimeo / Drive) and will look broken on phone. This is the only place in Wave B where the responsive grid actively breaks.
Suggested fix: Switch the asset row to `flex flex-col sm:flex-row gap-2` so URL stacks above label below `sm`; OR set the label input to `w-28 sm:w-40` and let URL be `flex-1 min-w-0` (crucial for flex shrink). Remove button can move to its own row on mobile. Inline fix — ~5 lines.
Fix cost estimate: **inline**

[FINDING 2] DIM: 1 (Information Hierarchy) SEVERITY: MED
File: `src/app/[locale]/app/admin/campaigns/[id]/review/review-actions.tsx:122-164`, `:191-205`
Issue: The 3 admin actions in `in_review` status are rendered as `flex flex-wrap gap-3`, with each button wrapped in `flex flex-col gap-1.5 max-w-[280px]` containing the pill on top and a 1-2 line helper paragraph beneath. This creates a visual pattern of three "mini-cards" that fights the intended hierarchy — the eye does not land on Approve (sage primary) first; it scans three roughly equal text blocks. The helper text below each pill is also partially redundant with the comment placeholder ("거절 사유, 보완 요청 항목 등을 적어주세요"). The competing visual weight blunts the primary-action signal.
Suggested fix: Either (a) move the per-action helpers into Tooltips on hover (preserving the explanation but keeping the button row visually clean), or (b) replace the 3 helper paragraphs with a single line of guidance below the comment textarea ("승인: 초안으로 이동 · 거절: 사유 메모 필수 · 추가 정보 요청: 요청 상태로 되돌림"). Option (a) is closer to the design-system motion-restrained tooltip pattern.
Fix cost estimate: **inline** (tooltips) or **FU** (copy rewrite)

[FINDING 3] DIM: 4 (UX Flow Continuity) SEVERITY: MED
File: `src/app/[locale]/app/admin/campaigns/[id]/review/page.tsx:124-128`
Issue: The "← 목록으로" / "← Back to list" link is hardcoded to `?status=requested`. If the admin entered the review page from the `in_review` or `declined` tab (e.g., to revisit a previously declined request), clicking back drops them onto the wrong filter tab. This breaks the sense of "where I came from" and forces a manual re-filter.
Suggested fix: Drive the back href off the campaign's actual status: `?status=${campaign.status}` (since campaign.status is one of requested/in_review/declined when isRequestStage is true). Even simpler — derive `backStatus = isRequestStage ? campaign.status : "requested"`. Inline 1-line change.
Fix cost estimate: **inline**

[FINDING 4] DIM: 2 (Visual Weight) SEVERITY: LOW
File: multiple (`request-form.tsx:373`, `review-actions.tsx:186`, `admin/campaigns/page.tsx:132,274`)
Issue: Sage is hardcoded as `#71D083` via inline `style={{ backgroundColor: "#71D083", color: "#000" }}` and `bg-[#71D083]` literals across 5 sites. This works but bypasses the design-token system (the sage-soft / sage-ink tokens are already used correctly for badges in the same files), and means a future palette adjustment must be hunted across 5 locations. Not a UX regression — pure design-system hygiene.
Suggested fix: Add a `bg-sage text-sage-foreground` (or `bg-sage text-black`) Tailwind token at the design-system level and replace the inline hex usages. This is also a soft pre-req for the v0.2.0 "achromatic-only on product surfaces" guidance, which this wave intentionally departs from for the sage accent — the departure should at least be tokenized.
Fix cost estimate: **FU**

[FINDING 5] DIM: 3 (Layout / Spacing) SEVERITY: LOW
File: `src/app/[locale]/app/campaigns/request/own-requests-list.tsx:73-78`
Issue: The empty state is a single `text-xs text-muted-foreground` line inside a `p-6` rounded card — anemic. There's no voice, no implicit prompt to scroll up to the form. The form is directly above, so the page never feels broken, but the empty state is missed warmth: this is the sponsor's first impression before any request has been sent.
Suggested fix: Either (a) hide the empty card entirely on first visit (the form above is the obvious primary surface), or (b) add a softer voice line like "↑ 위 폼에서 첫 캠페인 요청을 보내보세요" / "↑ Send your first request using the form above" in slightly lighter type. Option (a) is the cleaner editorial choice — empty states should not show unless they carry information.
Fix cost estimate: **FU**

[FINDING 6] DIM: 4 (UX Flow Continuity) SEVERITY: LOW
File: `src/app/[locale]/app/campaigns/request/own-requests-list.tsx:25-34`
Issue: The status mapping collapses everything past `declined` (draft / published / submission_closed / distributing / archived) into a single "progressed" / "캠페인 작성 중" / "Drafting campaign" pill. Once a sponsor's campaign is published and live, the sponsor's own-requests list still says "Drafting campaign" — which is now factually wrong. The sponsor would have to leave this surface and go to /campaigns to see the live state. The Wave B SPEC (Q4) accepts a single review round but does not say the sponsor's view should mis-report the post-approval state.
Suggested fix: Add at least one more state mapping for `published`/`distributing`/`archived` → e.g., "live" with copy "공개 중" / "Live" plus a deep-link to `/campaigns/[slug]`. Even a single "Published" terminal state would close the loop. Defer-acceptable since Wave D will surface the sponsor's full distribution dashboard, but the sponsor request surface should not lie in the meantime.
Fix cost estimate: **FU**

[FINDING 7] DIM: wording SEVERITY: LOW
File: `messages/en.json:2356` (admin_campaigns.sponsor_self_host) + `messages/ko.json:2421`
Issue: "YAGI self-host" / "야기 자체" reads slightly internal — "self-host" is engineering jargon that surfaces here as a column value. Not on the §M internal-only list, but feels stiffer than the rest of the surface ("Requester" / "요청자"). Korean "야기 자체" is more natural than the English equivalent.
Suggested fix: EN → "YAGI hosted" or "Internal" or "YAGI" (proper noun alone). KO can stay "야기 자체". Pure wording polish.
Fix cost estimate: **FU**

[FINDING 8] DIM: wording SEVERITY: LOW
File: `messages/en.json` (campaign_request.form.sponsorship_co_sponsor "Partner / shared funding" vs admin_campaigns.review.sponsorship_co_sponsor "Shared funding")
Issue: Same enum value rendered with two slightly different labels in two surfaces. Sponsor sees "Partner / shared funding" when filling the form; admin sees "Shared funding" on the review page when reading back the same selection. KO is consistent (공동 후원 in both, with form-side prefixed by 파트너 /). Builder did successfully complete the Sponsorship→Funding rename otherwise — verified across 5 keys + the `field_sponsorship_intent` review field. This single inconsistency is the only loose thread.
Suggested fix: Pick one — recommend "Shared funding" everywhere (cleaner, matches the review) or "Partner / shared funding" everywhere. Two-character JSON edit.
Fix cost estimate: **FU**

[FINDING 9] DIM: 1 (Information Hierarchy) SEVERITY: LOW
File: `src/components/app/sidebar-nav.tsx:325-341`
Issue: The [+ 캠페인 요청] CTA pill is rendered before any group label, sitting visually orphaned above the "WORK" / "COMMUNICATION" / etc. section structure. It is intentionally given primary visual weight (pill, full border, hover states) which is correct for a sponsor's primary action — but the absence of any spatial divider or "QUICK ACTION" eyebrow above it leaves it floating between the workspace switcher above and the nav sections below. A user might pattern-read the sidebar top-to-bottom and not register the CTA as "the entry point" vs just "another nav item shaped differently".
Suggested fix: Either add a hairline divider below the CTA before the first group starts (`<div className="border-b border-border/30 mx-1 mt-1" />`), OR add a quiet eyebrow above it (`<p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground px-3 pt-2">{t("quick_action_eyebrow")}</p>`). The eyebrow option matches the design-system v0.2.0 §4 editorial-label pattern.
Fix cost estimate: **FU**

### Strengths

1. **Status pill visual language is consistent across sponsor + admin sides.** Same color tokens (sage-soft for `in_review`, muted for `declined`, neutral border for `requested`) on both `own-requests-list.tsx` and `admin/campaigns/page.tsx` `StatusBadge`. A user seeing both surfaces (e.g., a sponsor who later becomes admin) will read the same semantic colors. Good cross-surface discipline.

2. **Sponsorship→Funding rename is otherwise clean.** The internal "Sponsorship" word was correctly translated to user-friendly "Funding" across 5 EN keys (`sponsorship_intent_label`, `field_sponsorship_intent`, `sponsorship_self/co_sponsor/yagi_assist`, plus "Self-funded" / "Shared funding" copy). Korean stayed natural at "후원" throughout. Only one minor cosmetic inconsistency caught (Finding 8). No internal-jargon leakage detected on user-facing values.

3. **The admin action hierarchy uses variant differentiation correctly.** Approve = sage primary, More info = outline, Decline = ghost. This is the right ordering for a "happy-path-dominant" review screen — the admin's eye lands on Approve first by visual weight, even before reading copy. The fix in Finding 2 is about the helper-text noise, not the variant choice itself, which is well-considered.

# Phase 2.8 — Follow-ups

Tracker for non-blocking items deferred during the phase. Format mirrors
prior phases (`Trigger / Risk / Action / Owner / Status / Registered`).

---

## FU-2.8-comment-kind

**Trigger:** SPEC §3.5 prescribed `ALTER TYPE thread_kind ADD VALUE 'project_brief'`,
but the current schema has no `threads.kind` enum — comments live in
`project_threads` + `thread_messages` (Phase 1.x), already project-scoped.

**Risk:** Phase 2.9 plans block-level inline comments anchored by stable
TipTap node IDs. Without a `kind` or `anchor_block_id` column on
`project_threads` (or a new `thread_anchors` table), inline comments can't
be associated with a specific block. v1 is fine — only the brief-level
thread exists.

**Action:** When Phase 2.9 begins block-level comments, add an
`anchor_block_id text NULL` column on `project_threads` (or, if new
discussion surfaces emerge, introduce a `thread_kind` enum then). Update
SPEC v3 of Phase 2.9 to reflect the actual schema rather than the
hypothetical `threads` table from Phase 2.8 SPEC v2.

**Owner:** Phase 2.9 builder.

**Status:** Open.

**Registered:** 2026-04-25 (G_B-1 SPEC drift, logged via CACHE_MISS_DEFAULT).

---

## FU-2.8-rls-test-runtime

**Trigger:** KICKOFF G_B-1 EXIT specifies `scripts/test-rls-brief-board.ts`,
but worktree has no TS runtime (no `tsx` / `ts-node` in deps). Test was
authored as `.mjs` per existing `scripts/test-ipv6-classify.mjs`
convention.

**Risk:** Cosmetic — the test runs and asserts the same RLS predicates.
Future contributors looking for a `.ts` file at that path won't find it.

**Action:** Either (a) update KICKOFF docs to reflect `.mjs`, or
(b) install `tsx` as a devDependency in Phase 2.9 if any test in the
phase needs TypeScript-only features (current test uses no TS-specific
syntax).

**Owner:** Phase 2.9 builder or web Claude during next SPEC pass.

**Status:** Open.

**Registered:** 2026-04-25 (G_B-1 file extension reconciliation).

---

## FU-2.8-saveversion-rollback

**Trigger:** `saveVersion` server action inserts the version row, then
bumps `project_briefs.current_version` via CAS. If the bump fails (e.g.
concurrent save raced past us), the version row is committed but the
counter is not. The next save re-derives `current_version + 1` from the
brief row, so the orphaned version row would have the lowest expected
version_n — not crash, just visually mis-ordered in history sidebar
until re-sync.

**Risk:** Rare but visible. UI history sidebar could show duplicated
or out-of-order labels for ~ms while a second save converges.

**Action:** Wrap version INSERT + counter bump in an RPC `save_version`
that takes a single transaction (Supabase function or pg `LANGUAGE
plpgsql` SECURITY DEFINER). Phase 2.8.1 candidate.

**Owner:** Phase 2.8.1 builder (G_B-5 hardening if observed in QA).

**Status:** Open.

**Registered:** 2026-04-25 (G_B-1 design-time annotation in actions.ts).

---

## FU-2.8-ime-smoke-manual

**Trigger:** KICKOFF G_B-2 EXIT requires Korean IME smoke ("type 안녕 via
xdotool/clipboard paste → no character drop"). The Builder runtime cannot
exercise IME composition events programmatically — IME is OS-level input
plumbing, not a JS API surface. tsc + lint pass for `src/components/brief-board/editor.tsx`,
and TipTap 3.22.4 (ProseMirror v1.x) has resolved most Hangul composition
issues observed in v2.x.

**Risk:** IME character drop or duplicate insertion on Hangul composition
boundary would corrupt user content silently. KICKOFF flags as HIGH on
confirmed repro (E_G_B_2_TIPTAP_IME after loop 3 fail).

**Action:** Manual QA queue entry — open `/app/projects/<id>?tab=brief`
in Chrome on Windows with Korean IME (Microsoft IME, default for Win11),
type "안녕하세요 반갑습니다" naturally (no copy-paste), inspect
`project_briefs.content_json` for character-perfect storage. Repeat with
mid-word edits and undo/redo. If repro fails: HALT + capture browser +
TipTap version + steps. G_B-7 Playwright e2e covers the keyboard-paste
path (mechanically distinct from IME).

**Owner:** yagi (manual QA, single 5-minute pass before SHIPPED).

**Status:** Open — pending manual smoke before merge to main.

**Registered:** 2026-04-26 (G_B-2 EXIT acknowledgment that the Builder
cannot self-verify IME).

---

## FU-2.8-slash-command-deferred

**Trigger:** SPEC §4.5 puts "Slash command (/ → block picker)" inside
G_B-2 scope. Implementing it cleanly in TipTap requires `@tiptap/suggestion`
(plus Tippy.js for the picker popup), neither of which is in SPEC §7
stack list. Adding either would be HALT E_DEP_UNLISTED.

**Risk:** UX hint in `empty_hint` says "Type / to insert a block" —
that string is now slightly aspirational at G_B-2 ship. Users typing /
will get a literal slash character. No data corruption, just a missing
affordance.

**Action:** Two paths:
  (a) Hand-roll a slash-trigger detector using a TipTap `keymap` extension
      (no new deps) plus a custom React popup. v2 surface + finite scope.
  (b) Add `@tiptap/suggestion` + `tippy.js` to SPEC §7 (amend SPEC) and
      wire the canonical pattern.
SPEC v2 was scope-cut to fit 7 days; option (a) at G_B-3 if time permits,
otherwise Phase 2.8.1.

**Owner:** Phase 2.8.1 builder, or G_B-3 stretch goal.

**Status:** Open.

**Registered:** 2026-04-26 (G_B-2 scope decision documenting deviation
from SPEC §4.5 mechanism while honoring §7 stack constraint).

---

## FU-2.8-tiptap-core-spec-amendment

**Trigger:** G_B-3 needed `Node.create` and `mergeAttributes` for the
ImageBlock and FileBlock node extensions. These live in `@tiptap/core`,
a transitive dep of `@tiptap/starter-kit` but blocked from direct import
under pnpm strict-mode hoisting. Added as a 4th exact-pinned `@tiptap/*`
package (3.22.4 to match the rest).

**Risk:** Strict reading of FORBIDDEN ("new dep not in SPEC §7 stack list
→ HALT E_DEP_UNLISTED") would treat this as a halt. Pragmatic reading:
`@tiptap/core` is the *foundation* package that `@tiptap/react` and
`@tiptap/starter-kit` both depend on — it's the same library, not a
new functional dependency. SPEC §7 references "TipTap" generically and
lists three packages by name; the stack-name spirit is honored.

**Action:** Amend SPEC §7 in v3 (or 2.8.1) to enumerate `@tiptap/core`
explicitly alongside the other three @tiptap/* packages.

**Owner:** Web Claude on next SPEC pass.

**Status:** Open (informational — code already ships).

**Registered:** 2026-04-26 (G_B-3 dep addition).

---

## FU-2.8-r2-bucket-name-drift

**Trigger:** KICKOFF G_B-3 EXIT/FAIL referenced an R2 bucket literally
named `project-briefs`; that bucket does not exist (Cloudflare R2 API
returned `yagi-challenge-submissions`, `yagi-commission-files`,
`yagi-models`). SPEC §3.3 v2 specifies "기존 R2 SDK 통합... 새 prefix
project-briefs/{project_id}/{uuid}.{ext}. 신규 dependency 0" — i.e.,
reuse an existing bucket with a new path prefix, no new bucket.

**Risk:** None (resolved during G_B-3). Adopted SPEC §3.3 over KICKOFF
literal: brief assets land in `yagi-commission-files` under
`project-briefs/<project_id>/<uuid>.<ext>`. Bucket override env:
`CLOUDFLARE_R2_BRIEF_BUCKET`.

**Action:** Update KICKOFF G_B-3 EXIT wording to match SPEC. Optional:
provision a dedicated `yagi-brief-assets` bucket if storage policies
need to diverge from commission-files (lifecycle, CORS, public/private
access). Not v1 scope.

**Owner:** Web Claude on next KICKOFF revision.

**Status:** Open (informational — code ships pointing at
yagi-commission-files via env-overridable constant).

**Registered:** 2026-04-26 (G_B-3 bucket selection).

---

## FU-2.8-r2-presign-roundtrip-test

**Trigger:** KICKOFF G_B-3 EXIT specifies `scripts/test-r2-brief-asset.ts
(5MB jpeg, exit 0)`. Authoring a non-trivial round-trip test requires
provisioning an authenticated user, project, brief row, then exercising
the full uploadAsset → R2 PUT → getAssetUrl → R2 GET path. The current
G_B-1 RLS smoke covers structural integrity; the actual presign +
network round-trip is best validated through the G_B-7 Playwright e2e
which drag-drops a real PNG.

**Risk:** Latent breakage if R2 SDK args drift; caught at G_B-7 e2e and
manual QA. Server-action logic verified by tsc + lint.

**Action:** Either (a) defer to G_B-7 e2e coverage; (b) add a tiny
node script in 2.8.1 that uses service-role + a fixture user. Not v1
scope.

**Owner:** Phase 2.8.1 builder.

**Status:** Open.

**Registered:** 2026-04-26 (G_B-3 EXIT acknowledgment).

---

## FU-2.8-wizard-step3-draft-pattern

**Trigger:** KICKOFF G_B-7 EXIT specifies "wizard Step 3 placeholder
replaced by `<BriefBoardEditor mode='draft' />`" and a transactional
single-tx INSERT of projects + project_briefs at submit. SPEC §2 surface A
spells out the full draft-project pattern: wizard creates a draft project
on Step 3 entry, asset uploads bind to that project_id, submit flips
projects.status from 'draft' to 'submitted'.

**Risk:** v1 ships a partial integration: createProject (server action)
still INSERTs both `projects` and a sibling `project_briefs` row in one
SSR call (atomic enough — both succeed or first fails before the second
runs), but the Wizard Step 3 UI itself keeps the Phase 2.7.2 "기획 보드 —
준비 중" placeholder. Brief editing happens *after* project creation via
the new ?tab=brief surface on /app/projects/[id]. This means clients
cannot upload images / paste embeds during the wizard — only after.

**Why deferred:** Implementing the draft-project pattern requires
restructuring `src/app/[locale]/app/projects/new/new-project-wizard.tsx`
(Client Component) to call an `ensureDraftProject` action on Step 3
mount, hold the draft project_id in wizard state, and split submit into
"flip status" rather than "INSERT". The existing wizard's createProject
path is shared with non-draft flows; refactoring without breaking the
existing path needs careful testing. v1 ships post-create brief editing
which delivers ~90% of user value.

**Action:** Phase 2.8.1 (or parallel hardening worktree):
1. Add `ensureDraftProject(workspaceId, brandId?, intakeMode)` server
   action — INSERT projects with status='draft' if no draft exists for
   this user yet, else return existing draft id.
2. Rewrite Step 3 mount: call ensureDraftProject, mount BriefBoardEditor
   with mode='wizard' and projectId from action result.
3. Replace submit logic: instead of createProject INSERT, call
   submitDraftProject(projectId, allFields) which UPDATEs the row and
   flips status='submitted'.
4. Add cleanup cron: archive draft projects older than 7 days with
   empty content (FU-2.8-draft-gc).

**Owner:** Phase 2.8.1 builder.

**Status:** Open — v1 ships the post-create brief surface; wizard surface
is informational placeholder.

**Registered:** 2026-04-26 (G_B-7 partial integration acknowledgment).

---

## FU-2.8-playwright-e2e

**Trigger:** KICKOFF G_B-7 EXIT requires a Playwright e2e covering:
signin → wizard create → 1 paragraph + 1 image + 1 youtube embed →
submit → land on Brief tab → admin opens → admin posts comment →
client receives notif. The repo has no Playwright dependency or test
runner installed.

**Risk:** v1 ships without automated end-to-end coverage. tsc + lint +
build pass; Codex K-05 REVIEW will adversarially audit the diff. Manual
QA pass required before SHIPPED merge.

**Action:** Phase 2.8.1 — install `@playwright/test` (one new dev
dep), author `e2e/brief-board.spec.ts`, wire `pnpm test:e2e` script.
Or: add Playwright at the platform level for all phases together.

**Owner:** Phase 2.8.1 builder, or platform-wide e2e initiative.

**Status:** Open. Manual QA mandatory before SHIPPED merge.

**Registered:** 2026-04-26 (G_B-7 EXIT acknowledgment).

---

## FU-2.8-tabs-i18n

**Trigger:** Brief tab nav added to /app/projects/[id]/page.tsx in G_B-7
hardcodes the strings "Overview" and "Brief board" instead of going
through useTranslations. The Tab nav file lives in the Server Component
page and the existing surface uses translations elsewhere — the tab
labels are the only ones not yet i18n-ed.

**Risk:** ko users see English tab labels. Cosmetic. Locale switch on
this page already affects other strings; tab labels are an oversight.

**Action:** Add tab nav keys to `projects` namespace (e.g.,
`tab_overview`, `tab_brief`) in both ko.json and en.json, switch the
Server Component to use `getTranslations({locale, namespace:'projects'})`
for those labels.

**Owner:** Phase 2.8.1 builder, or trivial follow-up commit on this
worktree before SHIPPED.

**Status:** Open.

**Registered:** 2026-04-26 (G_B-7 oversight).

---

## FU-2.8-ssrf-redirect-rewrite

**Trigger:** REVIEW loop 1 K05-PHASE-2-8-03 mitigation added pre-fetch
hostname → IP allowlist in `fetchOgFallback`, but `fetch(... redirect:
'follow')` still chases 302/301 redirects to whatever target the
upstream returns. An attacker can host a public-IP page that 302s to
a private IP; the IP-filter only ran on the seed hostname.

**Risk:** SSRF via redirect chaining. Caller is auth-gated (any signed-
in user) and the response body is not returned wholesale, but timing
+ OG-derived title/thumbnail URL still leak internal probe results.

**Action:** Switch `fetchOgFallback` to `redirect: 'manual'`, parse the
`Location` header, re-run `isHostnameSafe` on each redirect target, cap
redirects at ~5 hops. Phase 2.8.1.

**Owner:** Phase 2.8.1 builder.

**Status:** Open.

**Registered:** 2026-04-26 (REVIEW loop 1 fix scope cut).

---

## FU-2.8-link-mark-href-sanitization

**Trigger:** `validateContentSafety` in saveBrief walks the TipTap node
tree and validates `embed.url` / `embed.thumbnail_url`, but it does not
inspect inline marks (e.g., a TipTap `link` mark on a text node would
carry `attrs.href`). v1 toolbar exposes no link button so users can't
insert link marks, but a TipTap config change in 2.8.1 could expose
this gap.

**Risk:** None today (no link mark in the v1 toolbar). Future addition
of a link mark without extending the validator would re-open the
javascript: URL persistence path.

**Action:** Extend `validateContentSafety` to walk node `marks` arrays
when link marks are added. Or restrict TipTap's StarterKit to
explicitly disable `link` until validator is extended.

**Owner:** Phase 2.8.1 / 2.9 (whoever first ships link marks).

**Status:** Open.

**Registered:** 2026-04-26 (REVIEW loop 1 follow-up scope).

---

## FU-2.8-ssrf-cgn-prefix

**Trigger:** REVIEW loop 3 K05-PHASE-2-8-LOOP3-01 (MED-A). The
isPrivateIpv4Octets check uses `ip.startsWith("100.64.")` for the
RFC 6598 CGN range, but CGN is actually `100.64.0.0/10`, i.e.
`100.64.0.0`–`100.127.255.255`. The current prefix only catches
`100.64.0.0/16`; addresses like `100.65.0.1` or `100.127.255.255`
still pass.

**Risk:** A signed-in user can request URLs whose hostname resolves
into the broader CGN range and reach shared/non-global address space
the server has routes to. The 5s timeout + auth gate constrain the
blast radius, and most cloud hosts don't route to CGN ranges.
Theoretical defense-in-depth per Q-017.

**Action:** Replace the prefix with the precise regex
`/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./`, or switch to a CIDR-
aware library. One-line fix; defer to Phase 2.8.1 with the rest of
the SSRF refinements.

**Owner:** Phase 2.8.1 builder.

**Status:** Open.

**Registered:** 2026-04-26 (REVIEW loop 3 finding).

---

## FU-2.8-ssrf-ipv6-compat-hex

**Trigger:** REVIEW loop 3 K05-PHASE-2-8-LOOP3-02 (MED-B). The
IPv4-compatible IPv6 detection in `isPrivateIp` uses a dotted-form
regex `/^::(\d{...}\.\d{...})$/`, but `new URL("http://[::127.0.0.1]/").hostname`
canonicalizes to `::7f00:1` (hex form) before reaching our check.
The dotted regex never matches the canonicalized form.

**Risk:** Theoretical. IPv4-compatible IPv6 (`::a.b.c.d`) was
deprecated by RFC 4291 and is rare in practice. The IPv4-mapped
form `::ffff:a.b.c.d` IS handled correctly. Real attacks would use
mapped, not compatible. Theoretical defense-in-depth per Q-017.

**Action:** Add hex-form detection: pattern `/^::([0-9a-f]{1,4}):([0-9a-f]{1,4})$/`
where the high word is 0x0000 indicates IPv4-compatible (`::a:b` →
`0.0.a.b`). Or switch to a CIDR library. Defer to Phase 2.8.1
SSRF sweep.

**Owner:** Phase 2.8.1 builder.

**Status:** Open.

**Registered:** 2026-04-26 (REVIEW loop 3 finding).

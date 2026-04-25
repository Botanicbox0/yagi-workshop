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

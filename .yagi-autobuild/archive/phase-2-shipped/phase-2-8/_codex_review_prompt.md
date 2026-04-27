<task>
Phase 2.8 G_B (Brief Board) is being reviewed at the REVIEW state of
the gate state machine — final adversarial pass before merge to main.
The migration was reviewed and patched at G_B_1 (loop1 → loop2 = CLEAN);
this review covers G_B_2..G_B_7: TipTap editor wiring, R2 asset upload
actions, oEmbed proxy + cache, version-history UX, comment panel +
lock + YAGI request, brief tab on /app/projects/[id], and the
createProject sibling brief insert.

Source-of-truth:
  .yagi-autobuild/phase-2-8/SPEC.md (vision)
  .yagi-autobuild/phase-2-8/KICKOFF_PROMPT.md (state machine + scope)
  .yagi-autobuild/codex-review-protocol.md (review gate)

Branch: g-b-brief-board (worktree of main, 7 commits since 5bb0a57).

Files changed (high level):
  src/app/[locale]/app/projects/[id]/brief/actions.ts  (server actions)
  src/app/[locale]/app/projects/[id]/page.tsx          (brief tab integration)
  src/app/[locale]/app/projects/new/actions.ts         (project + brief sibling INSERT)
  src/components/brief-board/editor.tsx                 (TipTap editor + auto-save + drop/paste)
  src/components/brief-board/blocks/{image,file,embed}-block.tsx
  src/components/brief-board/{version-history,comment-panel,lock-button,yagi-request-modal}.tsx
  src/lib/brief-board/resize-image.ts
  src/lib/r2/client.ts                                 (BRIEF_BUCKET helpers)
  messages/{ko,en}.json                                (brief_board namespace)
  scripts/test-rls-brief-board.mjs                     (structural smoke)
</task>

<focus_areas>
1. Auto-save concurrency (saveBrief)
   - If-Match-Updated-At pattern in saveBrief: CAS read + check + UPDATE
     with `.eq("updated_at", ifMatchUpdatedAt)`. Postgres updated_at is
     timestamptz with microsecond precision. Is there any drift / cast
     edge where the Date#toISOString round-trip differs from what the
     CAS guard expects?
   - inFlightRef gating in editor.tsx prevents concurrent saves but
     means the *latest* keystrokes within a save window need a
     re-trigger to land. Is the on-Update path guaranteed to fire
     again after inFlightRef releases, or can we drop content?

2. Optimistic concurrency vs lock flip
   - validate_project_brief_change trigger forbids non-yagi status flips
     and validates current_version = OLD+1 with matching versions row.
     A workspace member running a saveVersion while a yagi_admin
     concurrently locks: who wins? The version_insert trigger has
     FOR UPDATE on project_briefs (SELECT lock); the yagi_admin lock
     UPDATE waits till the version insert commits. Is the resulting
     ordering safe (no orphaned-locked-version)?

3. SSRF / abuse via fetchEmbed
   - resolveEmbed fetches arbitrary user URLs server-side for OG
     parsing. AbortSignal.timeout(5000), redirect:'follow', no
     ip-allowlist filter. Auth-gated to authenticated users — i.e.,
     any signed-in user can probe internal IPs (fly.io / vercel
     internal services / localhost / 169.254.169.254). Is this an
     SSRF risk we should mitigate now, or is it acceptable v1
     given auth gate + 5s timeout + no body returned to client
     (only title + thumbnail URL string)?

4. embed_cache poisoning
   - Server-action upserts via service_role with response_json from
     unconstrained external response. Could a malicious page set
     og:image to a javascript: URL that the EmbedFallback then
     renders as <img src=...>? React escapes attributes, so
     javascript: in src is rendered as a literal string and
     browsers ignore it for img elements; verify this is actually
     what happens for images, and confirm the Generic OG fallback
     (which DOES render the URL as an `<a href>`) is also safe
     against javascript: (target='_blank' rel='noopener noreferrer'
     mitigates some but not URL scheme).

5. iframe sandbox completeness
   - YouTube: sandbox="allow-scripts allow-same-origin allow-presentation",
     allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
   - Vimeo: sandbox="allow-scripts allow-same-origin",
     allow="autoplay; fullscreen; picture-in-picture"
   - Are these strict enough, or do they allow third-party trackers
     to read parent-window cookies / localStorage via allow-same-origin
     in combination with allow-scripts? (Standard pattern, but note
     YT/Vimeo iframes can run analytics with these flags.)
   - The video ID extraction regexes are reused identically on server
     (actions.ts) and client (embed-block.tsx). Any regex difference
     could cause server to return provider='youtube' but client to
     fall through to EmbedFallback. Are the regexes byte-identical?

6. uploadAsset and R2 presigning
   - INSERT-then-presign sequence: a presign failure rolls back the
     metadata row. Is that DELETE itself subject to RLS? It uses the
     same SSR client; the project_brief_assets_delete policy allows
     uploaded_by=auth.uid() — this should always match because we
     just INSERT'd the row with uploaded_by=user.id. Confirm.
   - Storage key format `project-briefs/{projectId}/{uuid}.{ext}` —
     attacker control over filename → control over the trailing
     extension. safeExtFromFilename caps to /^[a-z0-9]{1,8}$/. Are
     there extensions outside this set that we should explicitly
     allow (heic, mov, mkv) or exclude (php, exe, html)?
   - Content-Type passed as the original mime — no allowlist. Could
     an attacker upload an HTML file with text/html content type and
     have R2 serve it inline as a same-origin script if served from
     a custom domain? (R2 bucket serving is typically same-origin
     only via signed URLs which run from R2's domain, not ours; but
     verify the BRIEF_BUCKET=yagi-commission-files bucket isn't
     mapped to a yagi-owned subdomain that would inherit cookies.)

7. Brief tab page authorization
   - The brief tab branch (page.tsx around the activeTab='brief'
     conditional) reads project_briefs / project_brief_versions /
     project_brief_assets via the SSR Supabase client. RLS gates
     these; .maybeSingle returns null for unauthorized — but the
     code falls back to EMPTY_DOC and continues rendering. A user
     who is NOT a project member but visits ?tab=brief on a project
     they don't own — what do they see?
     (Earlier in the function: `if (projectErr || !projectRaw)
     notFound();` — this catches non-members at the project level,
     so the brief branch is unreachable for non-members. Verify.)

8. requestYagiProposal fan-out
   - Service-role INSERT into notification_events for every yagi_admin.
     payload contains user-supplied goal text — stored as JSON, so
     downstream rendering (notification bell, email body) needs to
     escape it. Is there a known XSS path through Phase 1.8's
     notification rendering pipeline? (Out of scope to fix in this
     phase, but flag if obvious.)
   - The action allows ANY authenticated workspace member to fire
     these notifications, repeatedly. No rate limit. A malicious
     member could spam yagi admins. Is this an MVP-acceptable risk
     given small admin team + manual moderation, or should we add
     a simple per-user-per-project debounce?

9. Drop handler resilience
   - editor.tsx handleFilesUpload runs serially per file. If one PUT
     fails midway, subsequent files still attempt — fine. But the
     inFlightRef autosave gate is independent — does a long upload
     (e.g., 200MB file uploading at 5MB/s = 40s) block autosave?
     Looking at flushSave's `inFlightRef.current` only tracks
     saveBrief calls, not uploads. Verify there's no shared lock
     that wedges autosave.

10. Type-system holes
    - Several `as unknown as Json` and `as Type` casts in actions.ts.
      Each one bypasses type-checking. Are any of them masking a
      real type mismatch that could break at runtime?

For each finding, use the severity taxonomy:
  HIGH-A: cross-tenant leak | auth bypass | privesc | RCE (today)
  HIGH-B: auth ok but logic flaw with significant impact
  HIGH-C: input validation gap with app-layer guard already in place
  MED-A : auto-fixable medium (CHECK constraint, mime allowlist, etc.)
  MED-B : defensible default, future tightening candidate
  LOW-A : convention/style drift
  LOW-C : theoretical defense-in-depth, defer-to-2.8.1
</focus_areas>

<already_deferred>
Do NOT re-flag the following — these are documented FOLLOWUPS and
intentional v1 scope:

- FU-2.8-comment-kind: SPEC §3.5 directs threads.kind enum extension;
  no such schema exists. Reuse project_threads unchanged for v1.
- FU-2.8-rls-test-runtime: scripts/test-rls-brief-board.mjs (not .ts)
  per existing scripts/ convention; structural smoke runs via service
  role only. Cross-identity RLS exercise deferred (would need
  exec_sql_text RPC backdoor).
- FU-2.8-saveversion-rollback: rare orphan version-row case if the
  current_version bump fails after the version INSERT. Documented;
  Phase 2.8.1 will wrap the two writes in a single SECURITY DEFINER
  RPC.
- FU-2.8-r2-bucket-name-drift: KICKOFF mentioned literal `project-briefs`
  bucket; SPEC §3.3 says reuse existing bucket with prefix. Adopted
  SPEC -> yagi-commission-files. Env override:
  CLOUDFLARE_R2_BRIEF_BUCKET.
- FU-2.8-r2-presign-roundtrip-test: KICKOFF requires test-r2-brief-asset.ts;
  deferred to G_B-7 e2e or 2.8.1.
- FU-2.8-tiptap-core-spec-amendment: added @tiptap/core 3.22.4 as a 4th
  exact-pinned tiptap pkg; foundation pkg already a transitive dep
  via starter-kit.
- FU-2.8-slash-command-deferred: SPEC §4.5 slash command needs
  @tiptap/suggestion + tippy.js (not in SPEC §7); UX hint string
  promises slash-command but block insertion happens via drag-drop
  / paste in v1.
- FU-2.8-ime-smoke-manual: Korean IME composition correctness can't be
  exercised by Builder; queued for manual QA pre-ship.
- FU-2.8-wizard-step3-draft-pattern: wizard Step 3 keeps Phase 2.7.2
  placeholder; brief editing happens post-create at ?tab=brief.
- FU-2.8-playwright-e2e: no Playwright in repo; manual QA pre-ship.
- FU-2.8-tabs-i18n: tab labels "Overview" / "Brief board" hardcoded
  pending `projects.tab_*` keys.
</already_deferred>

<grounding_rules>
- Cite file + line for every finding. Quote the offending source inline.
- Distinguish "exploitable today" from "theoretical defense-in-depth".
  Exploitable today = HIGH-A or HIGH-B; theoretical = HIGH-C/MED/LOW.
- Per Q-017: theoretical defense-in-depth defers to Phase 2.6 sweep
  unless app-layer guard demonstrably absent.
- yagi_admin is globally trusted; flag only if non-admin can escalate.
</grounding_rules>

<structured_output_contract>
Output exactly:

VERDICT: CLEAN | MEDIUM_ONLY | NEEDS_FIX

If NEEDS_FIX or MEDIUM_ONLY, list each finding as:

----
ID: K05-PHASE-2-8-NN
SEVERITY: HIGH-A | HIGH-B | HIGH-C | MED-A | MED-B | LOW-A | LOW-C
LOCATION: file:line range
QUOTE:
  2-6 lines of source
EXPLOIT:
  1-3 sentences, concrete attack path or "theoretical"
FIX:
  1-3 sentences, concrete patch sketch
----

End with:
SUMMARY: one sentence
</structured_output_contract>

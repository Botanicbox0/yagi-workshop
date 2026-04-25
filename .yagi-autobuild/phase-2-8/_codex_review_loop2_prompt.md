<task>
Phase 2.8 G_B (Brief Board) — REVIEW loop 2.

Loop 1 returned VERDICT=NEEDS_FIX with 4 findings (K05-PHASE-2-8-01..04).
The four fixes have been applied inline; this is the verification pass.

Patches applied:

K05-01 HIGH-B (autosave drop):
  src/components/brief-board/editor.tsx — added dirtyDuringInFlightRef +
  pendingDocRef. flushSave now captures the latest doc when called while
  inFlightRef is set, and drains the pending doc at every terminal path
  (success + caught error + each switch error branch). Drain logic is
  inlined into flushSave (not a separate useCallback) to avoid
  React-hook-deps cycles.

K05-02 HIGH-B (unsafe URL persistence):
  src/app/[locale]/app/projects/[id]/brief/actions.ts — added
  validateContentSafety() walker invoked from saveBrief before the DB
  UPDATE. Walks the TipTap doc, rejects any embed node whose attrs.url
  or attrs.thumbnail_url is not a literal http(s) URL, and rejects
  unknown providers. Returns validation error with reason path.
  src/components/brief-board/blocks/embed-block.tsx — defensive
  client-side check in EmbedFallback: if !/^https?:\/\//i.test(url),
  render "unsafe URL hidden" instead of an <a href>.

K05-03 MED-A (SSRF via fetchEmbed generic OG):
  src/app/[locale]/app/projects/[id]/brief/actions.ts — added
  isHostnameSafe() helper. fetchOgFallback now resolves the hostname
  via node:dns/promises lookup (all=true, both families), checks each
  resolved IP against private/loopback/link-local/ULA ranges, and
  bails before fetch if any fall in those. Also rejects literal
  localhost / .local / .internal hostnames. Note: redirect-time
  re-check is NOT implemented; redirect:'follow' can still chase a
  302 to a private IP. That's a known v1 gap (logged in
  FOLLOWUPS as the redirect rewrite path).

K05-04 MED-A (non-atomic project + brief INSERT):
  src/app/[locale]/app/projects/new/actions.ts — brief INSERT failure
  now triggers a rollback DELETE of the project. createProject returns
  { error: 'db', message: ... } if either write fails, ensuring no
  orphan project remains.

Re-review the patched diff. Confirm each finding is addressed, and
check for new regressions:

  - The autosave drain runs inline in flushSave at three terminal
    paths. Verify there's no path where dirtyDuringInFlightRef is
    set but never drained.
  - validateContentSafety walks recursively but does not validate
    inside `text` nodes (which can carry inline marks like `link`
    with href). If a TipTap link mark is added later, its href
    would NOT be checked. Worth noting if you flag it as MED.
  - isHostnameSafe uses dynamic imports inside an async function;
    on first call there's a small import latency (~ms). No
    correctness issue, but flag if you see startup fragility.
  - The atomic-rollback DELETE in createProject is itself subject to
    RLS (projects_delete_yagi requires yagi_admin). For a non-yagi
    workspace_admin, the rollback DELETE will fail silently (logged
    via console.error). The orphan project remains, but at least the
    user gets the error message. Flag if you think this needs a
    SECURITY DEFINER RPC.
</task>

<grounding_rules>
- Cite file + line for every finding. Quote the offending source.
- Don't re-flag the items in already_deferred (they're documented FUs).
- yagi_admin is globally trusted.
</grounding_rules>

<already_deferred>
Same as REVIEW loop 1 plus:
- FU-2.8-ssrf-redirect-rewrite: redirect-time re-check for fetchOgFallback
  is v1 gap; redirect:'manual' loop is Phase 2.8.1.
- FU-2.8-link-mark-href-sanitization: validateContentSafety walks node
  structure but TipTap link marks (inline) are not yet checked. Phase
  2.8.1 when link marks are exercised; v1 toolbar has no link insertion.
</already_deferred>

<structured_output_contract>
VERDICT: CLEAN | MEDIUM_ONLY | NEEDS_FIX

Findings (if any):
----
ID: K05-PHASE-2-8-LOOP2-NN
SEVERITY: HIGH-A | HIGH-B | HIGH-C | MED-A | MED-B | LOW-A | LOW-C
LOCATION: file:line range
QUOTE: 2-6 lines
EXPLOIT: 1-3 sentences
FIX: 1-3 sentences
----

End with:
SUMMARY: one sentence
</structured_output_contract>

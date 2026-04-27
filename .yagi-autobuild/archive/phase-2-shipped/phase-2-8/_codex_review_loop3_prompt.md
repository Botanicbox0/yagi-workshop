<task>
Phase 2.8 G_B (Brief Board) — REVIEW loop 3 (final, per KICKOFF state
machine; loop 4 is HALT E_REVIEW_LOOP).

Loop 1 → 4 findings, patched.
Loop 2 → 3 NEW findings exposing fix incompleteness; patched again:

LOOP2-01 HIGH-B: drain logic missed conflict/locked/validation/etc
  branches. FIX: refactored flushSave to use try/finally; the drain
  block now runs in finally{} regardless of which terminal path the
  body took.

LOOP2-02 MED-A: SSRF guard missed IPv4-mapped IPv6 (::ffff:127.0.0.1
  and hex form ::ffff:7f00:1). FIX: split isPrivateIp into normalize +
  isPrivateIpv4Octets + IPv6-mapped detection (dotted, hex, and
  compatible forms), plus broader IPv6 ranges (multicast, site-local,
  CGN). normalizeIp strips brackets and lowercases.

LOOP2-03 MED-A: rollback DELETE used user-scoped client → blocked by
  projects_delete_yagi RLS for non-yagi workspace_admin. FIX: switched
  to createSupabaseService for the rollback DELETE only. Service role
  bypasses RLS.

Re-review the patched diff. Confirm each finding is addressed. Then
look for any new regressions specifically introduced by:

  - The try/finally restructure in flushSave (editor.tsx).
  - The expanded isPrivateIp predicate (could it false-positive any
    legitimate public IPv6 like 2001:db8::/32 documentation prefix?
    That should NOT be treated as private even though it's "reserved"
    — it's the public TEST-NET equivalent for documentation).
  - Service role usage in rollback DELETE — is service role even
    available at this code site? createSupabaseService throws if env
    vars are missing; the rollback path is reached only on rare
    insert-failure cases, but a missing service-role key would
    surface as an unhandled exception.

Apply the same severity taxonomy and structured output contract as
prior loops. If everything is addressed and no regressions, emit
VERDICT: CLEAN.
</task>

<grounding_rules>
- Cite file + line. Quote source. Don't re-flag already_deferred.
- yagi_admin globally trusted; flag only if non-admin can escalate.
- Prefer CLEAN if all findings are addressed and remaining concerns
  are theoretical defense-in-depth (per CODEX_TRIAGE Q-017,
  exploitable-today gets fixed; theoretical defers to security sweep).
</grounding_rules>

<already_deferred>
Same as loops 1+2 plus:
- FU-2.8-ssrf-redirect-rewrite: redirect:'manual' loop is 2.8.1.
- FU-2.8-link-mark-href-sanitization: TipTap link marks aren't in v1
  toolbar; validateContentSafety extends in 2.8.1 if link marks land.
- FU-2.8-saveversion-rollback: two-write atomicity gap covered by
  same-FU SECURITY DEFINER RPC in 2.8.1.

Plus the broader project-2.8.1-list (commented in FOLLOWUPS.md):
slash command, IME smoke manual, R2 presign roundtrip, draft-project
wizard pattern, Playwright e2e, tabs i18n, comment-kind enum,
@tiptap/core SPEC amendment, R2 bucket name drift cosmetic.
</already_deferred>

<structured_output_contract>
VERDICT: CLEAN | MEDIUM_ONLY | NEEDS_FIX

Findings (if any):
----
ID: K05-PHASE-2-8-LOOP3-NN
SEVERITY: HIGH-A | HIGH-B | HIGH-C | MED-A | MED-B | LOW-A | LOW-C
LOCATION: file:line range
QUOTE: 2-6 lines
EXPLOIT: 1-3 sentences
FIX: 1-3 sentences
----

End with:
SUMMARY: one sentence
</structured_output_contract>

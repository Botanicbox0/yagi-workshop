# Phase 2.1 G7 — Codex K-05 Adversarial Review

**Date:** 2026-04-23 (overnight autopilot → 2nd pass post-wake)
**Reviewer:** Codex K-05 (gpt-5.4-mini, high reasoning) via codex:codex-rescue subagent
**Pass 1 commit range:** `4bf7591..8d34210` (12 commits; middleware fix `5855dd0` included)
**Pass 2 focused diff:** `638ad43` (H1 + M1 patches)
**Pass 1 verdict:** ❌ HIGH (H1 + M1 + L1).
**Pass 2 verdict:** ❌ **HIGH (PARTIAL)** — M1 RESOLVED, H1 PARTIAL_RESOLUTION. Phase 2.1 still NOT safe to close out.

---

## Verdict

**HIGH** — 1 HIGH finding, 1 MEDIUM finding, 1 LOW (resolved by Builder post-review).

Per overnight autopilot hard-stop #1: any HIGH Codex finding → STOP, commit WIP, push, Telegram, end autopilot. Phase 2.1 G8 closeout **NOT** achieved. Phase 2.5 launchpad + build skipped per hard-stop #10.

---

## [H1] SSRF walker misses hex-form IPv4-mapped IPv6 literals

**Severity:** HIGH (security, exploitable edge)
**File:** `src/lib/og-video-unfurl.ts:45-58, 81-83, 199-206` (and mirrored bug in `src/lib/og-unfurl.ts`)

### Finding

`isPrivateIPv6()` recognizes IPv4-mapped IPv6 ONLY in dotted-quad form (`::ffff:127.0.0.1`) via regex `^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$`. Canonical hex-form mappings like `::ffff:7f00:1` (= 127.0.0.1) or `::ffff:c0a8:0101` (= 192.168.1.1) fall through as "public". An attacker-controlled provider response or crafted input URL can target loopback/LAN space through the hex representation even after Phase 2.1 redirect-walk port.

Walker re-validates each redirect hop but the classifier underneath has the same blind spot. Same bug lives in `src/lib/og-unfurl.ts` which the Phase 2.1 walker explicitly says to keep in sync.

### Recommended fix

Normalize `::ffff:*` forms before classification. Decode the low 32 bits and run through `isPrivateIPv4()` regardless of the textual form.

Sketch:

```ts
// Match both dotted-quad and hex low-word forms.
const v4Mapped = lower.match(/^::ffff:(?:([0-9a-f]{1,4}):([0-9a-f]{1,4})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))$/);
if (v4Mapped) {
  if (v4Mapped[3]) {
    // dotted-quad form
    return isPrivateIPv4(v4Mapped[3]);
  }
  // hex form: reconstruct dotted quad from the two 16-bit hex groups
  const hi = parseInt(v4Mapped[1], 16);
  const lo = parseInt(v4Mapped[2], 16);
  const dotted = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  return isPrivateIPv4(dotted);
}
```

Apply the same patch to both files (they are explicitly documented as "keep in sync").

### Why this is HIGH

The SSRF walker was specifically ported in Phase 2.1 G5 FIX_NOW #1 as a security hardening. The gap means that hardening has a known bypass — which is precisely the failure mode the port was meant to prevent. Not closable as MEDIUM.

---

## [M1] Realtime-publication migration is not idempotent on re-apply

**Severity:** MEDIUM (ops hygiene / reproducibility)
**File:** `supabase/migrations/20260423020000_h1_preprod_realtime_publication.sql:15-16`

### Finding

The migration body is bare `ALTER PUBLICATION supabase_realtime ADD TABLE public.preprod_frame_reactions;` + the comments variant. No existence guard. Re-apply against a DB that already has either table in the publication errors rather than no-ops.

Contrast with `20260423020100_seed_yagi_internal_workspace.sql` which explicitly uses `ON CONFLICT DO NOTHING` for the same idempotency purpose.

### Recommended fix

Wrap in a `DO $$ ... END $$;` block that checks `pg_publication_rel` first:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'preprod_frame_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.preprod_frame_reactions;
  END IF;
END $$;
-- and same for preprod_frame_comments
```

### Why MEDIUM (not HIGH)

The live DB state is correct (applied once, both tables in publication). Error surface is only `supabase db reset` or a second run against the same DB — which never happens in production flow. But the clean-clone reproducibility contract that Phase 2.0 G2 established is violated by this file, and the pattern precedent from the sibling migrations says idempotency is expected.

Deferrable to a small follow-up commit; not a blocker for H1 remediation.

---

## [L1] Schema_migrations consistency — **resolved post-review**

**Original Codex text:** Cannot confirm from repository evidence alone that the live `supabase_migrations.schema_migrations` table contains `20260423020000`, `20260423020100`, and `20260423020200`.

**Builder verified via SQL:**

```sql
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE version LIKE '20260423%' ORDER BY version;
```

Result: 3 rows at versions `20260423020000 / 020100 / 020200`, names `h1_preprod_realtime_publication / seed_yagi_internal_workspace / create_meeting_with_attendees_rpc`. All aligned to disk filenames.

---

## Non-findings (explicit PASS from Codex)

Codex's summary paragraph confirmed PASS on the following focus areas:

1. **RLS on RPC** — `create_meeting_with_attendees` SECURITY INVOKER + the `meetings_sync_workspace_id` trigger ordering makes `meetings_insert` WITH CHECK effective. No bypass.
2. **RPC atomicity** — plpgsql body has no swallowing exception handler; rollback semantics hold.
3. **G4 #8 requestId preservation** — present in both createCalendarEvent call sites (createMeeting line 219 + retryCalendarSync line 834).
4. **G4 #10 path-traversal intact** alongside G5 FIX_NOW #3 media_type derive in ref-actions.ts.
5. **POPBILL guard wiring** — no raw NOT_IMPLEMENTED leak to UI; bilingual i18n correct.
6. **Middleware exclusion** — no auth-state leak on /showcase; no collision with /[locale]/app/showcases admin route.
7. **Database types regeneration** — new RPC signature correct with optional `p_description`.
8. **Defensive DROP FUNCTION IF EXISTS** in the RPC migration correctly strips the mid-session signature rewrite; single signature confirmed live.

---

## Remediation path (야기 morning decision)

**Option A — 30-min patch to unblock:**
1. Patch `isPrivateIPv6()` in BOTH `og-unfurl.ts` and `og-video-unfurl.ts` per §H1 fix sketch.
2. Re-regenerate `database.types.ts` is NOT needed (no DB change).
3. Patch `20260423020000_h1_preprod_realtime_publication.sql` idempotency wrapper (§M1) — do NOT re-apply to live (already applied); treat as a clean-clone reproducibility fix.
4. Re-run Codex K-05 on the patch diff (cheap — small scope).
5. On CLEAN: Phase 2.1 G8 closeout, Phase 2.5 launchpad + build per original overnight plan.

**Option B — ship Phase 2.1 WIP as-is, block Phase 2.5:**
Accept H1 remediation as the first task of a fresh session; Phase 2.5 entry readiness deferred.

**Builder recommendation:** A. The SSRF patch is ~10 lines, the migration wrapper is ~10 lines, and re-Codex on a focused diff is fast and cheap. Both are well below the 2x cost budget.

---

## Files expected to change on Option A

- `src/lib/og-video-unfurl.ts` (isPrivateIPv6 hex-form handling)
- `src/lib/og-unfurl.ts` (same patch, per the "keep in sync" rule)
- `supabase/migrations/20260423020000_h1_preprod_realtime_publication.sql` (idempotency wrapper)

No new migrations; no RPC re-apply; no types regen.

---

## Pass 2 — applied + re-reviewed (commit `638ad43`)

Applied per Pass 1 §H1 fix sketch + 야기 additional requirement (normalize
`0:0:0:0:0:ffff:` full-form prefix before regex match). M1 idempotency wrapper
also applied.

### Pass 2 verdict: ❌ HIGH (PARTIAL_RESOLUTION)

Codex summary: "M1 resolved and can be signed off. H1 remains PARTIAL: the
patch correctly handles the two originally flagged forms (compressed
`::ffff:` and the exact `0:0:0:0:0:ffff:` full-form), but mixed-compression
and zero-padded IPv4-mapped representations remain unguarded, constituting a
concrete exploitable bypass path."

### Pass 2 [H1] residual gap

Text-regex normalization in `isPrivateIPv6()` catches exactly two textual
prefixes (`::ffff:` and `0:0:0:0:0:ffff:`) but MISSES:

- Mixed-compression: `0:0:0:0::ffff:7f00:1` (same address as
  `::ffff:7f00:1`, different text).
- Zero-padded full form: `0000:0000:0000:0000:0000:ffff:7f00:1`.
- Various other RFC 5952 compression-permitted variants.

Reachability — real vs theoretical:
- `new URL("http://[...]").hostname` canonicalizes IPv6 per WHATWG spec
  → in practice, non-canonical forms are normalized to compressed
  form BEFORE reaching `isPrivateIPv6()`. Our regex then matches.
- `dns.lookup()` return values come from libc and are usually canonical
  on modern resolvers, but NOT guaranteed across all OS + config combos.

Codex grades it HIGH on defense-in-depth grounds — "text-regex can
always miss a variant" is a category-level design flaw.

### Pass 2 [L1] sync-comment asymmetry

`og-unfurl.ts` has the inline "keep in sync" comment inside the function
body; `og-video-unfurl.ts` only has the file-header banner. Minor.

### Pass 2 [M1] verification — FULLY RESOLVED

Both DO blocks correctly gate their `ALTER PUBLICATION ... ADD TABLE` with
a `pg_publication_tables` existence check. Re-apply is a no-op; clean-clone
applies both tables on first run. No SQL-level bugs in the DO scope.

## Current state → awaiting 야기 decision

Phase 2.1 still **cannot close out** (H1 open). Remediation options:

**Option A — proper binary IPv6 parser (~30-40 lines, 0 deps, recommended).**
Parse IPv6 textual form to a 128-bit byte representation (16 bytes via
`net.isIPv6()` validation + manual expansion of `::` compression), extract
the low 32 bits, and feed to `isPrivateIPv4()` via the dotted-quad form.
Covers ALL RFC 5952 variants by construction. Ends the "text-regex whack-a-mole"
cycle that Pass 2 Codex flagged.

**Option B — expand normalization regex (5-10 lines).**
Add more `.replace(...)` patterns for common uncompressed / zero-padded
variants. Faster but each subsequent Codex pass may find another variant.
Not recommended.

**Option C — WONTFIX + documentation.**
Declare that `new URL()` + `dns.lookup()` canonicalization in the normal
request path makes the residual text forms unreachable in practice. Overrule
Codex's theoretical-completeness verdict on reachability grounds. Not
recommended — defense-in-depth rule says harden the classifier, not trust
upstream normalization.

**Builder recommendation: A.** Ends the cycle. ~30 lines. No deps. Next
Codex pass will be CLEAN on this surface.

Phase 2.5 launchpad + build REMAIN SKIPPED per hard-stop #10 (Phase 2.1
closeout still not achieved after Pass 2).

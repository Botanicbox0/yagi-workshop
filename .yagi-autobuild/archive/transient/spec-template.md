# Phase X.Y — <Name> — SPEC

> **Secret hygiene:** NEVER inline real secrets (API keys, OAuth client secrets, JWT bearer tokens, database passwords, Telegram bot tokens) in spec or summary docs. Use placeholders like `<your-secret>` or env-var references like `$RESEND_API_KEY`. Real values live ONLY in `.env.local` (gitignored) or Supabase Vault. The pre-commit hook (`.husky/pre-commit`) scans staged diffs for known secret patterns and rejects commits that match; do not bypass with `--no-verify` — redact and re-stage.

**Status:** Draft / In progress / Shipped
**Estimated time:** <hours>
**Cross-refs:** `AUTOPILOT.md`, previous phase's `summary-phase-X.Y.md`, related ticket

---

## Why this phase

One paragraph. Why now, what problem it solves, what would be wrong if we skipped it. Call out external drivers (user request, blocker from prior phase, ops issue, compliance, etc.).

---

## Tasks

Use groups (G0, G1, ...) when the phase has independent workstreams with verbal-go gates between them; otherwise a flat numbered list is fine.

### G<n> — <Group name>

**Why:** One sentence.

**Tasks:**
1. ...
2. ...

**Exit criteria:**
- ...
- ...

**Codex review:** Required / Skipped (<reason>).
**Estimated time:** <minutes>.
**Telegram on done:** `G<n> done — <one-line summary>.`

---

## Out of scope

- ...
- ...

---

## Resolved decisions

| Question | Decision | Rationale |
|---|---|---|
| ... | ... | ... |

---

## Success criteria (phase-level)

1. ✅ ...
2. ✅ ...

---

## Rollback

Level 0 (ops) / Level 1 (code) / Level 2 (migration bookkeeping) / Level 3 (schema PITR) — refer to `.yagi-autobuild/snapshots/<prior-phase>/ROLLBACK.md` for shared rollback infrastructure; only document phase-specific rollback steps here.

---

**End of spec. Ready for <next-group> kickoff on Yagi's verbal go.**

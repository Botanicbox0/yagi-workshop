# YAGI Workshop — Codex Plugin for Claude Code

> **Purpose:** Dual-model review workflow. Claude Code (B-O-E) = builds. OpenAI Codex = adversarial reviewer + rescue agent.
> **Why:** Single-family model review creates false confidence. Different model architectures catch each other's blind spots — especially on RLS, concurrency, and auth-adjacent code.

---

## One-time install

In Claude Code session (inside `C:\Users\yout4\yagi-studio\yagi-workshop`):

```
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

`/codex:setup` will detect whether the `codex` CLI is installed. If not:

```powershell
npm install -g @openai/codex
```

Then log in:

```
!codex login
```

(Supports ChatGPT subscription OR OpenAI API key. ChatGPT Plus/Team sub is enough — the plugin uses your Codex usage limits, separate from Claude quota.)

Verify:

```
/codex:setup
```

Should show Codex ready + the `codex:codex-rescue` subagent in `/agents`.

---

## Project-level Codex config

Create `.codex/config.toml` at repo root:

```toml
model = "gpt-5.4-mini"
model_reasoning_effort = "high"
```

Rationale: `gpt-5.4-mini` on high reasoning hits the cost/quality sweet spot for review passes. Upgrade to full `gpt-5.4` only for the highest-risk reviews (RLS, financial flows).

---

## The YAGI review workflow

### Principle: Codex is a reviewer, not a builder

- **Claude Code (B-O-E)** writes all code.
- **Codex** only runs `review`, `adversarial-review`, and occasional `rescue` for targeted debugging.
- `/codex:rescue` writes code — use it only when Claude Code is stuck on a specific bug, never as a general builder.
- **Never enable `review gate`** (`--enable-review-gate`) — it creates Claude↔Codex loops that drain usage limits.

### Three review modes

| Command | When |
|---------|------|
| `/codex:review --base main --background` | End of every Phase, before `pnpm build` |
| `/codex:adversarial-review --base main --background <focus>` | Before sensitive Phase completion (RLS, auth, financial) |
| `/codex:rescue <problem>` | Only when Claude Code stuck on a specific bug after 2 failed attempts |

### Targeted adversarial prompts (tailored to YAGI phases)

Generic "find bugs" prompts return generic results. YAGI-specific focus cuts noise by ~60%.

**Phase 1.2.5 (video/pdf/intake):**
```
/codex:adversarial-review --base main --background focus on: (1) RLS visibility leaks where a client-role user could SELECT an internal-visibility thread attachment, (2) signed URL expiry edge cases on large video uploads, (3) intake_mode Zod discriminated union allowing a brief-mode project to bypass proposal field validation
```

**Phase 1.3 (Google Calendar + AI summary):**
```
/codex:adversarial-review --base main --background focus on: (1) Google refresh token failure modes — what if revoked mid-meeting-create, (2) ICS fallback path when Resend is also down, (3) AI summary schema validation — what happens if the model returns malformed JSON after the one retry, (4) meeting cancel race conditions if Google deletes but our DB update fails
```

**Phase 1.4 (Pre-production Board):**
```
/codex:adversarial-review --base main --background focus on: (1) share token rotation leaving stale URLs cached in clients' browsers, (2) frame reaction upsert races when multiple clients react simultaneously, (3) revision history consistency — can a v2 frame reference a deleted v1 frame, (4) RLS bypass via the public /s/ route
```

**Phase 1.5 (Invoicing + 팝빌):**
```
/codex:adversarial-review --base main --background focus on: (1) 팝빌 API failure during 전자세금계산서 issuance — can a draft invoice become "issued" in our DB without actually being filed, (2) money rounding in KRW (integer-only currency), (3) tax period edge cases around Korean fiscal year, (4) idempotency of invoice issuance retries
```

**Phase 1.7 (internal team chat):**
```
/codex:adversarial-review --base main --background focus on: (1) cross-workspace message leakage — can a client ever see YAGI internal chat, (2) realtime subscription leaking internal channel IDs to client browser, (3) file upload path collisions in team-channel storage bucket
```

**Phase 1.8 (notifications):**
```
/codex:adversarial-review --base main --background focus on: (1) digest cron idempotency — duplicate emails on retry, (2) timezone handling for digest_time_local, (3) notification_events queue buildup if email sending is down, (4) unsubscribe link generation and verification
```

**Phase 1.9 (showcase):**
```
/codex:adversarial-review --base main --background focus on: (1) public slug enumeration — can an unlisted showcase be discovered, (2) OG image generation caching — stale images after edits, (3) password-gated showcase bypass via referrer leak, (4) media embed XSS if external_url is rendered unsafely
```

---

## Validation pattern (noise filter)

Codex returns a list of findings. Do NOT act on all of them. Claude Code B-O-E Builder runs this validation prompt on the Codex output first:

```
Here is the Codex review output:
<paste codex output>

Evaluate each finding against these criteria:
1. Is this a real issue in THIS codebase, or a generic "best practice" note?
2. Does the finding cite a specific file + line, or is it vague?
3. What is the concrete exploit scenario — can a malicious user actually trigger this?
4. What is the fix cost — 5 minutes or 2 hours?

Output a filtered list with only findings that are:
- concrete (cited file + line)
- exploitable (real attack path, not theoretical)
- worth the fix cost (severity × exploitability > fix cost)

For each surviving finding, write a 1-line fix plan.
```

This cuts ~50% of Codex output that's fluff/generic. The rest goes into a TodoWrite list for the next Executor wave.

---

## Integration with Kill-switches

Each Phase has an existing kill-switch "Before final `pnpm build`". Add one step before it:

```
Kill-switch N-1: Codex adversarial review
1. Run: /codex:adversarial-review --base main --background <phase-specific focus>
2. Wait for completion: /codex:status until ok
3. Get result: /codex:result
4. Run validation prompt (above) on the output
5. If any surviving findings: create a TodoWrite, fix them, then proceed
6. If no surviving findings: Telegram "✅ Codex review clean" → continue to final build
```

---

## Budget & cost monitoring

- Codex usage is billed separately against ChatGPT sub OR OpenAI API key.
- Typical adversarial review of a Phase (~2000–5000 lines changed): **$0.50–$2 in API tokens.**
- Full Phase 1.2 → 1.9 ship with dual-model review: **~$15–$30 total Codex spend.**
- Monitor via https://platform.openai.com/usage if using API key.

If using ChatGPT Plus sub: usage limits reset weekly. Heavy adversarial reviews might hit the cap in a single Phase — use API key for safety.

---

## Forbidden

- Do NOT enable `--enable-review-gate` — creates Claude↔Codex loop that burns quota
- Do NOT use `/codex:rescue` as a general-purpose builder — it bypasses the B-O-E structure and leaves no Phase spec trail
- Do NOT paste `.env.local` contents into Codex prompts — the plugin sends code + diffs, not env vars, but prompts are your responsibility
- Do NOT run Codex review on pre-Phase-1.2 code — RLS conventions weren't established yet, review will be noisy

---

## Escape hatch

If Codex is down or misconfigured, kill-switches proceed without the Codex step (Telegram: "⚠️ Codex unavailable, proceeding with Claude-only review"). Don't block shipping on external dep outage.

---

**References:**
- Plugin: https://github.com/openai/codex-plugin-cc
- Codex config: https://developers.openai.com/codex/config-reference
- Original announcement: https://community.openai.com/t/introducing-codex-plugin-for-claude-code/1378186

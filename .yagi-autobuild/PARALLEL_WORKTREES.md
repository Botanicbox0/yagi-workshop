# YAGI Workshop — Parallel Agent Execution

> **Purpose:** Multiple Claude Code sessions running simultaneously, coordinated through Agent Teams + git worktrees. The single biggest lever on sprint speed.
> **Scope:** Gate-level parallelism within a Phase. Phase-level chain still governed by `AUTOPILOT.md`. Gate-level protocol still governed by `GATE_AUTOPILOT.md`.
> **Target environment:** Windows 11 + WSL2 + Warp. All commands assumed runnable from Warp's WSL shell.
> **Rejected alternatives:** Conductor (macOS only), cmux (macOS only), Superset (macOS only), tmux split-pane (requires macOS iTerm2 or Linux terminal emulator; Warp Windows does not support it). In-process mode is the only correct display mode for Warp Windows.

---

## Core primitives (all officially supported by Claude Code v2.1.32+)

1. **`claude -w <name>`** — Create git worktree at `.claude/worktrees/<name>/` with dedicated branch. Each worktree is an independent working directory.
2. **Agent Teams** (experimental, opt-in via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) — Lead session spawns teammates, each with own context window and mailbox. Shared task list coordinates work.
3. **In-process display mode** (`--teammate-mode in-process`) — All teammates run inside one terminal window. Cycle with Shift+Down. **This is the mode for Warp Windows.**
4. **Subagent definitions** (`.claude/agents/<name>.md`) — Reusable role templates (tools allowlist + model + system prompt). Can be spawned as Agent Team teammate by name.
5. **Pre-approved permissions** — `--permission-mode` and `settings.json` allowlist prevent teammate permission-prompt flood.

**Check Claude Code version** before using any of this:
```bash
claude --version
# Must be >= 2.1.32
```

**Verify Agent Teams env var** is set:
```bash
grep -A1 '"env"' ~/.claude/settings.json | grep CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
# Expected: "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
```

Both confirmed present in yagi environment as of 2026-04-23 (per memory + settings.json).

---

## When to use which primitive

| Scenario | Primitive |
|---|---|
| Single Gate, multiple independent subtasks (common case) | **Agent Team, in-process, in main worktree** |
| Multiple Gates running genuinely in parallel (rare) | **Multiple worktrees, each with own `claude -w` session** |
| Research / debugging with competing hypotheses | **Agent Team with adversarial prompts (gstack pattern)** |
| Single narrow task (< 3 subtasks) | **Single session, no team** — team overhead not worth it |

Rule of thumb: **3-5 teammates per team** (official guidance). Beyond that, coordination overhead exceeds parallelism benefit.

---

## Pattern 1: Agent Team for a single Gate (default)

This is 90% of yagi use cases. G3 onwards, this pattern replaces the current "Builder → Orchestrator → sequential Executor" chain.

### Setup

From the main worktree (`C:\Users\yout4\yagi-studio\yagi-workshop`) in Warp → WSL:

```bash
cd ~/yagi-workshop   # or equivalent WSL path to the repo
claude --teammate-mode in-process
```

**Explicit mode flag is required on Warp Windows.** Default `"auto"` sometimes picks split-pane if it detects any tmux ancestor, producing errors on Windows.

Once inside the session, tell Claude to create a team:

```
Create an agent team for Phase 2.5 G3. Read 
.yagi-autobuild/phase-2-5/G3-ENTRY-DECISION-PACKAGE.md 
and .yagi-autobuild/phase-2-5/SPEC.md §G3, then spawn teammates 
for each parallel_group in the task plan.
```

### Interaction

- **Cycle teammates:** `Shift+Down` moves between lead and each teammate in turn. After the last teammate, wraps back to lead.
- **Message a teammate directly:** `Shift+Down` until you land on them, then type.
- **View a teammate's full session:** `Enter` while on their row.
- **Interrupt a teammate's current turn:** `Escape` while viewing them.
- **Toggle shared task list:** `Ctrl+T`.
- **Return to lead:** Keep pressing `Shift+Down` until you wrap around, or press the specific lead shortcut (shown on screen).

### Control flow

Yagi talks to the lead. The lead:
- Creates the shared task list (from decision package + SPEC)
- Spawns teammates and assigns tasks
- Synthesizes findings as teammates report in
- Requests approval for taste decisions only
- Calls cleanup when all tasks done

Teammates:
- Work on assigned tasks in their own context window
- Load CLAUDE.md, MCP servers, skills from project (not from lead's conversation)
- Message each other through the mailbox (no need to route through lead)
- Self-claim next unassigned task when current one completes
- Notify lead on idle

### Cleanup

When the Gate is done:
```
Clean up the team
```

Lead removes `~/.claude/teams/<team-name>/` and `~/.claude/tasks/<team-name>/`. **Only the lead should run cleanup** — teammate cleanup leaves orphaned state.

---

## Pattern 2: Multiple worktrees for parallel Gates (advanced)

Use when two or more Gates can genuinely proceed in parallel without touching the same files. Rare in practice because most Gates share SPEC sections or migrations.

### Setup

Open 2-3 Warp tabs, each running WSL. In each tab:

```bash
# Tab 1 — Gate 3 (challenges listing)
claude -w g3-challenges

# Tab 2 — Gate 4 (submission flow)
claude -w g4-submissions
```

Each command:
- Creates `.claude/worktrees/g3-challenges/` with branch `worktree-g3-challenges` (from default remote branch)
- Starts a fresh Claude Code session in that directory
- `worktree-g3-challenges` branches off main; PR back to main when Gate ships

### Naming convention (enforced)

- `g<K>-<slug>` where `<slug>` matches the Gate's SPEC section slug
- Examples: `g3-challenges`, `g4-submissions`, `g7-dispatch`
- Avoid generic names (`feature-1`, `temp`). Lost-track cost is high.

### Tab naming in Warp

Warp supports tab names. Rename each tab to match its worktree name for fast orientation:
- Right-click tab → Rename → type worktree name
- `Ctrl+1`, `Ctrl+2`, etc. to switch tabs fast

### Cleanup per worktree

After a Gate ships and merges:
```bash
# From main worktree
git worktree remove .claude/worktrees/g3-challenges
git branch -D worktree-g3-challenges  # if merged
```

### When to combine patterns 1 and 2

For a really complex Gate (e.g., G4 submission flow has DB + upload pipeline + UI + admin panel):
- Open worktree: `claude -w g4-submissions`
- Inside it, create Agent Team: "spawn 4 teammates for parallel_groups A-D"
- Teammates work inside the worktree, not in the main repo

File-conflict isolation is at worktree level; task parallelism is at teammate level.

---

## Pattern 3: Adversarial investigation (gstack-inspired)

Used when root cause is unclear or when a design decision needs opposing views. Direct lift from official docs + gstack's `/investigate` pattern.

```
Spawn 5 teammates to investigate why the onboarding flow sometimes 
redirects to /app instead of staying on /onboarding/role. Have them 
propose different hypotheses and challenge each other's theories. 
Update a findings doc with whatever consensus emerges.
```

The adversarial structure fights single-agent anchoring bias. This pattern is for debugging and design exploration, not production implementation.

---

## task_plan.md schema extension (parallel_group field)

Current `task_plan.md` schema (per Orchestrator CLAUDE.md) has no field for parallelism signaling. This section defines the extension.

### New field: `parallel_group`

Each subtask gets a `parallel_group` letter (A, B, C...). Same letter = runs simultaneously. Different letter = sequential barrier between them.

```yaml
tasks:
  - id: 01
    goal: Create challenges listing page
    files: [src/app/[locale]/challenges/page.tsx]
    parallel_group: A
    depends_on: []
    complexity: complex
  
  - id: 02
    goal: Create challenge detail page
    files: [src/app/[locale]/challenges/[slug]/page.tsx]
    parallel_group: A
    depends_on: []
    complexity: complex
  
  - id: 03
    goal: Create gallery page
    files: [src/app/[locale]/challenges/[slug]/gallery/page.tsx]
    parallel_group: A
    depends_on: []
    complexity: complex
  
  - id: 04
    goal: E2E smoke test for all three pages
    files: [tests/e2e/challenges.spec.ts]
    parallel_group: B
    depends_on: [01, 02, 03]
    complexity: simple
```

Interpretation:
- Tasks 01, 02, 03 → same `parallel_group: A`, no cross-dependencies → **three teammates spawned simultaneously**
- Task 04 → `parallel_group: B`, depends on A completing → **next wave, after A all-done**

### When parallel_group letters differ but no depends_on

Ambiguous. Orchestrator should treat this as a spec bug and escalate to Builder. Don't guess.

### Builder's job

When writing `task_plan.md`:
1. Partition tasks by **file-set disjointness**. Tasks touching different files → same group.
2. Tasks with cross-dependencies → different groups, with explicit `depends_on`.
3. Tasks requiring human input between them → different groups.
4. **Max teammates per group: 5.** If a group would have 6+, split into two groups or merge some tasks.

### Orchestrator's job

When consuming `task_plan.md`:
1. Read all tasks, group by `parallel_group`.
2. For each group in letter order (A, B, C...):
   - Spawn all teammates in the group at once (one Agent Team, one task per teammate)
   - Wait for all teammates to mark their task as `completed` in the shared task list
   - Proceed to next group
3. Between groups, run `pnpm tsc --noEmit` and `pnpm lint` to catch inter-group drift before next spawn.

---

## Subagent definitions for recurring roles

Subagent files live in `.claude/agents/<name>.md`. They define a teammate's tools + model + system prompt once, reusable across sessions.

### Proposed yagi subagents (to be created as needed)

- `.claude/agents/migration-author.md` — For DB migration work. Tools: Read, Edit, Bash (psql, supabase). Model: sonnet-4.6. System prompt references CODEX_TRIAGE.md.
- `.claude/agents/ui-implementer.md` — For React/Tailwind component work. Tools: Read, Edit, Bash (pnpm). Model: haiku-4.5. System prompt references design-system/*.
- `.claude/agents/qa-tester.md` — For Playwright e2e test work. Tools: Read, Edit, Bash (pnpm test). Model: sonnet-4.6.
- `.claude/agents/codex-reviewer.md` — Wraps `/codex:adversarial-review` invocation. Tools: Bash only. Model: haiku-4.5.

When spawning:
```
Spawn a teammate using the migration-author agent type to handle task 01.
Spawn a teammate using the ui-implementer agent type for tasks 02 and 03.
```

**Not built yet.** Create on first use, one at a time, only when 3+ Gates would reuse the same role. Premature agent files = redundant maintenance.

---

## Known limitations (official, from docs.anthropic.com/agent-teams)

1. **No session resumption with in-process teammates** — `/resume` and `/rewind` do not restore teammates. Spawn fresh.
2. **Task status can lag** — Teammates sometimes forget to mark tasks done. If a task looks stuck, check the work and update status manually or ask the lead to nudge.
3. **Shutdown is slow** — Teammates finish current tool call before shutting down.
4. **One team per session** — Lead can manage one team at a time. Clean up before starting a new team.
5. **No nested teams** — Teammates cannot spawn teams. Only lead can.
6. **Lead is fixed** — Cannot promote a teammate or transfer leadership. If the lead's session dies, the team dies.
7. **Permissions are set at spawn** — Can't configure per-teammate permission mode at spawn. Change after if needed.
8. **No split-pane on Warp Windows / Windows Terminal / VS Code terminal / Ghostty** — In-process mode only.

---

## Troubleshooting

### Teammates don't appear after the lead spawns them
- `Shift+Down` — they might be running but hidden
- Ensure CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 is set
- Check task complexity — if task was trivial, Claude may have declined to create a team

### Permission prompts flood the lead
- Pre-approve common commands in `settings.json` before spawning
- Set `--dangerously-skip-permissions` only for trusted automation stages (yagi already runs this per memory)

### Teammate dies on error
- `Shift+Down` to view, read the error
- Give additional instructions, or spawn a replacement
- Do not retry blindly — verify the task is still valid

### Lead ends team before all tasks done
- Tell lead: "keep going, there are still incomplete tasks"
- Or: "wait for all teammates to finish before proceeding"

### git worktree commands fail
- `git worktree list` — see what's tracked
- `git worktree remove --force` — if directory deleted manually
- `.claude/worktrees/` should be in `.gitignore` (verify before first use)

---

## Migration plan from current B-O-E to Agent Team model

### Phase 0 — Readiness (before G3 entry)
- [ ] Confirm `.gitignore` has `.claude/worktrees/` entry
- [ ] Confirm `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json`
- [ ] Confirm `claude --version` reports >= 2.1.32
- [ ] Update `yagi-agent/orchestrator/CLAUDE.md` with parallel_group field (this commit)

### Phase 1 — First real parallel Gate (G3)
- [ ] G3-ENTRY-DECISION-PACKAGE already written by web Claude; good
- [ ] Builder writes `task_plan.md` with parallel_group fields
- [ ] Orchestrator spawns Agent Team per group A, waits for completion, proceeds to group B
- [ ] Record observed issues in G3 retrospective (first-ever usage, expect adjustment)

### Phase 2 — Tune (G4-G8)
- [ ] Based on G3 retrospective, adjust max teammates per group
- [ ] Create first subagent definition if 3+ Gates reused the same role
- [ ] Consider Pattern 2 (multi-worktree) if two Gates are genuinely independent

### Phase 3 — Default (Phase 2.6 onwards)
- [ ] Agent Team is the default pattern; single-session is the exception
- [ ] task_plan.md parallel_group is a required field (not optional)
- [ ] Subagent library populated for common roles

---

## Authority

If this document conflicts with `AUTOPILOT.md` or `GATE_AUTOPILOT.md`, those win on phase/gate chain semantics. This document wins on parallel execution mechanics.

If Claude Code documentation at code.claude.com/docs updates the primitives (new flags, deprecated modes, new limitations), this document gets updated in the same commit that adjusts the pattern.

**Source of truth pointers:**
- Agent Teams: https://code.claude.com/docs/en/agent-teams
- CLI reference: https://code.claude.com/docs/en/cli-reference
- Common workflows (git worktrees section): https://code.claude.com/docs/en/common-workflows

---

## Version

- v1.0 (2026-04-23) — Initial. Warp Windows + in-process mode baseline. G3 is first real test.

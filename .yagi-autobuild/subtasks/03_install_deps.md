# Subtask 03 — Install dependencies: resend + react-dropzone + @types/react-dropzone

**status:** pending (awaiting kill-switch approval)
**assigned_to:** executor_haiku_45
**created:** 2026-04-21
**parallel_group:** B (parallel with 02 + 04, but kill-switch GATE)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 03"

---

## ⚠️ KILL-SWITCH GATE

**The Builder (parent agent) sends a Telegram kill-switch BEFORE spawning this Executor.**
**Do NOT begin until you receive the spawning prompt — by the time you read this, the user has already replied `continue`.**

If the user replied `abort`, you would not have been spawned at all.

---

## Executor preamble (READ FIRST, then execute)

You are an Executor for ONE task. Constraints:

1. Read ONLY this file. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
2. You MAY read `/CLAUDE.md` for context.
3. Use only Bash (for `pnpm` commands), Read (to verify `package.json` after).
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. If `pnpm` is not on PATH, write `BLOCKED: pnpm not found on PATH` and stop.
6. If install fails for any reason (network, peer-dep conflict, lockfile mismatch), write `BLOCKED: <pnpm error message — first 5 lines>` and stop. Do NOT try `--force`, `--no-frozen-lockfile`, or any flag not explicitly approved here.

## Task

Run exactly these two commands in this order from the project root:

```bash
pnpm add resend react-dropzone
pnpm add -D @types/react-dropzone
```

That's it. No version pins (resend latest is fine; react-dropzone v14 latest is fine). No additional packages.

**Specifically forbidden:**
- `pnpm add --force`
- `pnpm install --no-frozen-lockfile`
- `pnpm add @react-email/components` (NOT in this subtask — subtask 10 will decide)
- `pnpm add cheerio`, `node-html-parser`, `puppeteer`, or anything for OG parsing — subtask 04 uses native fetch + regex.
- Touching `package.json` manually with Edit/Write — let pnpm manage it.
- `pnpm dlx shadcn@latest …` (this is a hard rule from CLAUDE.md).

## Verification after install

After both commands succeed:

1. Read `package.json` to confirm:
   - `dependencies` now includes `resend` and `react-dropzone` with concrete version strings (e.g., `^4.0.0`).
   - `devDependencies` now includes `@types/react-dropzone`.
2. Confirm `pnpm-lock.yaml` exists and was modified (check file mtime via `ls -la pnpm-lock.yaml` if helpful).
3. Run `pnpm install` once more and confirm the output ends with `Done in <time>` (or equivalent — no errors, no peer-dep warnings that look like failures). Capture the last 5 lines.

## Acceptance criteria

1. `pnpm add resend react-dropzone` succeeded (exit 0).
2. `pnpm add -D @types/react-dropzone` succeeded (exit 0).
3. `package.json` shows the three new entries.
4. `pnpm-lock.yaml` was regenerated/updated.
5. A subsequent `pnpm install` runs clean (no missing peer warnings that block compilation).

## Result file format (`results/03_install_deps.md`)

```markdown
# Subtask 03 result
status: complete
commands_run:
  - pnpm add resend react-dropzone
  - pnpm add -D @types/react-dropzone
  - pnpm install (verification)
new_dependencies:
  - resend: ^X.Y.Z (dependency)
  - react-dropzone: ^X.Y.Z (dependency)
  - @types/react-dropzone: ^X.Y.Z (devDependency)
lockfile_updated: true
final_install_output_tail: |
  <last 5 lines of pnpm install output>
acceptance: PASS — three packages added, package.json + pnpm-lock.yaml updated, clean reinstall.
```

If blocked: `status: blocked` + `reason: <pnpm error>`.

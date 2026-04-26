#!/usr/bin/env node
// Phase 2.8.1 G_B1-A — fixture-based test for the
// `yagi-rsc/no-async-form-action` ESLint rule.
//
// Spawns the project ESLint binary on the deliberately-bad fixture and
// asserts the rule fires (lint exit code != 0 and stdout contains the
// rule id). Exit 0 when the rule fires, exit 1 otherwise.
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const fixture = "scripts/_fixtures/bad-rsc-form-action.tsx";

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "eslint",
    "--no-warn-ignored",
    "--no-config-lookup",
    "-c",
    "scripts/_fixtures/eslint.fixture.mjs",
    fixture,
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
    shell: true,
  },
);

const stdout = result.stdout || "";
const stderr = result.stderr || "";
const fired =
  result.status !== 0 && stdout.includes("yagi-rsc/no-async-form-action");

if (!fired) {
  console.error(
    "FAIL: yagi-rsc/no-async-form-action did not fire on the fixture.",
  );
  console.error(`exit=${result.status}`);
  console.error("stdout:\n" + stdout);
  console.error("stderr:\n" + stderr);
  process.exit(1);
}

console.log(
  "OK: yagi-rsc/no-async-form-action fires on " + fixture,
);
process.exit(0);

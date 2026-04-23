#!/usr/bin/env node

/**
 * Smoke test for /challenges/:slug/submit routes + YouTube validator.
 *
 * Usage:
 *   node tests/e2e/challenges-submit.smoke.mjs           (assumes dev server on :3003)
 *   SMOKE_URL=https://studio.yagiworkshop.xyz node tests/e2e/challenges-submit.smoke.mjs
 *
 * Exit codes:
 *   0: all tests pass
 *   1: any test fails
 */

import { spawnSync } from "node:child_process";

const SMOKE_URL = process.env.SMOKE_URL || "http://localhost:3003";

const tests = [
  {
    name: "GET /challenges/test-open-1/submit",
    url: `${SMOKE_URL}/challenges/test-open-1/submit`,
    expectedStatus: 307,
  },
  {
    name: "GET /challenges/test-judging-1/submit",
    url: `${SMOKE_URL}/challenges/test-judging-1/submit`,
    expectedStatus: 200,
  },
  {
    name: "GET /challenges/test-archived-1/submit",
    url: `${SMOKE_URL}/challenges/test-archived-1/submit`,
    expectedStatus: 200,
  },
  {
    name: "GET /challenges/does-not-exist/submit",
    url: `${SMOKE_URL}/challenges/does-not-exist/submit`,
    expectedStatus: 404,
  },
  {
    name: "GET /challenges (re-verify G3 smoke still passes after G4 landed)",
    url: `${SMOKE_URL}/challenges`,
    expectedStatus: 200,
  },
];

let passed = 0;
let failed = 0;

async function runTest(test) {
  try {
    const response = await fetch(test.url, { redirect: "manual" });
    const status = response.status;

    if (status !== test.expectedStatus) {
      console.log(`\x1b[31m✗ ${test.name}\x1b[0m`);
      console.log(`  Expected status ${test.expectedStatus}, got ${status}`);
      failed++;
      return;
    }

    console.log(`\x1b[32m✓ ${test.name}\x1b[0m`);
    passed++;
  } catch (err) {
    console.log(`\x1b[31m✗ ${test.name}\x1b[0m`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log(`Running smoke tests against ${SMOKE_URL}\n`);

  for (const test of tests) {
    await runTest(test);
  }

  // Run youtube.spec.mjs via spawnSync
  console.log("\nRunning youtube.spec.mjs validator...");
  const youtubeResult = spawnSync("node", ["src/lib/validation/youtube.spec.mjs"], {
    stdio: "inherit",
  });

  if (youtubeResult.status === 0) {
    console.log(`\x1b[32m✓ youtube.spec.mjs\x1b[0m`);
    passed++;
  } else {
    console.log(`\x1b[31m✗ youtube.spec.mjs: exit=${youtubeResult.status}\x1b[0m`);
    failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

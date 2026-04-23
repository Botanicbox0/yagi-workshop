#!/usr/bin/env node

/**
 * Smoke test for /challenges routes + sitemap.
 *
 * Usage:
 *   node tests/e2e/challenges.smoke.mjs           (assumes dev server on :3003)
 *   SMOKE_URL=https://studio.yagiworkshop.xyz node tests/e2e/challenges.smoke.mjs
 *
 * Exit codes:
 *   0: all tests pass
 *   1: any test fails
 */

const SMOKE_URL = process.env.SMOKE_URL || "http://localhost:3003";

const tests = [
  {
    name: "GET /challenges",
    url: `${SMOKE_URL}/challenges`,
    expectedStatus: 200,
  },
  {
    name: "GET /challenges/test-open-1",
    url: `${SMOKE_URL}/challenges/test-open-1`,
    expectedStatus: 200,
  },
  {
    name: "GET /challenges/test-open-1/gallery",
    url: `${SMOKE_URL}/challenges/test-open-1/gallery`,
    expectedStatus: 200,
  },
  {
    name: "GET /challenges/test-announced-1",
    url: `${SMOKE_URL}/challenges/test-announced-1`,
    expectedStatus: 200,
  },
  {
    name: "GET /challenges/test-announced-1/gallery",
    url: `${SMOKE_URL}/challenges/test-announced-1/gallery`,
    expectedStatus: 200,
  },
  {
    name: "GET /challenges/test-archived-1",
    url: `${SMOKE_URL}/challenges/test-archived-1`,
    expectedStatus: 200,
  },
  {
    name: "GET /challenges/does-not-exist",
    url: `${SMOKE_URL}/challenges/does-not-exist`,
    expectedStatus: 404,
  },
  {
    name: "GET /challenges/does-not-exist/gallery",
    url: `${SMOKE_URL}/challenges/does-not-exist/gallery`,
    expectedStatus: 404,
  },
  {
    name: "GET /sitemap.xml (contains /challenges)",
    url: `${SMOKE_URL}/sitemap.xml`,
    expectedStatus: 200,
    bodyCheck: (body) => body.includes("/challenges"),
  },
];

let passed = 0;
let failed = 0;

async function runTest(test) {
  try {
    const response = await fetch(test.url);
    const status = response.status;

    if (status !== test.expectedStatus) {
      console.log(`\x1b[31m✗ ${test.name}\x1b[0m`);
      console.log(`  Expected status ${test.expectedStatus}, got ${status}`);
      failed++;
      return;
    }

    if (test.bodyCheck) {
      const body = await response.text();
      if (!test.bodyCheck(body)) {
        console.log(`\x1b[31m✗ ${test.name}\x1b[0m`);
        console.log(`  Body check failed`);
        failed++;
        return;
      }
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

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

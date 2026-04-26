#!/usr/bin/env node
// =============================================================================
// Phase 2.8.1 G_B1-F — saveVersion RPC race regression test
// =============================================================================
// Spawns two parallel calls to the save_brief_version RPC against an
// existing project (provided via env) and asserts both succeed with
// distinct sequential version_n values. Pre-2.8.1 the same scenario
// raced on UNIQUE (project_id, version_n) and the second call returned
// a 23505 error.
//
// Required env (else SKIP, exit 0):
//   - NEXT_PUBLIC_SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - TEST_BRIEF_PROJECT_ID  — existing project with an editing brief
//                              (caller's role is ignored; service role
//                              bypasses RLS to call the RPC).
//
// Run: node scripts/test-saveversion-race.mjs
// =============================================================================

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = process.env.TEST_BRIEF_PROJECT_ID;

if (!url || !serviceKey || !projectId) {
  console.log(
    "SKIP: test-saveversion-race — set NEXT_PUBLIC_SUPABASE_URL, " +
      "SUPABASE_SERVICE_ROLE_KEY, TEST_BRIEF_PROJECT_ID to run live.",
  );
  process.exit(0);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

console.log(`saveVersion race test — project ${projectId}`);

const start = Date.now();
const [a, b] = await Promise.all([
  supabase.rpc("save_brief_version", {
    p_project_id: projectId,
    p_label: "race-test-A",
  }),
  supabase.rpc("save_brief_version", {
    p_project_id: projectId,
    p_label: "race-test-B",
  }),
]);
const elapsed = Date.now() - start;

let pass = 0;
let fail = 0;

if (a.error) {
  fail++;
  console.error(`  ✗ A failed: ${a.error.message}`);
} else {
  pass++;
  console.log(`  ✓ A versionN=${a.data?.versionN}`);
}
if (b.error) {
  fail++;
  console.error(`  ✗ B failed: ${b.error.message}`);
} else {
  pass++;
  console.log(`  ✓ B versionN=${b.data?.versionN}`);
}

if (!a.error && !b.error) {
  if (a.data.versionN === b.data.versionN) {
    fail++;
    console.error(
      `  ✗ duplicate versionN — both calls returned ${a.data.versionN}`,
    );
  } else {
    pass++;
    console.log(`  ✓ distinct version_n (${a.data.versionN}, ${b.data.versionN})`);
  }
}

console.log(`elapsed ${elapsed}ms`);
console.log(`Results: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);

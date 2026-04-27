# Phase 2.8.1 — Supabase migration history repair script
#
# Why this exists:
# Yagi's prod DB at jvamvbpxnztynsccvcmr was built up over many sessions
# with timestamps like 20260421094855 (HHMMSS = actual apply time),
# while the local repo's migrations use clean timestamps like
# 20260422120000 (HHMMSS = 000000). The timestamp patterns diverged
# at some point in early development, leaving 34 remote migrations
# that local doesn't know about.
#
# This script marks all 34 remote migrations as `reverted` in the
# supabase_migrations.schema_migrations table. This is a cosmetic
# operation — it does NOT touch the actual schema (tables/RLS/policies).
# It just makes `supabase db push` stop complaining about history drift.
#
# After running this:
#   npx supabase db push --linked
# will apply only the new Phase 2.8.1 migrations:
#   20260427000000_phase_2_8_1_wizard_draft.sql
#   20260427010000_phase_2_8_1_save_brief_version_rpc.sql
#   20260427020000_phase_2_8_1_commission_convert.sql
#
# Reversibility: if something goes wrong, run:
#   npx supabase migration repair --status applied <timestamp>
# for any of the 34 timestamps below.
#
# Safety: read-only on schema. Only modifies the migrations history table.

$ErrorActionPreference = "Stop"

$timestamps = @(
    "20260421094855",
    "20260421111438",
    "20260421111821",
    "20260421144125",
    "20260421151853",
    "20260421152247",
    "20260421152340",
    "20260421152527",
    "20260421155607",
    "20260421160732",
    "20260421163403",
    "20260421164337",
    "20260421173130",
    "20260421184457",
    "20260421190605",
    "20260421191907",
    "20260421192848",
    "20260421193609",
    "20260421193815",
    "20260421201501",
    "20260421201618",
    "20260421202715",
    "20260421205517",
    "20260423071448",
    "20260423083920",
    "20260423090700",
    "20260423123141",
    "20260423123211",
    "20260423184823",
    "20260424021431",
    "20260424024158",
    "20260424030646",
    "20260425095621",
    "20260425154517"
)

Write-Host "Marking $($timestamps.Count) remote migrations as reverted..."
Write-Host "(This is cosmetic — does NOT touch schema. Just cleans up history.)"
Write-Host ""

# Single command, all timestamps as args (faster than 34 separate calls).
$args = $timestamps -join " "
$cmd = "npx supabase migration repair --status reverted $args"

Write-Host "Running: $cmd"
Write-Host ""

Invoke-Expression $cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "OK — history repaired. Next:" -ForegroundColor Green
    Write-Host "  npx supabase db push --linked"
    Write-Host ""
    Write-Host "Expected output: 3 new migrations applied"
    Write-Host "  20260427000000_phase_2_8_1_wizard_draft.sql"
    Write-Host "  20260427010000_phase_2_8_1_save_brief_version_rpc.sql"
    Write-Host "  20260427020000_phase_2_8_1_commission_convert.sql"
} else {
    Write-Host ""
    Write-Host "FAILED — exit code $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Check the error message above and rerun manually if needed."
}

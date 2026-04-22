# ============================================================
# Deploy all Supabase Edge Functions for YAGI Workshop
# ============================================================
# Usage (from project root):
#   .\scripts\deploy-edge-functions.ps1
#
# Deploys every function in supabase/functions/ to the linked project.
# notify-dispatch is deployed with verify_jwt=true (service-role only).
# ============================================================

$ErrorActionPreference = "Continue"
# yagi-workshop project (ap-southeast-1) — the correct one for this Next.js app.
# (vvsyqcbplxjiqomxrrew was YAGI STUDIO, the legacy public marketplace. Do not use.)
$projectRef = "jvamvbpxnztynsccvcmr"

# 1. Verify Supabase CLI
Write-Host "`n[1/3] Checking Supabase CLI..." -ForegroundColor Cyan
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "  Supabase CLI not found. Install: winget install Supabase.CLI" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: $(supabase --version 2>`$null)" -ForegroundColor Green

# 2. List functions to deploy
Write-Host "`n[2/3] Discovering functions..." -ForegroundColor Cyan
$functionsDir = "supabase\functions"
if (-not (Test-Path $functionsDir)) {
    Write-Host "  No $functionsDir directory found." -ForegroundColor Red
    exit 1
}

$functions = Get-ChildItem $functionsDir -Directory | Where-Object {
    Test-Path (Join-Path $_.FullName "index.ts")
}

if ($functions.Count -eq 0) {
    Write-Host "  No functions found with index.ts" -ForegroundColor Red
    exit 1
}

Write-Host "  Found $($functions.Count) function(s):" -ForegroundColor Green
foreach ($f in $functions) { Write-Host "    - $($f.Name)" -ForegroundColor Gray }

# 3. Deploy each function
Write-Host "`n[3/3] Deploying functions..." -ForegroundColor Cyan

$deployed = 0
$failed = 0

foreach ($f in $functions) {
    $name = $f.Name
    Write-Host "`n  Deploying $name..." -ForegroundColor Gray

    # verify_jwt stays on (default) — notify-dispatch enforces service_role itself.
    supabase functions deploy $name --project-ref $projectRef 2>&1 | ForEach-Object {
        Write-Host "    $_" -ForegroundColor DarkGray
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "    OK" -ForegroundColor Green
        $deployed++
    } else {
        Write-Host "    FAILED" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n=== Deployment summary ===" -ForegroundColor Cyan
Write-Host "  Deployed: $deployed" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "  Failed:   $failed" -ForegroundColor Red
}

Write-Host "`nVerify at:" -ForegroundColor Gray
Write-Host "  https://supabase.com/dashboard/project/$projectRef/functions" -ForegroundColor Gray

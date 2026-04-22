# ============================================================
# Supabase secrets setup for Phase 1.8 notify-dispatch
# ============================================================
# Usage (from project root in PowerShell):
#   .\scripts\setup-supabase-secrets.ps1
#
# Prerequisites:
#   - Supabase CLI installed (winget install Supabase.CLI or scoop install supabase)
#   - .env.local populated with RESEND_API_KEY, ANTHROPIC_API_KEY, etc.
# ============================================================

# Continue on stderr — PowerShell 5.1 wraps native exe stderr as NativeCommandError
# which triggers "Stop" even on benign warnings. Continue is safer for CLI orchestration.
$ErrorActionPreference = "Continue"
# yagi-workshop project (ap-southeast-1) — the correct one for this Next.js app.
# (vvsyqcbplxjiqomxrrew was YAGI STUDIO, the legacy public marketplace. Do not use.)
$projectRef = "jvamvbpxnztynsccvcmr"
$envFile = ".env.local"

# 1. Verify Supabase CLI
Write-Host "`n[1/5] Checking Supabase CLI..." -ForegroundColor Cyan
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "  Supabase CLI not found." -ForegroundColor Red
    Write-Host "  Install: winget install Supabase.CLI" -ForegroundColor Yellow
    exit 1
}
$version = supabase --version 2>$null
Write-Host "  Supabase CLI: $version" -ForegroundColor Green

# 2. Verify .env.local exists
Write-Host "`n[2/5] Reading $envFile..." -ForegroundColor Cyan
if (-not (Test-Path $envFile)) {
    Write-Host "  $envFile not found in $(Get-Location)" -ForegroundColor Red
    exit 1
}

# Parse env file into hashtable (skip comments and empty lines)
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line -split "=", 2
        $key = $parts[0].Trim()
        $val = $parts[1].Trim()
        if ($val) { $envVars[$key] = $val }
    }
}
Write-Host "  Parsed $($envVars.Count) variables from $envFile" -ForegroundColor Green

# 3. Check login status
Write-Host "`n[3/5] Checking Supabase auth..." -ForegroundColor Cyan
supabase projects list 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Not logged in. Running 'supabase login' — browser will open." -ForegroundColor Yellow
    supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Login failed." -ForegroundColor Red
        exit 1
    }
}
Write-Host "  Logged in." -ForegroundColor Green

# 4. Link project if not already linked
Write-Host "`n[4/5] Linking project $projectRef..." -ForegroundColor Cyan
if (-not (Test-Path "supabase\.temp\project-ref")) {
    supabase link --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Link failed." -ForegroundColor Red
        exit 1
    }
}
Write-Host "  Linked." -ForegroundColor Green

# 5. Set secrets needed by Edge Functions
Write-Host "`n[5/5] Setting secrets on Supabase..." -ForegroundColor Cyan

# Only these need to be on Supabase (Edge Functions read them)
$secretsToSet = @(
    "RESEND_API_KEY",
    "ANTHROPIC_API_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID"
)

foreach ($key in $secretsToSet) {
    if ($envVars.ContainsKey($key) -and $envVars[$key]) {
        $value = $envVars[$key]
        Write-Host "  Setting $key..." -ForegroundColor Gray
        supabase secrets set "$key=$value" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    OK" -ForegroundColor Green
        } else {
            Write-Host "    FAILED" -ForegroundColor Red
        }
    } else {
        Write-Host "  $key not in $envFile, skipping" -ForegroundColor Yellow
    }
}

# Display final state (keys only, no values)
Write-Host "`n=== Current secrets on Supabase ===" -ForegroundColor Cyan
supabase secrets list

Write-Host "`nDone. Next: register cron job in Supabase Dashboard." -ForegroundColor Green
Write-Host "  https://supabase.com/dashboard/project/$projectRef/database/cron-jobs" -ForegroundColor Gray

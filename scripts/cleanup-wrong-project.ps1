# ============================================================
# Cleanup: remove mistakenly-installed resources from YAGI STUDIO
# (vvsyqcbplxjiqomxrrew, ap-northeast-1, legacy public marketplace)
# ============================================================
# Earlier today we accidentally installed notify-dispatch Edge Function,
# cron job, and Supabase secrets into YAGI STUDIO instead of yagi-workshop.
# This script removes those so the wrong project stays clean.
#
# The SQL in step 3 must be run manually in YAGI STUDIO SQL Editor — the
# CLI can't unschedule pg_cron jobs remotely. Instructions printed below.
# ============================================================

$ErrorActionPreference = "Continue"
$wrongProjectRef = "vvsyqcbplxjiqomxrrew"

Write-Host "`n=== Cleaning up YAGI STUDIO (wrong project) ===" -ForegroundColor Yellow
Write-Host "  Project ref: $wrongProjectRef" -ForegroundColor Gray

# 1. Remove Edge Function
Write-Host "`n[1/3] Deleting notify-dispatch Edge Function from YAGI STUDIO..." -ForegroundColor Cyan
supabase functions delete notify-dispatch --project-ref $wrongProjectRef 2>&1 | ForEach-Object {
    Write-Host "    $_" -ForegroundColor DarkGray
}
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK" -ForegroundColor Green
} else {
    Write-Host "  Failed or already gone (continuing)" -ForegroundColor Yellow
}

# 2. Unset secrets
Write-Host "`n[2/3] Unsetting secrets from YAGI STUDIO..." -ForegroundColor Cyan
$secretsToUnset = @("RESEND_API_KEY","ANTHROPIC_API_KEY","TELEGRAM_BOT_TOKEN","TELEGRAM_CHAT_ID")
foreach ($key in $secretsToUnset) {
    Write-Host "  Removing $key..." -ForegroundColor Gray
    supabase secrets unset $key --project-ref $wrongProjectRef 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    OK" -ForegroundColor Green
    } else {
        Write-Host "    Not set or already gone" -ForegroundColor Yellow
    }
}

# 3. Print manual cleanup SQL for cron + vault
Write-Host "`n[3/3] Manual SQL cleanup required" -ForegroundColor Cyan
Write-Host @"

  pg_cron and Vault cleanup cannot run via CLI. Open the SQL Editor for
  the WRONG project and run the SQL below:

  https://supabase.com/dashboard/project/$wrongProjectRef/sql/new

  -- Unschedule the cron job
  select cron.unschedule('notify-dispatch');

  -- Remove the service_role_key we stored in Vault
  -- (only do this if you don't use pg_cron for anything else on this project)
  delete from vault.secrets where name = 'service_role_key';

  -- Verify both are gone
  select jobname from cron.job;
  select name from vault.decrypted_secrets;

"@ -ForegroundColor Gray

Write-Host "Done with CLI cleanup. Run the SQL above to finish." -ForegroundColor Green

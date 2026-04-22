# Subtask 10 result
status: complete
files_created:
  - src/lib/resend.ts (636 bytes)
  - src/lib/supabase/service.ts (685 bytes)
  - src/lib/email/new-message.ts (5429 bytes)
files_modified:
  - src/app/[locale]/app/projects/[id]/thread-actions.ts (insert reshape to .select("id").single() + fire-and-forget notifyNewMessage call for shared visibility only + 1 import)
deps_added:
  - none  # resend already installed in subtask 03
schema_adjustments:
  - projects.title confirmed as non-null text column — used directly in subject
  - thread_messages.body is string | null → guarded with ?? "" before preview slicing
graceful_degrade:
  - RESEND_API_KEY absent → getResend returns null, notify logs + returns; no throw
  - Missing recipient emails skipped (auth.admin.getUserById returns no user)
locale_routing: yes  # per-recipient profiles.locale drives subject/body + project URL locale segment (/ko/... vs /en/...)
fire_and_forget: yes  # sendMessage returns { ok: true } without awaiting notifyNewMessage
server_only_guards: yes  # all three new lib files start with import "server-only"
tsc_check: clean
acceptance: PASS — resend singleton, recipient fan-out with dedup, bilingual template, fire-and-forget wired into sendMessage for shared visibility only. Evaluator verdict PASS on all 15 checks.

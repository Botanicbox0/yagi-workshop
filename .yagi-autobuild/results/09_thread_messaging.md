# Subtask 09 result
status: complete
files_created:
  - src/components/project/thread-panel.tsx (8347 bytes)
  - src/components/project/thread-panel-server.tsx (2151 bytes)
  - src/app/[locale]/app/projects/[id]/thread-actions.ts (2416 bytes)
files_modified:
  - src/app/[locale]/app/projects/[id]/page.tsx (Thread section only)
shadcn_components_added:
  - switch (pnpm dlx shadcn@2.1.8 add switch)
db_column_adjustments:
  - project_threads: no 'kind' column in schema — omitted from INSERT (used project_id + created_by only)
  - project_threads: 'created_by' is required on INSERT — included in thread auto-creation
  - thread_messages: 'author_id' confirmed correct (not sender_id or created_by)
  - Profiles fetched separately in thread-panel-server.tsx via bulk .in() query (FK-hint syntax avoided)
realtime_channel: project:{projectId}:thread
server_side_internal_check: yes  # yagi_admin role re-verified server-side in thread-actions.ts
tsc_check: clean (zero errors from subtask 09 files; one pre-existing error in reference-grid.tsx from subtask 08 running in parallel)
acceptance: PASS — thread renders via ThreadPanelServer, realtime subscribed on channel project:{projectId}:thread, visibility toggle role-gated (isYagiAdmin only), server enforces internal check via user_roles query, default thread auto-created on first message with created_by set.

## Loop 2 patch
- Added `useTranslations("errors")` alongside existing `useTranslations("threads")` in thread-panel.tsx
- Replaced 2 hardcoded toast.error English strings with `tErrors("unauthorized")` and `tErrors("generic")`
- tsc clean

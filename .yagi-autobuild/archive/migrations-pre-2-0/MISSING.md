# Pre-Phase-2.0 migrations — archive + disk/remote reconciliation

> **Captured:** 2026-04-22 (Phase 2.0 G2)
> **Superseded by:** `supabase/migrations/20260422120000_phase_2_0_baseline.sql`
> **Rationale:** Phase 2.0 Option C baseline squash. See `.yagi-autobuild/phase-2-0/SPEC.md` G2 and `.yagi-autobuild/snapshots/phase-1-9/ROLLBACK.md` Level 2.

This directory preserves every migration file that existed on disk at Phase 1.9 ship, plus a forensic index of the 10 migrations that were applied to remote via MCP `apply_migration` without a matching disk file. After G2 runs, the live schema is reproduced from the single baseline file; these archived files exist only for historical diff / audit.

## Reconciliation against remote `supabase_migrations.schema_migrations`

Remote has 23 entries. Disk (pre-archive) had 12 numbered migrations + 1 auxiliary snapshot file. Mapping:

### A. Exact match (version + name): 2 entries
| Remote version | Name | Disk file |
|---|---|---|
| 20260421094855 | phase1_schema | 20260421094855_phase1_schema.sql |
| 20260421173130 | phase_1_5_invoicing_20260422 | 20260421173130_phase_1_5_invoicing_20260422.sql |

### B. Same DDL content, re-timestamped on disk: 11 entries
The disk filenames use a later `20260422*` timestamp than the remote-recorded version (`20260421*`). Same migration content; timestamp drift comes from the CLI's auto-timestamp on `supabase migration new` vs the MCP `apply_migration` insert time.

| Remote version | Name | Archived disk file (different timestamp) |
|---|---|---|
| 20260421184457 | phase_1_7_team_channels | 20260422010000_phase_1_7_team_channels.sql |
| 20260421190605 | phase_1_7_team_chat_last_seen | 20260422060000_phase_1_7_team_chat_last_seen.sql |
| 20260421191907 | phase_1_7_team_chat_realtime | 20260422060500_phase_1_7_team_chat_realtime.sql |
| 20260421192848 | phase_1_7_team_chat_fixups | 20260422070000_phase_1_7_team_chat_fixups.sql |
| 20260421193609 | phase_1_8_notifications | 20260422080000_phase_1_8_notifications.sql |
| 20260421193815 | phase_1_8_notifications_helpers | 20260422080500_phase_1_8_notifications_helpers.sql |
| 20260421201501 | phase_1_8_notifications_unsub_rls | 20260422090000_phase_1_8_notifications_unsub_rls.sql |
| 20260421201618 | phase_1_8_notif_debounce_uniq | 20260422090500_phase_1_8_notif_debounce_uniq.sql |
| 20260421202715 | phase_1_9_showcases | 20260422100000_phase_1_9_showcases.sql |
| 20260421205517 | phase_1_9_showcases_fixups | 20260422110000_phase_1_9_showcases_fixups.sql |
| (n/a — auxiliary) | — | _current_remote_schema_snapshot.sql |

### C. MCP-only: 10 entries with no disk file at all
These were applied via Supabase MCP `apply_migration` during the autopilot chain for Phase 1.1/1.2.5/1.3/1.4. The SQL never landed on disk. Their DDL is preserved as part of the Phase 1.9 live schema, which is captured in the Phase 2.0 baseline dump.

| Remote version | Name | Likely content (from Phase summaries) |
|---|---|---|
| 20260421111438 | bootstrap_workspace_rpc | `bootstrap_workspace(p_name, p_slug, p_logo_url)` SECURITY DEFINER RPC (Phase 1.1) |
| 20260421111821 | phase1_1_workspace_bootstrap_rpc | Follow-up hardening on `bootstrap_workspace` (Phase 1.1) |
| 20260421144125 | storage_policy_hardening_20260421 | Storage bucket RLS tightening across avatars / brand-logos / workspace-logos (Phase 1.1 post-ship fix) |
| 20260421151853 | projects_update_rls_hardening_20260422 | Projects UPDATE policy WITH CHECK clause (Phase 1.2 fix) |
| 20260421152247 | phase_1_2_5_video_pdf_intake_attachments_20260422 | Thread message attachments + video/PDF intake support (Phase 1.2.5 primary) |
| 20260421152340 | thread_attachments_storage_rls_20260422 | `thread-attachments` storage bucket + path-gated RLS (Phase 1.2.5) |
| 20260421152527 | phase_1_2_5_align_with_spec_20260422 | Phase 1.2.5 spec alignment patches |
| 20260421155607 | phase_1_2_5_thread_attachments_storage_internal_hide_20260422 | Internal-hidden attachment visibility per Phase 1.7 lessons |
| 20260421160732 | phase_1_3_meetings_20260422 | Meetings table + RLS + attendee join + `meetings_sync_workspace_id` triggers (Phase 1.3) |
| 20260421163403 | phase_1_3_meetings_workspace_derived_20260422 | `workspace_id` derivation trigger hardening (Phase 1.3 fixup) |
| 20260421164337 | phase_1_4_preprod_board_20260422 | Preprod boards + frames + revisions + share tokens + RLS (Phase 1.4) |

**Cross-refs:** Full feature context in `.yagi-autobuild/summary-phase-1-1.md` through `summary-phase-1-4.md` (where written). Live schema object list in `.yagi-autobuild/snapshots/phase-1-9/schema-snapshot.md`.

---

## Rollback reference

Level 2 rollback (undo baseline registration, restore these files to `supabase/migrations/`) is documented in `.yagi-autobuild/snapshots/phase-1-9/ROLLBACK.md`. This archive is the source for that restore.

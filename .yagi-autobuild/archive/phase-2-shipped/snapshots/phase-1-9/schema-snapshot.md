# Phase 1.9 Schema Snapshot

> **Captured:** 2026-04-22 (Phase 2.0 G0)
> **Method:** Supabase MCP `execute_sql` queries against live remote DB. NOT a `pg_dump` (Docker Desktop unavailable in this environment, and `pg_dump` is not on the system PATH).
> **Use:** Sanity reference for post-Phase-2.0 schema diff. If catastrophic schema loss occurs, use Supabase Dashboard → Database → Backups (PITR) for byte-exact restore — this Markdown is the inventory cross-check, not a replay script.

---

## Public schema — 30 tables

```
brands, invoice_line_items, invoices, meeting_attendees, meetings,
notification_events, notification_preferences, notification_unsubscribe_tokens,
preprod_boards, preprod_frame_comments, preprod_frame_reactions, preprod_frames,
profiles, project_deliverables, project_milestones, project_references,
project_threads, projects,
showcase_media, showcases,
supplier_profile,
team_channel_message_attachments, team_channel_messages, team_channels,
thread_message_attachments, thread_messages,
user_roles, workspace_invitations, workspace_members, workspaces
```

---

## Public schema — 12 functions / triggers

| Name | Args | Returns | Security |
|---|---|---|---|
| `bootstrap_workspace` | `p_name text, p_slug text, p_logo_url text` | uuid | DEFINER |
| `increment_showcase_view` | `sid uuid` | integer | DEFINER |
| `is_ws_admin` | `uid uuid, wsid uuid` | boolean | DEFINER |
| `is_ws_member` | `uid uuid, wsid uuid` | boolean | DEFINER |
| `is_yagi_admin` | `uid uuid` | boolean | DEFINER |
| `is_yagi_internal_ws` | `ws_id uuid` | boolean | DEFINER |
| `meetings_sync_workspace_id` | (trigger) | trigger | DEFINER |
| `preprod_boards_set_workspace_id` | (trigger) | trigger | DEFINER |
| `recalc_invoice_totals` | (trigger) | trigger | DEFINER |
| `resolve_user_ids_by_emails` | `p_emails text[]` | TABLE(email text, user_id uuid) | DEFINER |
| `tg_set_updated_at` | (trigger) | trigger | INVOKER |
| `tg_touch_updated_at` | (trigger) | trigger | INVOKER |

Plus the Supabase Vault helper (`supabase_vault.create_secret`) is available via the `supabase_vault` extension.

---

## Public schema — RLS policies (count: 73)

Every public table has at least one policy. The matrix below lists each table and the cmd-level policy coverage. Detailed predicate text was captured in the snapshot query — see ROLLBACK.md for how to re-query.

| Table | SELECT | INSERT | UPDATE | DELETE | ALL |
|---|---|---|---|---|---|
| brands | ✅ | | | | ✅ admin |
| invoice_line_items | ✅ | | | | ✅ admin |
| invoices | ✅×2 (drafts/mocks hidden from clients) | ✅ | ✅ | | |
| meeting_attendees | ✅ | ✅ | | | |
| meetings | ✅ | ✅ | ✅ | | |
| notification_events | ✅ own | | ✅ own (WITH CHECK) | | |
| notification_preferences | ✅ own | ✅ own | ✅ own | | |
| notification_unsubscribe_tokens | | | | | ✅ deny-all (service-role only) |
| preprod_boards | ✅ | ✅ | ✅ (WITH CHECK) | ✅ | |
| preprod_frame_comments | ✅ | | ✅ (WITH CHECK) | | |
| preprod_frame_reactions | ✅ | | | | |
| preprod_frames | ✅ | ✅ | ✅ (WITH CHECK) | ✅ | |
| profiles | ✅ public-read | ✅ self | ✅ self (WITH CHECK) | | |
| project_deliverables | | | | | ✅ ws-member |
| project_milestones | | | | | ✅ ws-member (WITH CHECK admin) |
| project_references | | | | | ✅ ws-member |
| project_threads | | | | | ✅ ws-member |
| projects | ✅ | ✅ admin | ✅ admin (WITH CHECK) | ✅ yagi | |
| showcase_media | ✅ | ✅ yagi | ✅ yagi | ✅ yagi | |
| showcases | ✅ internal | ✅ yagi | ✅ internal (WITH CHECK) | ✅ yagi | |
| supplier_profile | ✅ yagi | | ✅ yagi (WITH CHECK) | | |
| team_channel_message_attachments | ✅ yagi-internal-ws | ✅ author | | | |
| team_channel_messages | ✅ yagi-internal-ws | ✅ author + ws | ✅ author (WITH CHECK) | ✅ author/yagi | |
| team_channels | ✅ yagi-internal-ws | ✅ admin | ✅ admin | | |
| thread_message_attachments | ✅×2 (internal-hidden) | ✅ author | | ✅ author/yagi | |
| thread_messages | ✅ visibility-gated | ✅ author+visibility | | | ✅ ws-member |
| user_roles | ✅ self/yagi | ✅×2 (creator + ws-admin self-bootstrap) | | | ✅ yagi |
| workspace_invitations | ✅ admin | | | | ✅ admin (WITH CHECK) |
| workspace_members | ✅ ws-member | ✅ self-bootstrap | | ✅ admin | |
| workspaces | ✅ ws-member | ✅ any-auth | ✅ admin (WITH CHECK) | ✅ yagi | |

**Key invariant (post-Phase-1.9-fixups):** every UPDATE policy across the schema either has a `WITH CHECK` clause or is a service-role-only path. The Phase 1.9 H1 fix retroactively added `WITH CHECK` to `showcases_update_internal`. Phase 2.0 G2 baseline must preserve all WITH CHECK clauses.

---

## Storage — 26 RLS policies on `storage.objects`

| Bucket | Public | Read | Write | Update | Delete |
|---|---|---|---|---|---|
| avatars | no | public | self-folder | owner | |
| brand-logos | yes | public | any-auth | | |
| preprod-frames | no | ws-member | ws-admin | | ws-admin/yagi |
| project-deliverables | no | ws-member (path-gated) | any-auth | | |
| project-references | no | ws-member (path-gated) | ws-member (path-gated) | | |
| showcase-media | no | yagi/ws-member | yagi | yagi | yagi |
| showcase-og | yes | public | yagi | yagi | yagi |
| team-channel-attachments | no | yagi-internal-ws (path-gated) | yagi-internal-ws (path-gated) | | |
| thread-attachments | no | ws-member (path-gated, internal-hidden) | ws-member | | author/yagi |
| workspace-logos | yes | public | any-auth | | |

---

## Triggers (count: 19)

Touch-updated-at triggers on: `brands, invoices, meetings, notification_preferences, preprod_boards, preprod_frame_reactions, preprod_frames, profiles, projects, showcases, supplier_profile, team_channels, workspaces`.

Special triggers:
- `meetings_sync_workspace_id_ins/upd` — derive `workspace_id` from `project_id` (Phase 1.3)
- `preprod_boards_set_workspace_id_ins` — same pattern (Phase 1.4)
- `invoice_items_recalc` — INSERT/UPDATE/DELETE recalc of invoice totals (Phase 1.5)

---

## Indexes (count: 91)

Notable partial / unique indexes that Phase 2.0 baseline MUST preserve:

- `notif_events_debounce_uniq` — partial unique on `(user_id, kind, project_id)` WHERE `email_sent_at IS NULL AND in_app_seen_at IS NULL AND project_id IS NOT NULL AND kind IN ('feedback_received','frame_uploaded_batch')` — Phase 1.8 H4 race fix
- `idx_preprod_frames_one_current` — partial unique on `(revision_group)` WHERE `is_current_revision = true` — Phase 1.4
- `idx_invoices_is_mock` — partial on `(is_mock)` WHERE `is_mock = true` — Phase 1.5 mock mode
- `idx_showcases_published` — partial composite on `(status, published_at DESC)` WHERE `status = 'published'` — Phase 1.9
- `idx_preprod_boards_share_token` — partial unique on `(share_token)` WHERE `share_token IS NOT NULL` — Phase 1.4 share

---

## Realtime publication members (`supabase_realtime`)

```
public.notification_events
public.team_channel_messages
public.team_channel_message_attachments
```

Phase 1.7 + 1.8 are the only realtime-subscribed tables. Phase 1.9 showcases are NOT realtime (they use `revalidate=300` ISR instead).

---

## Storage buckets (count: 10)

| Bucket | Public |
|---|---|
| avatars | private |
| brand-logos | public |
| preprod-frames | private |
| project-deliverables | private |
| project-references | private |
| showcase-media | private |
| showcase-og | public |
| team-channel-attachments | private |
| thread-attachments | private |
| workspace-logos | public |

No bucket has `file_size_limit` or `allowed_mime_types` set at the bucket level — limits are enforced application-side (e.g., `src/lib/team-channels/attachment-caps.ts`).

---

## Extensions

| Name | Version |
|---|---|
| pg_cron | 1.6.4 |
| pg_graphql | 1.5.11 |
| pg_net | 0.20.0 |
| pg_stat_statements | 1.11 |
| pgcrypto | 1.3 |
| plpgsql | 1.0 |
| supabase_vault | 0.3.1 |
| uuid-ossp | 1.1 |

`pg_cron` + `pg_net` are installed but no schedule registered (Phase 1.8 ops blocker — addressed in Phase 2.0 G1).

---

## supabase_migrations.schema_migrations — 23 historical entries

Captured in `migration-list.txt`. Pre-G2 state. After G2 a 24th entry will be added for the Phase 2.0 baseline; the 23 historical entries are preserved (Option C — cosmetic mismatch).

---

**End of schema snapshot.** This is an inventory, not a replay artifact. For byte-exact rollback see `ROLLBACK.md`.

# Phase 1.9 Rollback Runbook

> **Captured:** 2026-04-22 (Phase 2.0 G0)
> **Purpose:** Restore code, schema bookkeeping, or operational state to the Phase 1.9 shipped baseline if any Phase 2.0 group breaks something.
> **Scope:** Code-side rollback is fully scripted. Schema-side rollback documented but not expected to be needed (Phase 2.0 G2 only changes migration *bookkeeping*, not the actual schema DDL).

---

## Rollback levels (least → most disruptive)

### Level 0 — Operational rollback (G1 only)

If `RESEND_API_KEY` was set incorrectly or cron schedule misconfigured:

```bash
# Unset the bad secret
supabase secrets unset RESEND_API_KEY --project-ref jvamvbpxnztynsccvcmr

# Or list current secrets to verify
supabase secrets list --project-ref jvamvbpxnztynsccvcmr

# Remove the cron schedule (if registered via CLI)
supabase functions schedule delete notify-dispatch --project-ref jvamvbpxnztynsccvcmr
```

The notify-dispatch function gracefully no-ops when secret is missing (per Phase 1.8 design). No data loss.

---

### Level 1 — Code rollback (any source-touching group)

```bash
cd C:/Users/yout4/yagi-studio/yagi-workshop

# Verify the tag exists locally
git tag -l | grep phase-1.9-shipped

# DESTRUCTIVE: throws away all uncommitted work + resets to tag.
# Yagi must explicitly authorize before running this.
git reset --hard phase-1.9-shipped

# Force-push if you also want to undo published Phase 2.0 commits.
# DOUBLE-DESTRUCTIVE: rewrites origin history.
# git push --force-with-lease origin main
```

**Notes:**
- The tag `phase-1.9-shipped` points to commit `13b4de2` (HANDOFF.md) on top of `a914cc6` (Phase 1.0-1.9 features).
- All 4 commits (`7dd3f48`, `e9cba13`, `a914cc6`, `13b4de2`) are preserved in the tag.
- After reset, run `pnpm install` (lockfile may have shifted between Phase 2.0 work).

---

### Level 2 — Migration bookkeeping rollback (G2 only)

If G2's baseline registration goes wrong:

```sql
-- Connected to remote DB as service-role.
-- Yagi must explicitly authorize before running this.
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260422120000';
```

Then restore the 12 archived disk migration files:

```bash
# Restore from archive back to migrations/
mv .yagi-autobuild/archive/migrations-pre-2-0/*.sql supabase/migrations/

# Verify
ls supabase/migrations/
# Expected: 12 files matching pattern 20260421*.sql or 20260422*.sql
```

**Why this works:** Phase 2.0 G2 only adds a row to `schema_migrations` and rearranges files on disk. The actual DDL is untouched. Removing the row + restoring files leaves the schema identical and the migration list back to its Phase 1.9 state.

---

### Level 3 — Schema rollback (catastrophic — not expected)

If somehow the actual schema DDL is corrupted (e.g., a manual `DROP TABLE` got past the kill-switch):

**Primary path: Supabase Dashboard PITR.**
1. Open https://supabase.com/dashboard/project/jvamvbpxnztynsccvcmr
2. Database → Backups
3. Select restore point before the corruption (Free plan retains daily backups for 7 days)
4. Restore — this is byte-exact and includes all data.

**Verification path: schema-snapshot.md.**
- Compare post-restore tables, RLS policies, RPCs, triggers, indexes against `schema-snapshot.md`.
- If anything is missing, the snapshot inventory tells you what to look for in the migration archives.

**The schema snapshot is NOT a replay script.** It's a Markdown inventory built from MCP queries (Docker not available for `pg_dump`). For byte-exact replay use PITR.

---

### Level 4 — Total loss (extreme)

If both code AND schema are corrupted beyond local recovery:

1. **Code:** clone fresh from `https://github.com/Botanicbox0/yagi-workshop.git`, then `git checkout phase-1.9-shipped`.
2. **Schema:** PITR restore (see Level 3).
3. **Secrets:** restore `.env.local` from your password manager / 1Password (the SHA-256 in `env-local.sha256` lets you verify the restored file matches what existed at G0 time: `sha256sum .env.local` should output `64c956935bac570b779831c3e711abd51ea9160cf7e317c12f6730f31e0e3ff2  .env.local`).
4. **Storage buckets:** Free plan does not back up Storage objects automatically. Check Supabase Dashboard → Storage for current state.

---

## Post-rollback verification checklist

After any Level 1+ rollback:

- [ ] `pnpm install` exits 0
- [ ] `pnpm tsc --noEmit` exits 0
- [ ] `pnpm build` exits 0 (11 routes registered)
- [ ] `supabase migration list --linked` shows the same 23 entries as `migration-list.txt`
- [ ] `sha256sum .env.local` matches `env-local.sha256`
- [ ] Smoke test: load `/[locale]/app/projects` while logged in, see existing projects
- [ ] Smoke test: open Supabase Dashboard, verify all 30 public tables present

---

## Rollback NOT supported

- **User-uploaded content** (Storage objects: thread-attachments, preprod-frames, showcase-media, etc.) — Free plan, no automatic Storage backups. Loss requires re-upload by users.
- **Realtime subscriber state** — clients reconnect on next page load; no rollback needed.
- **Email-in-flight** — emails already delivered to Resend cannot be unsent. Phase 2.0 G1 may temporarily fire test emails; this is expected and not rolled back.

---

**End of rollback runbook.** Yagi authorizes any Level 1+ action verbally. No automation, no autopilot.

# Wave C.5b sub_10 — DB audit (creator/studio rows)

**Date**: 2026-05-01
**Project**: yagi-workshop (`jvamvbpxnztynsccvcmr`, ap-southeast-1)
**Audit query**: `SELECT id, handle, display_name, role, locale, created_at FROM public.profiles WHERE role IN ('creator','studio')`

## Findings

| metric | count |
|---|---|
| `profiles` rows total | 2 |
| `profiles.role = 'creator'` | **1** |
| `profiles.role = 'studio'` | 0 |
| `profiles.role IS NULL` | 1 |
| `creators` table rows | 1 |
| `studios` table rows | 0 |

The single `creator` row is a **test artifact** created on 2026-05-01
03:15 UTC by `yout40204020@yonsei.ac.kr` (yagi's Yonsei test account)
during sub_03 / earlier dev flow exercises. Tells:

- `handle = "handle"` (literally the i18n placeholder string)
- `display_name = "작품에 표기될 이름"` (the i18n
  `display_name_placeholder` value, now removed in sub_09)
- `creators.display_name = "작품에 표기될 이름"` (same)
- workspace `wefewfef` / slug `wefewfef` (gibberish)
- workspace_member.role = `admin` for that workspace
- 0 projects authored

The row reads as a "stuck mid-onboarding" residue from when the
`/onboarding/profile/creator` form was still present and the user
submitted with placeholder values. That entire flow was deleted in
sub_02; the row's `role='creator'` value now points at a persona
that no longer has any UI affordances in this codebase.

## Recommendation (NOT auto-applied)

Builder did NOT issue a DB write because:

1. The CLAUDE.md "Database write protocol (non-negotiable)" requires
   Codex K-05 adversarial review before any prod DB write. A single
   test-row reclassification does not warrant a Codex spin.
2. `profiles.role = 'creator'` carries no functional consequence in
   the current code — sub_02 dropped the only consumers of that
   role (the /u/<handle> page and /onboarding/profile/creator form).
   The row is **inert**, not actively wrong.
3. yagi may have other test-account intent for this row (e.g. wants
   it preserved for a later regression-test scenario).

If yagi wants it cleaned up manually via Supabase dashboard, the
two reasonable paths are:

**Option A — reclassify to client (active persona)**:
```sql
UPDATE public.profiles SET role = 'client' WHERE id = '73be213d-1306-42f1-bee4-7b77175a6e79';
DELETE FROM public.creators WHERE id = '73be213d-1306-42f1-bee4-7b77175a6e79';
```

**Option B — full account purge** (if it's truly disposable test data):
Use Supabase Dashboard → Authentication → Users → delete user. The
ON DELETE CASCADE on `profiles.id → auth.users.id` handles
profiles/creators/workspace_members cleanup automatically. The
orphan workspace `8f67b0f6-5205-4b06-9f29-a78eaee1caed` ("wefewfef")
becomes a member-less workspace; either delete it manually or run
`DELETE FROM public.workspaces WHERE id = '8f67b0f6-...';`.

The row is **not** a Wave C.5b ship-blocker.

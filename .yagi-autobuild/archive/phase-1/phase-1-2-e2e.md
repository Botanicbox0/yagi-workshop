# YAGI Workshop Phase 1.2 — E2E Manual Smoke Test Runbook

**Generated:** 2026-04-21  
**Version:** 1.0

---

## Prerequisites

- `pnpm dev` is running on `http://localhost:3001`
- Two test accounts are available:
  - **Tester A:** Regular workspace member (yagi_admin role NOT set)
  - **Tester B:** yagi_admin role user (account with `user_roles.role = 'yagi_admin'`)
- Both accounts are members of the same workspace
- Resend API key is configured in `.env.local` (emails will be sent to registered addresses)

---

## Test 1 — Create project

**Goal:** Verify the 3-step new project wizard creates a project with correct status and appears in list.

**Steps:**
1. Sign in as Tester A (regular member).
2. Navigate to `/{locale}/app/projects` (e.g., `/en/app/projects` or `/ko/app/projects`).
3. Click the "New project" CTA.
4. On step 1 (project type): Select "Direct commission" or "Contest brief".
5. On step 2 (brief): Enter a title (e.g., "Test Summer Campaign") and optional description. Leave tone field empty (ghost field). Select deliverable types (e.g., "Film", "Still").
6. On step 3 (review): Click either "Save draft" CTA (status=draft) or "Submit project" CTA (status=submitted).

**Expected:**
- Page redirects to `/{locale}/app/projects/{id}` (project detail).
- Status badge shows `Draft` (if "Save draft" was clicked) or `Submitted` (if "Submit project" was clicked).
- Project appears at the top of the `/{locale}/app/projects` list.

**RLS / data check:**
```sql
SELECT id, title, status, workspace_id, created_by FROM projects ORDER BY created_at DESC LIMIT 1;
```
Should return one row with the newly created project, matching the workspace and creator.

**If it fails, look here:**
- `src/app/[locale]/app/projects/new/page.tsx` (UI)
- `src/app/[locale]/app/projects/new/actions.ts` (createProject server action)
- `src/app/[locale]/app/projects/page.tsx` (list rendering)

---

## Test 2 — Reference collector

**Goal:** Verify image uploads and URL unfurl functionality in the reference collector.

**Steps:**
1. Open the project detail page from Test 1 (or create a new project).
2. Scroll to the "References" section.
3. **Image uploads:** Click the image uploader or drag two image files (JPEG, PNG, WebP, or GIF; ≤10 MB each) into the upload zone.
4. **URL unfurl:** Click the "Add URL" tab. Paste a public URL (e.g., Instagram post link or any page with OG metadata). Observe the spinner; wait for metadata to populate.

**Expected:**
- Two image cards render in a grid, displaying via signed URLs (1-hour expiry).
- URL card displays the OG title and thumbnail image from the target page.
- All three reference cards are visible in the grid.

**RLS / data check:**
```sql
SELECT id, kind_inferred, og_title, storage_path, added_by FROM project_references WHERE project_id = '<project-id>';
```
Should show 3 rows:
- Two with `storage_path` (image uploads), `og_title = null`, `kind_inferred = 'image'`
- One with `og_title` populated, `storage_path = null`, `kind_inferred = 'url'`

Note: There is no `kind` column; the type is inferred at runtime based on presence of `storage_path` vs `url`.

**If it fails, look here:**
- `src/components/project/reference-uploader.tsx` (uploader UI)
- `src/components/project/reference-grid.tsx` (display)
- `src/app/api/unfurl/route.ts` (OG metadata fetch)
- `src/app/[locale]/app/projects/[id]/actions.ts` (reference creation)

---

## Test 3 — Thread conversation

**Goal:** Verify thread messaging with visibility toggle, RLS enforcement, and email delivery.

**Steps:**

1. **As Tester A (regular member):**
   - Open the project detail page.
   - Scroll to the "Messages" section.
   - Type a message in the input field (e.g., "Feedback on deliverables").
   - Click "Send".
   - Observe: The message appears immediately in the thread.
   - Verify: The visibility toggle is NOT visible (only yagi_admin sees it).

2. **As Tester B (yagi_admin):**
   - Navigate to `/{locale}/app/admin/projects`.
   - Click on the same project.
   - Scroll to the "Messages" section.
   - Observe: Tester A's message is visible here.
   - Type an internal reply (e.g., "Reviewing your feedback"). Toggle the "Internal (YAGI only)" visibility button ON.
   - Click "Send".

3. **Back as Tester A:**
   - Refresh the project detail page (or wait for Realtime update).
   - Verify: The internal message from Tester B is NOT visible (RLS enforces this).

4. **As Tester B:**
   - Return to the admin project view.
   - Type a shared reply (e.g., "We'll revise the color palette"). Toggle the visibility button OFF ("Shared (everyone sees)").
   - Click "Send".

5. **As Tester A:**
   - Refresh the project detail page (or wait for Realtime).
   - Verify: The shared reply from Tester B is now visible.
   - Check the email inbox for Tester A's registered address: An email should arrive with the subject and message body in Tester A's preferred language (from `profiles.locale`).

**Expected:**
- Messages appear / disappear based on visibility toggle and user role.
- No RLS bypass: regular members cannot query `thread_messages` with `visibility='internal'`.
- Email notification is sent for shared replies only (bilingual).

**RLS / data check:**
```sql
-- As Tester A, attempt to query internal messages (should fail or return 0)
SELECT * FROM thread_messages WHERE visibility='internal' AND thread_id IN (
  SELECT id FROM project_threads WHERE project_id = '<project-id>'
);
```
Should return 0 rows (RLS policy blocks access).

**If it fails, look here:**
- `src/components/project/thread-panel-server.tsx` (display & visibility)
- `src/app/[locale]/app/projects/[id]/actions.ts` (message creation)
- `supabase/migrations/*` (RLS policies on thread_messages)
- Resend integration in actions (email delivery)

---

## Test 4 — Status transitions

**Goal:** Verify only allowed status transitions are available; invalid transitions are blocked.

**Steps:**

1. **As Tester A (regular member):**
   - Create a new project and submit it (status=submitted).
   - Open the project detail page.
   - Verify: No status transition dropdown is visible (regular members can only transition when status=delivered).

2. **As Tester B (yagi_admin):**
   - Navigate to `/{locale}/app/admin/projects`.
   - Open the same project from step 1.
   - Click the status dropdown (showing "Submitted").
   - Verify: Only "Start discovery" option is available.
   - Click "Start discovery" (status → in_discovery).
   - Refresh. Verify: Status badge now shows "In discovery", dropdown shows only "Start production".
   - Click "Start production" (status → in_production).
   - Refresh. Verify: Status badge shows "In production", dropdown shows only "Mark delivered".
   - Click "Mark delivered" (status → delivered).

3. **As Tester A (regular member):**
   - Refresh the project detail page.
   - Verify: Status badge shows "Delivered".
   - A status dropdown now appears with two options: "Approve" and "Request revision".
   - Click "Request revision" (status → in_revision).
   - Refresh. Verify: Status is now "In revision".

4. **As Tester B:**
   - Refresh the admin project view.
   - Verify: Status dropdown shows "Mark delivered" (the only allowed transition from in_revision for yagi_admin).

**Expected:**
- Each role × status combination shows only valid transitions (no ghost buttons for invalid states).
- Invalid transitions (if attempted via direct API call) return `{ error: "forbidden" }` or similar.

**Transition map (for reference):**
- **Workspace member (delivered only):** approve (→approved), request_revision (→in_revision)
- **YAGI admin:**
  - submitted → in_discovery
  - in_discovery → in_production
  - in_production → delivered
  - in_revision → delivered
  - delivered → archived
  - approved → archived

**If it fails, look here:**
- `src/app/[locale]/app/projects/[id]/page.tsx` (ALLOWED map, button rendering)
- `src/app/[locale]/app/projects/[id]/actions.ts` (ALLOWED map, server-side enforcement)

---

## Test 5 — Settings

**Goal:** Verify profile, workspace, and team tabs with appropriate role gating and functionality.

**Steps:**

1. **As Tester A (regular member):**
   - Navigate to `/{locale}/app/settings`.
   - Click the "Profile" tab (default).
   - Change the display name (e.g., "Test User Alpha").
   - Click "Save profile".
   - Verify: A toast confirms the save.
   - Reload the page. Verify: Display name persists.
   - In the same profile tab, click "Upload avatar".
   - Select an avatar image (JPEG, PNG, WebP; ≤5 MB).
   - Verify: The image renders in the form preview via a signed URL.
   - Reload the page. Verify: Avatar is now visible in the sidebar profile section.

2. **As Tester A:**
   - Click the "Workspace" tab.
   - Verify: You are redirected back to `/app` (non-workspace-admin cannot access this tab).

3. **As a workspace admin (Tester B, if assigned `workspace_admin` role; otherwise, create a test account with this role):**
   - Navigate to `/{locale}/app/settings`.
   - Click the "Workspace" tab.
   - Change the workspace name (e.g., "Test Studio ABC").
   - Enter a tax ID (e.g., "1234567890").
   - Click "Save workspace".
   - Verify: Toast confirms save, fields persist after reload.
   - Verify: The "Logo" field displays "Coming in next phase" placeholder.

4. **As the workspace admin:**
   - Click the "Team" tab.
   - Verify: Current workspace members are listed (at minimum, Tester A and Tester B).
   - Try to invite a new member:
     - Enter an email address.
     - Click the invite CTA.
     - Verify: A toast shows `{ error: "not_implemented" }` (invitations are deferred to Phase 1.3).

**Expected:**
- Profile tab: available to all members; avatar and display name persist.
- Workspace + Team tabs: available only to workspace_admin; redirect non-admins to `/app`.
- Workspace form: name, tax_id, and tax_invoice_email are editable; logo shows "Coming in next phase".
- Team form: invite returns not_implemented error (expected gap).

**If it fails, look here:**
- `src/app/[locale]/app/settings/page.tsx` (dispatcher & layout)
- `src/app/[locale]/app/settings/profile-form.tsx`
- `src/app/[locale]/app/settings/workspace-form.tsx`
- `src/app/[locale]/app/settings/team-panel.tsx`
- `src/app/[locale]/app/settings/actions.ts` (updateProfile, updateAvatarUrl, updateWorkspace, inviteMember)

---

## Test 6 — RLS sanity

**Goal:** Verify that unauthenticated / anonymous users cannot access protected tables.

**Steps:**

1. **Clear all cookies / use a fresh incognito window with no session.**

2. **Test Supabase REST API access (anonymous, using anon key):**
   ```bash
   # Get your Supabase URL and anon key from .env.local or Supabase dashboard
   curl https://<your-supabase-project>.supabase.co/rest/v1/projects \
     -H "apikey: <anon-key>"
   ```
   Verify: Response is `[]` (empty array), not an error. RLS policy prevents unauthorized access.

   ```bash
   curl https://<your-supabase-project>.supabase.co/rest/v1/project_references \
     -H "apikey: <anon-key>"
   ```
   Verify: Same — `[]`.

   ```bash
   curl https://<your-supabase-project>.supabase.co/rest/v1/thread_messages \
     -H "apikey: <anon-key>"
   ```
   Verify: Same — `[]`.

3. **Test storage bucket access (avatars):**
   - Identify a known avatar path from the database (e.g., `avatars/{user-id}/{uuid}.jpg`).
   - Try to fetch it without a signed URL:
     ```bash
     curl https://<your-supabase-project>.supabase.co/storage/v1/object/public/avatars/{user-id}/{uuid}.jpg
     ```
   - Verify: Response is 400 / 403 (bucket is now private after subtask 13).

4. **Test storage bucket access (project-references):**
   - Identify a known reference path (e.g., `project-references/{project-id}/{uuid}.jpg`).
   - Try to fetch it without a signed URL:
     ```bash
     curl https://<your-supabase-project>.supabase.co/storage/v1/object/public/project-references/{project-id}/{uuid}.jpg
     ```
   - Verify: Response is 400 / 403 (bucket is private; signed URLs required).

**Expected:**
- Anonymous REST queries return empty arrays (not errors).
- Unauthenticated storage access returns 403 / 400.
- Only authenticated users with valid RLS grants can access rows.
- Storage buckets require signed URLs.

**If it fails, look here:**
- `supabase/migrations/*` (RLS policies)
- Supabase dashboard → authentication → policies tab
- Storage bucket settings (public vs. private)

---

## Appendix — Routes reference

New routes added in Phase 1.2:

- `/{locale}/app/projects` — Projects list (tab: direct/contest)
- `/{locale}/app/projects/new` — New project 3-step wizard
- `/{locale}/app/projects/[id]` — Project detail (refs + thread + status)
- `/{locale}/app/admin/projects` — YAGI admin cross-workspace project list
- `/{locale}/app/admin` — YAGI admin landing (redirects to `/admin/projects`)
- `/{locale}/app/settings` — Settings hub (profile / workspace / team tabs)
- `/api/unfurl` — POST endpoint for OG metadata fetch

---

## Appendix — Known gaps (deferred to later phases)

These items are expected and do not indicate bugs:

- **Caption editing on reference cards** — Phase 1.3
- **"Coming soon" placeholders** — Hardcoded in dashboard milestones panel; deferred UI
- **`tone` form field** — Present in create/edit forms but no corresponding database column yet
- **Workspace logo upload** — Bucket exists; UI placeholder shows "Coming in next phase"
- **Workspace invitation send** — Table exists; `inviteMember` action returns `{ error: "not_implemented" }`
- **Email digest / retry queue** — Direct send only in Phase 1.2; no `/api/notifications/new-message` endpoint yet

---

## Summary

All six tests verify core Phase 1.2 features:

1. **Project creation** with status (draft / submitted)
2. **Reference uploads** (image + URL unfurl)
3. **Thread messaging** with visibility toggle, RLS enforcement, and email delivery
4. **Status transitions** enforcing role-based state machine
5. **Settings** (profile avatar, workspace metadata, team management)
6. **RLS / security** (unauthenticated access blocked, storage buckets private)

If all tests pass, Phase 1.2 is feature-complete and ready for integration testing.

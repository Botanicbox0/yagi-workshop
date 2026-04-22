-- =====================================================================
-- Remote public-schema snapshot for yagi-workshop (Supabase)
-- Project:  jvamvbpxnztynsccvcmr  (ap-southeast-1)
-- Captured: 2026-04-22 (UTC) via Supabase MCP (pg_catalog introspection)
-- NOTE: Reference snapshot, NOT a pg_dump. The leading underscore keeps
-- Supabase CLI from trying to apply this as a migration. Regenerate
-- after schema-changing migrations are pushed to remote.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions (installed in remote DB)
-- Commented lines are managed by Supabase/platform; uncomment if you
-- need to re-create the DB from scratch outside Supabase.
-- ---------------------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto"           WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp"          WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS "pg_graphql"         WITH SCHEMA graphql;
-- CREATE EXTENSION IF NOT EXISTS "supabase_vault"     WITH SCHEMA vault;
-- CREATE EXTENSION IF NOT EXISTS "pg_cron"            WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA public;


-- ---------------------------------------------------------------------
-- Tables (columns only; PKs / UNIQUEs / CHECKs / FKs added below)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brands (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    industry text,
    description text,
    brand_guide jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    item_name text NOT NULL,
    specification text,
    quantity numeric(12,2) NOT NULL DEFAULT 1,
    unit_price_krw integer NOT NULL,
    supply_krw integer NOT NULL,
    vat_krw integer NOT NULL,
    note text,
    source_type text,
    source_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    invoice_number text,
    nts_approval_number text,
    status text NOT NULL DEFAULT 'draft'::text,
    supply_date date NOT NULL,
    issue_date date,
    due_date date,
    subtotal_krw integer NOT NULL DEFAULT 0,
    vat_krw integer NOT NULL DEFAULT 0,
    total_krw integer NOT NULL DEFAULT 0,
    memo text,
    popbill_mgt_key text,
    popbill_response jsonb,
    filed_at timestamptz,
    paid_at timestamptz,
    void_reason text,
    void_at timestamptz,
    is_mock boolean NOT NULL DEFAULT false,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meeting_attendees (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    meeting_id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    user_id uuid,
    response_status text DEFAULT 'needsAction'::text,
    is_organizer boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meetings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    scheduled_at timestamptz NOT NULL,
    duration_minutes integer NOT NULL DEFAULT 30,
    status text NOT NULL DEFAULT 'scheduled'::text,
    meet_link text,
    google_event_id text,
    calendar_sync_status text NOT NULL DEFAULT 'pending'::text,
    calendar_sync_error text,
    summary_md text,
    summary_sent_at timestamptz,
    created_by uuid NOT NULL,
    cancelled_reason text,
    cancelled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    project_id uuid,
    workspace_id uuid,
    kind text NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    body text,
    url_path text,
    payload jsonb,
    email_sent_at timestamptz,
    email_batch_id uuid,
    in_app_seen_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id uuid NOT NULL,
    email_immediate_enabled boolean NOT NULL DEFAULT true,
    email_digest_enabled boolean NOT NULL DEFAULT true,
    digest_time_local time without time zone NOT NULL DEFAULT '09:00:00'::time without time zone,
    quiet_hours_start time without time zone NOT NULL DEFAULT '22:00:00'::time without time zone,
    quiet_hours_end time without time zone NOT NULL DEFAULT '08:00:00'::time without time zone,
    timezone text NOT NULL DEFAULT 'Asia/Seoul'::text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_unsubscribe_tokens (
    token text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    used_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.preprod_boards (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'draft'::text,
    share_token text,
    share_enabled boolean NOT NULL DEFAULT false,
    share_password_hash text,
    approved_at timestamptz,
    approved_by_email text,
    cover_frame_id uuid,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.preprod_frame_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    frame_id uuid NOT NULL,
    board_id uuid NOT NULL,
    author_user_id uuid,
    author_email text,
    author_display_name text NOT NULL,
    body text NOT NULL,
    resolved_at timestamptz,
    resolved_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.preprod_frame_reactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    frame_id uuid NOT NULL,
    board_id uuid NOT NULL,
    reactor_email text NOT NULL,
    reactor_name text,
    reaction text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.preprod_frames (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    board_id uuid NOT NULL,
    frame_order integer NOT NULL,
    revision integer NOT NULL DEFAULT 1,
    revision_group uuid NOT NULL,
    is_current_revision boolean NOT NULL DEFAULT true,
    media_type text NOT NULL,
    media_storage_path text,
    media_external_url text,
    media_embed_provider text,
    thumbnail_path text,
    caption text,
    director_note text,
    reference_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    handle text NOT NULL,
    display_name text NOT NULL,
    bio text,
    avatar_url text,
    locale text NOT NULL DEFAULT 'ko'::text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    team_chat_last_seen jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.project_deliverables (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    version integer NOT NULL DEFAULT 1,
    submitted_by uuid NOT NULL,
    storage_paths text[] NOT NULL DEFAULT '{}'::text[],
    external_urls text[] NOT NULL DEFAULT '{}'::text[],
    note text,
    status text NOT NULL DEFAULT 'submitted'::text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_milestones (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    due_at timestamptz,
    status text NOT NULL DEFAULT 'pending'::text,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_references (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    added_by uuid NOT NULL,
    storage_path text,
    external_url text,
    og_title text,
    og_description text,
    og_image_url text,
    caption text,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamptz NOT NULL DEFAULT now(),
    media_type text NOT NULL DEFAULT 'image'::text,
    duration_seconds integer,
    page_count integer,
    thumbnail_path text,
    embed_provider text
);

CREATE TABLE IF NOT EXISTS public.project_threads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    title text,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL,
    brand_id uuid,
    project_type text NOT NULL DEFAULT 'direct_commission'::text,
    created_by uuid NOT NULL,
    title text NOT NULL,
    brief text,
    deliverable_types text[] NOT NULL DEFAULT '{}'::text[],
    estimated_budget_range text,
    target_delivery_at timestamptz,
    status text NOT NULL DEFAULT 'draft'::text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    intake_mode text NOT NULL DEFAULT 'brief'::text,
    proposal_goal text,
    proposal_audience text,
    proposal_budget_range text,
    proposal_timeline text
);

CREATE TABLE IF NOT EXISTS public.showcase_media (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    showcase_id uuid NOT NULL,
    sort_order integer NOT NULL,
    media_type text NOT NULL,
    storage_path text,
    external_url text,
    embed_provider text,
    caption text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.showcases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    board_id uuid,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text,
    narrative_md text,
    cover_media_storage_path text,
    cover_media_external_url text,
    cover_media_type text,
    credits_md text,
    client_name_public text,
    status text NOT NULL DEFAULT 'draft'::text,
    published_at timestamptz,
    made_with_yagi boolean NOT NULL DEFAULT true,
    badge_removal_requested boolean NOT NULL DEFAULT false,
    badge_removal_approved_at timestamptz,
    badge_removal_approved_by uuid,
    is_password_protected boolean NOT NULL DEFAULT false,
    password_hash text,
    view_count integer NOT NULL DEFAULT 0,
    og_image_path text,
    og_image_regenerated_at timestamptz,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_profile (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    business_registration_number text NOT NULL,
    corporate_name text NOT NULL,
    representative_name text NOT NULL,
    address text NOT NULL,
    business_type text,
    business_item text,
    contact_email text NOT NULL,
    contact_phone text,
    default_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_channel_message_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL,
    kind text NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    thumbnail_path text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_channel_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    channel_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text NOT NULL,
    edited_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_channels (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    topic text,
    is_archived boolean NOT NULL DEFAULT false,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.thread_message_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL,
    storage_path text NOT NULL,
    mime_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    kind text NOT NULL,
    thumbnail_path text,
    file_name text NOT NULL,
    size_bytes bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.thread_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    thread_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text,
    attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
    visibility text NOT NULL DEFAULT 'shared'::text,
    parent_message_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    edited_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role text NOT NULL,
    workspace_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    token text NOT NULL,
    invited_by uuid,
    expires_at timestamptz NOT NULL DEFAULT (now() + '14 days'::interval),
    accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    invited_by uuid,
    invited_at timestamptz,
    joined_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspaces (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    plan text NOT NULL DEFAULT 'starter'::text,
    tax_id text,
    tax_invoice_email text,
    brand_guide jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    business_registration_number text,
    representative_name text,
    business_address text,
    business_type text,
    business_item text
);


-- ---------------------------------------------------------------------
-- Primary keys
-- ---------------------------------------------------------------------
ALTER TABLE ONLY public.brands                           ADD CONSTRAINT brands_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoice_line_items               ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoices                         ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.meeting_attendees                ADD CONSTRAINT meeting_attendees_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.meetings                         ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_events              ADD CONSTRAINT notification_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_preferences         ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.notification_unsubscribe_tokens  ADD CONSTRAINT notification_unsubscribe_tokens_pkey PRIMARY KEY (token);
ALTER TABLE ONLY public.preprod_boards                   ADD CONSTRAINT preprod_boards_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.preprod_frame_comments           ADD CONSTRAINT preprod_frame_comments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.preprod_frame_reactions          ADD CONSTRAINT preprod_frame_reactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.preprod_frames                   ADD CONSTRAINT preprod_frames_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.profiles                         ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.project_deliverables             ADD CONSTRAINT project_deliverables_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.project_milestones               ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.project_references               ADD CONSTRAINT project_references_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.project_threads                  ADD CONSTRAINT project_threads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.projects                         ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.showcase_media                   ADD CONSTRAINT showcase_media_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.showcases                        ADD CONSTRAINT showcases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.supplier_profile                 ADD CONSTRAINT supplier_profile_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.team_channel_message_attachments ADD CONSTRAINT team_channel_message_attachments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.team_channel_messages            ADD CONSTRAINT team_channel_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.team_channels                    ADD CONSTRAINT team_channels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.thread_message_attachments       ADD CONSTRAINT thread_message_attachments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.thread_messages                  ADD CONSTRAINT thread_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles                       ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.workspace_invitations            ADD CONSTRAINT workspace_invitations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.workspace_members                ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.workspaces                       ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


-- ---------------------------------------------------------------------
-- Unique & check constraints
-- ---------------------------------------------------------------------
ALTER TABLE ONLY public.brands                           ADD CONSTRAINT brands_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$'::text));
ALTER TABLE ONLY public.brands                           ADD CONSTRAINT brands_workspace_id_slug_key UNIQUE (workspace_id, slug);
ALTER TABLE ONLY public.invoice_line_items               ADD CONSTRAINT invoice_line_items_source_type_check CHECK ((source_type = ANY (ARRAY['manual'::text, 'meeting'::text, 'storyboard'::text, 'deliverable'::text])));
ALTER TABLE ONLY public.invoices                         ADD CONSTRAINT invoices_popbill_mgt_key_key UNIQUE (popbill_mgt_key);
ALTER TABLE ONLY public.invoices                         ADD CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'paid'::text, 'void'::text])));
ALTER TABLE ONLY public.meeting_attendees                ADD CONSTRAINT meeting_attendees_meeting_id_email_key UNIQUE (meeting_id, email);
ALTER TABLE ONLY public.meeting_attendees                ADD CONSTRAINT meeting_attendees_response_status_check CHECK ((response_status = ANY (ARRAY['needsAction'::text, 'accepted'::text, 'declined'::text, 'tentative'::text])));
ALTER TABLE ONLY public.meetings                         ADD CONSTRAINT meetings_calendar_sync_status_check CHECK ((calendar_sync_status = ANY (ARRAY['pending'::text, 'synced'::text, 'fallback_ics'::text, 'failed'::text])));
ALTER TABLE ONLY public.meetings                         ADD CONSTRAINT meetings_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])));
ALTER TABLE ONLY public.notification_events              ADD CONSTRAINT notification_events_severity_check CHECK ((severity = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])));
ALTER TABLE ONLY public.preprod_boards                   ADD CONSTRAINT preprod_boards_share_token_key UNIQUE (share_token);
ALTER TABLE ONLY public.preprod_boards                   ADD CONSTRAINT preprod_boards_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'shared'::text, 'approved'::text, 'archived'::text])));
ALTER TABLE ONLY public.preprod_frame_comments           ADD CONSTRAINT preprod_frame_comments_body_check CHECK ((length(body) <= 2000));
ALTER TABLE ONLY public.preprod_frame_comments           ADD CONSTRAINT preprod_frame_comments_check CHECK (((author_user_id IS NOT NULL) OR (author_email IS NOT NULL)));
ALTER TABLE ONLY public.preprod_frame_reactions          ADD CONSTRAINT preprod_frame_reactions_frame_id_reactor_email_key UNIQUE (frame_id, reactor_email);
ALTER TABLE ONLY public.preprod_frame_reactions          ADD CONSTRAINT preprod_frame_reactions_reaction_check CHECK ((reaction = ANY (ARRAY['like'::text, 'dislike'::text, 'needs_change'::text])));
ALTER TABLE ONLY public.preprod_frames                   ADD CONSTRAINT preprod_frames_board_id_revision_group_revision_key UNIQUE (board_id, revision_group, revision);
ALTER TABLE ONLY public.preprod_frames                   ADD CONSTRAINT preprod_frames_check CHECK ((((media_type = 'image'::text) AND (media_storage_path IS NOT NULL)) OR ((media_type = 'video_upload'::text) AND (media_storage_path IS NOT NULL)) OR ((media_type = 'video_embed'::text) AND (media_external_url IS NOT NULL) AND (media_embed_provider IS NOT NULL))));
ALTER TABLE ONLY public.preprod_frames                   ADD CONSTRAINT preprod_frames_media_embed_provider_check CHECK (((media_embed_provider IS NULL) OR (media_embed_provider = ANY (ARRAY['youtube'::text, 'vimeo'::text, 'tiktok'::text, 'instagram'::text]))));
ALTER TABLE ONLY public.preprod_frames                   ADD CONSTRAINT preprod_frames_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video_upload'::text, 'video_embed'::text])));
ALTER TABLE ONLY public.profiles                         ADD CONSTRAINT profiles_handle_check CHECK ((handle ~ '^[a-z0-9_-]{3,30}$'::text));
ALTER TABLE ONLY public.profiles                         ADD CONSTRAINT profiles_handle_key UNIQUE (handle);
ALTER TABLE ONLY public.profiles                         ADD CONSTRAINT profiles_locale_check CHECK ((locale = ANY (ARRAY['ko'::text, 'en'::text])));
ALTER TABLE ONLY public.project_deliverables             ADD CONSTRAINT project_deliverables_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'changes_requested'::text, 'approved'::text])));
ALTER TABLE ONLY public.project_milestones               ADD CONSTRAINT project_milestones_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text])));
ALTER TABLE ONLY public.project_references               ADD CONSTRAINT project_references_duration_seconds_check CHECK (((duration_seconds IS NULL) OR (duration_seconds >= 0)));
ALTER TABLE ONLY public.project_references               ADD CONSTRAINT project_references_embed_provider_check CHECK (((embed_provider IS NULL) OR (embed_provider = ANY (ARRAY['youtube'::text, 'vimeo'::text, 'tiktok'::text, 'instagram'::text]))));
ALTER TABLE ONLY public.project_references               ADD CONSTRAINT project_references_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text])));
ALTER TABLE ONLY public.project_references               ADD CONSTRAINT project_references_page_count_check CHECK (((page_count IS NULL) OR (page_count >= 0)));
ALTER TABLE ONLY public.project_references               ADD CONSTRAINT ref_has_source CHECK (((storage_path IS NOT NULL) OR (external_url IS NOT NULL)));
ALTER TABLE ONLY public.projects                         ADD CONSTRAINT projects_intake_mode_check CHECK ((intake_mode = ANY (ARRAY['brief'::text, 'proposal_request'::text])));
ALTER TABLE ONLY public.projects                         ADD CONSTRAINT projects_project_type_check CHECK ((project_type = ANY (ARRAY['direct_commission'::text, 'contest_brief'::text])));
ALTER TABLE ONLY public.projects                         ADD CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'in_discovery'::text, 'in_production'::text, 'in_revision'::text, 'delivered'::text, 'approved'::text, 'archived'::text])));
ALTER TABLE ONLY public.showcase_media                   ADD CONSTRAINT showcase_media_embed_provider_check CHECK (((embed_provider IS NULL) OR (embed_provider = ANY (ARRAY['youtube'::text, 'vimeo'::text, 'tiktok'::text, 'instagram'::text]))));
ALTER TABLE ONLY public.showcase_media                   ADD CONSTRAINT showcase_media_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video_upload'::text, 'video_embed'::text])));
ALTER TABLE ONLY public.showcase_media                   ADD CONSTRAINT showcase_media_showcase_id_sort_order_key UNIQUE (showcase_id, sort_order);
ALTER TABLE ONLY public.showcases                        ADD CONSTRAINT showcases_cover_media_type_check CHECK ((cover_media_type = ANY (ARRAY['image'::text, 'video_upload'::text, 'video_embed'::text])));
ALTER TABLE ONLY public.showcases                        ADD CONSTRAINT showcases_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text));
ALTER TABLE ONLY public.showcases                        ADD CONSTRAINT showcases_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.showcases                        ADD CONSTRAINT showcases_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])));
ALTER TABLE ONLY public.supplier_profile                 ADD CONSTRAINT supplier_profile_business_registration_number_key UNIQUE (business_registration_number);
ALTER TABLE ONLY public.team_channel_message_attachments ADD CONSTRAINT team_channel_message_attachments_kind_check CHECK ((kind = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text, 'file'::text])));
ALTER TABLE ONLY public.team_channel_messages            ADD CONSTRAINT team_channel_messages_body_check CHECK (((length(body) >= 1) AND (length(body) <= 5000)));
ALTER TABLE ONLY public.team_channels                    ADD CONSTRAINT team_channels_name_check CHECK (((length(name) >= 1) AND (length(name) <= 50)));
ALTER TABLE ONLY public.team_channels                    ADD CONSTRAINT team_channels_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text));
ALTER TABLE ONLY public.team_channels                    ADD CONSTRAINT team_channels_topic_check CHECK ((length(topic) <= 200));
ALTER TABLE ONLY public.team_channels                    ADD CONSTRAINT team_channels_workspace_id_slug_key UNIQUE (workspace_id, slug);
ALTER TABLE ONLY public.thread_message_attachments       ADD CONSTRAINT thread_message_attachments_kind_check CHECK ((kind = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text, 'file'::text])));
ALTER TABLE ONLY public.thread_message_attachments       ADD CONSTRAINT thread_message_attachments_size_bytes_check CHECK (((size_bytes >= 0) AND (size_bytes <= 524288000)));
ALTER TABLE ONLY public.thread_messages                  ADD CONSTRAINT thread_messages_visibility_check CHECK ((visibility = ANY (ARRAY['internal'::text, 'shared'::text])));
ALTER TABLE ONLY public.user_roles                       ADD CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text])));
ALTER TABLE ONLY public.user_roles                       ADD CONSTRAINT user_roles_user_id_role_workspace_id_key UNIQUE (user_id, role, workspace_id);
ALTER TABLE ONLY public.user_roles                       ADD CONSTRAINT ws_role_requires_ws CHECK ((((role ~~ 'workspace_%'::text) AND (workspace_id IS NOT NULL)) OR ((role !~~ 'workspace_%'::text) AND (workspace_id IS NULL))));
ALTER TABLE ONLY public.workspace_invitations            ADD CONSTRAINT workspace_invitations_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])));
ALTER TABLE ONLY public.workspace_invitations            ADD CONSTRAINT workspace_invitations_token_key UNIQUE (token);
ALTER TABLE ONLY public.workspace_invitations            ADD CONSTRAINT workspace_invitations_workspace_id_email_key UNIQUE (workspace_id, email);
ALTER TABLE ONLY public.workspace_members                ADD CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])));
ALTER TABLE ONLY public.workspace_members                ADD CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);
ALTER TABLE ONLY public.workspaces                       ADD CONSTRAINT workspaces_plan_check CHECK ((plan = ANY (ARRAY['starter'::text, 'growth'::text, 'custom'::text])));
ALTER TABLE ONLY public.workspaces                       ADD CONSTRAINT workspaces_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'::text));
ALTER TABLE ONLY public.workspaces                       ADD CONSTRAINT workspaces_slug_key UNIQUE (slug);


-- ---------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------
ALTER TABLE ONLY public.brands                           ADD CONSTRAINT brands_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.invoice_line_items               ADD CONSTRAINT invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.invoices                         ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.invoices                         ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.invoices                         ADD CONSTRAINT invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier_profile(id);
ALTER TABLE ONLY public.invoices                         ADD CONSTRAINT invoices_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.meeting_attendees                ADD CONSTRAINT meeting_attendees_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.meeting_attendees                ADD CONSTRAINT meeting_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE ONLY public.meetings                         ADD CONSTRAINT meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.meetings                         ADD CONSTRAINT meetings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.meetings                         ADD CONSTRAINT meetings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notification_events              ADD CONSTRAINT notification_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notification_events              ADD CONSTRAINT notification_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notification_events              ADD CONSTRAINT notification_events_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notification_preferences         ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notification_unsubscribe_tokens  ADD CONSTRAINT notification_unsubscribe_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.preprod_boards                   ADD CONSTRAINT preprod_boards_cover_frame_fk FOREIGN KEY (cover_frame_id) REFERENCES public.preprod_frames(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.preprod_boards                   ADD CONSTRAINT preprod_boards_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.preprod_boards                   ADD CONSTRAINT preprod_boards_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.preprod_boards                   ADD CONSTRAINT preprod_boards_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.preprod_frame_comments           ADD CONSTRAINT preprod_frame_comments_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id);
ALTER TABLE ONLY public.preprod_frame_comments           ADD CONSTRAINT preprod_frame_comments_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.preprod_frame_comments           ADD CONSTRAINT preprod_frame_comments_frame_id_fkey FOREIGN KEY (frame_id) REFERENCES public.preprod_frames(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.preprod_frame_comments           ADD CONSTRAINT preprod_frame_comments_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.preprod_frame_reactions          ADD CONSTRAINT preprod_frame_reactions_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.preprod_frame_reactions          ADD CONSTRAINT preprod_frame_reactions_frame_id_fkey FOREIGN KEY (frame_id) REFERENCES public.preprod_frames(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.preprod_frames                   ADD CONSTRAINT preprod_frames_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.profiles                         ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_deliverables             ADD CONSTRAINT project_deliverables_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_deliverables             ADD CONSTRAINT project_deliverables_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);
ALTER TABLE ONLY public.project_deliverables             ADD CONSTRAINT project_deliverables_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id);
ALTER TABLE ONLY public.project_milestones               ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_references               ADD CONSTRAINT project_references_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id);
ALTER TABLE ONLY public.project_references               ADD CONSTRAINT project_references_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_threads                  ADD CONSTRAINT project_threads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE ONLY public.project_threads                  ADD CONSTRAINT project_threads_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.projects                         ADD CONSTRAINT projects_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.projects                         ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE ONLY public.projects                         ADD CONSTRAINT projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.showcase_media                   ADD CONSTRAINT showcase_media_showcase_id_fkey FOREIGN KEY (showcase_id) REFERENCES public.showcases(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.showcases                        ADD CONSTRAINT showcases_badge_removal_approved_by_fkey FOREIGN KEY (badge_removal_approved_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.showcases                        ADD CONSTRAINT showcases_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id);
ALTER TABLE ONLY public.showcases                        ADD CONSTRAINT showcases_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.showcases                        ADD CONSTRAINT showcases_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.team_channel_message_attachments ADD CONSTRAINT team_channel_message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.team_channel_messages(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.team_channel_messages            ADD CONSTRAINT team_channel_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);
ALTER TABLE ONLY public.team_channel_messages            ADD CONSTRAINT team_channel_messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.team_channels(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.team_channels                    ADD CONSTRAINT team_channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.team_channels                    ADD CONSTRAINT team_channels_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.thread_message_attachments       ADD CONSTRAINT thread_message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.thread_messages(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.thread_messages                  ADD CONSTRAINT thread_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);
ALTER TABLE ONLY public.thread_messages                  ADD CONSTRAINT thread_messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.thread_messages(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.thread_messages                  ADD CONSTRAINT thread_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.project_threads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_roles                       ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_roles                       ADD CONSTRAINT user_roles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workspace_invitations            ADD CONSTRAINT workspace_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);
ALTER TABLE ONLY public.workspace_invitations            ADD CONSTRAINT workspace_invitations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workspace_members                ADD CONSTRAINT workspace_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);
ALTER TABLE ONLY public.workspace_members                ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workspace_members                ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


-- ---------------------------------------------------------------------
-- Secondary indexes (non-PK / non-UNIQUE-constraint)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS brands_workspace_idx ON public.brands USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_line_items USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_is_mock ON public.invoices USING btree (is_mock) WHERE (is_mock = true);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON public.invoices USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices USING btree (status);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON public.invoices USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting ON public.meeting_attendees USING btree (meeting_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project ON public.meetings USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON public.meetings USING btree (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_workspace ON public.meetings USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_notif_events_user_unseen ON public.notification_events USING btree (user_id, created_at DESC) WHERE (in_app_seen_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_notif_events_user_unsent ON public.notification_events USING btree (user_id, severity, created_at) WHERE (email_sent_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS notif_events_debounce_uniq ON public.notification_events USING btree (user_id, kind, project_id) WHERE ((email_sent_at IS NULL) AND (in_app_seen_at IS NULL) AND (project_id IS NOT NULL) AND (kind = ANY (ARRAY['feedback_received'::text, 'frame_uploaded_batch'::text])));
CREATE INDEX IF NOT EXISTS idx_unsub_tokens_user ON public.notification_unsubscribe_tokens USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_preprod_boards_project ON public.preprod_boards USING btree (project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_preprod_boards_share_token ON public.preprod_boards USING btree (share_token) WHERE (share_token IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_preprod_comments_board ON public.preprod_frame_comments USING btree (board_id);
CREATE INDEX IF NOT EXISTS idx_preprod_comments_frame ON public.preprod_frame_comments USING btree (frame_id);
CREATE INDEX IF NOT EXISTS idx_preprod_reactions_board ON public.preprod_frame_reactions USING btree (board_id);
CREATE INDEX IF NOT EXISTS idx_preprod_reactions_frame ON public.preprod_frame_reactions USING btree (frame_id);
CREATE INDEX IF NOT EXISTS idx_preprod_frames_board ON public.preprod_frames USING btree (board_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_preprod_frames_one_current ON public.preprod_frames USING btree (revision_group) WHERE (is_current_revision = true);
CREATE INDEX IF NOT EXISTS idx_preprod_frames_revision_group ON public.preprod_frames USING btree (revision_group, is_current_revision);
CREATE INDEX IF NOT EXISTS deliverables_project_idx ON public.project_deliverables USING btree (project_id);
CREATE INDEX IF NOT EXISTS milestones_project_idx ON public.project_milestones USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_project_references_media_type ON public.project_references USING btree (project_id, media_type);
CREATE INDEX IF NOT EXISTS project_refs_project_idx ON public.project_references USING btree (project_id);
CREATE INDEX IF NOT EXISTS project_threads_project_idx ON public.project_threads USING btree (project_id);
CREATE INDEX IF NOT EXISTS projects_brand_idx ON public.projects USING btree (brand_id);
CREATE INDEX IF NOT EXISTS projects_type_status_idx ON public.projects USING btree (project_type, status);
CREATE INDEX IF NOT EXISTS projects_workspace_idx ON public.projects USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_showcase_media_showcase ON public.showcase_media USING btree (showcase_id);
CREATE INDEX IF NOT EXISTS idx_showcases_project ON public.showcases USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_showcases_published ON public.showcases USING btree (status, published_at DESC) WHERE (status = 'published'::text);
CREATE INDEX IF NOT EXISTS idx_showcases_slug ON public.showcases USING btree (slug);
CREATE INDEX IF NOT EXISTS idx_tc_attachments_message ON public.team_channel_message_attachments USING btree (message_id);
CREATE INDEX IF NOT EXISTS idx_team_channel_messages_channel ON public.team_channel_messages USING btree (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_channels_workspace ON public.team_channels USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_thread_message_attachments_message ON public.thread_message_attachments USING btree (message_id);
CREATE INDEX IF NOT EXISTS thread_messages_thread_idx ON public.thread_messages USING btree (thread_id);
CREATE INDEX IF NOT EXISTS user_roles_user_idx ON public.user_roles USING btree (user_id);
CREATE INDEX IF NOT EXISTS user_roles_ws_idx ON public.user_roles USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS ws_members_user_idx ON public.workspace_members USING btree (user_id);
CREATE INDEX IF NOT EXISTS ws_members_ws_idx ON public.workspace_members USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS workspaces_slug_idx ON public.workspaces USING btree (slug);


-- ---------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_workspace(p_name text, p_slug text, p_logo_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'profile_required';
  end if;

  insert into public.workspaces (name, slug, logo_url)
  values (p_name, p_slug, p_logo_url)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, joined_at)
  values (v_workspace_id, v_user_id, 'admin', now());

  insert into public.user_roles (user_id, role, workspace_id)
  values (v_user_id, 'workspace_admin', v_workspace_id);

  return v_workspace_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.increment_showcase_view(sid uuid)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update showcases
     set view_count = view_count + 1
   where id = sid
     and status = 'published'
   returning view_count;
$function$;

CREATE OR REPLACE FUNCTION public.is_ws_admin(uid uuid, wsid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(
    select 1 from workspace_members
    where user_id = uid and workspace_id = wsid and role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_ws_member(uid uuid, wsid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from workspace_members where user_id = uid and workspace_id = wsid);
$function$;

CREATE OR REPLACE FUNCTION public.is_yagi_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
$function$;

CREATE OR REPLACE FUNCTION public.is_yagi_internal_ws(ws_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from workspaces
    where id = ws_id and slug = 'yagi-internal'
  )
$function$;

CREATE OR REPLACE FUNCTION public.meetings_sync_workspace_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  derived_ws uuid;
begin
  select p.workspace_id into derived_ws from public.projects p where p.id = NEW.project_id;
  if derived_ws is null then
    raise exception 'project % not found', NEW.project_id using errcode = '23503';
  end if;
  NEW.workspace_id := derived_ws;
  return NEW;
end;
$function$;

CREATE OR REPLACE FUNCTION public.preprod_boards_set_workspace_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  yagi_ws_id uuid;
begin
  select id into yagi_ws_id from public.workspaces where slug = 'yagi-internal';
  if yagi_ws_id is null then
    raise exception 'yagi-internal workspace not found' using errcode = 'P0001';
  end if;
  NEW.workspace_id := yagi_ws_id;
  return NEW;
end;
$function$;

CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  inv_id uuid;
  new_subtotal integer;
  new_vat integer;
begin
  inv_id := coalesce(new.invoice_id, old.invoice_id);
  select coalesce(sum(supply_krw), 0), coalesce(sum(vat_krw), 0)
    into new_subtotal, new_vat
    from public.invoice_line_items
    where invoice_id = inv_id;
  update public.invoices
    set subtotal_krw = new_subtotal,
        vat_krw = new_vat,
        total_krw = new_subtotal + new_vat
    where id = inv_id;
  return coalesce(new, old);
end $function$;

CREATE OR REPLACE FUNCTION public.resolve_user_ids_by_emails(p_emails text[])
 RETURNS TABLE(email text, user_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select u.email::text, u.id
  from auth.users u
  where lower(u.email) = any (select lower(e) from unnest(p_emails) as e)
$function$;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end;
$function$;


-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS brands_touch ON public.brands;
CREATE TRIGGER brands_touch BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS invoice_items_recalc ON public.invoice_line_items;
CREATE TRIGGER invoice_items_recalc AFTER INSERT OR DELETE OR UPDATE ON public.invoice_line_items FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_totals();

DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS meetings_sync_workspace_id_ins ON public.meetings;
CREATE TRIGGER meetings_sync_workspace_id_ins BEFORE INSERT ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.meetings_sync_workspace_id();

DROP TRIGGER IF EXISTS meetings_sync_workspace_id_upd ON public.meetings;
CREATE TRIGGER meetings_sync_workspace_id_upd BEFORE UPDATE OF project_id ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.meetings_sync_workspace_id();

DROP TRIGGER IF EXISTS meetings_updated_at ON public.meetings;
CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS tg_set_notif_prefs_updated_at ON public.notification_preferences;
CREATE TRIGGER tg_set_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS preprod_boards_set_workspace_id_ins ON public.preprod_boards;
CREATE TRIGGER preprod_boards_set_workspace_id_ins BEFORE INSERT ON public.preprod_boards FOR EACH ROW EXECUTE FUNCTION public.preprod_boards_set_workspace_id();

DROP TRIGGER IF EXISTS preprod_boards_touch_updated_at ON public.preprod_boards;
CREATE TRIGGER preprod_boards_touch_updated_at BEFORE UPDATE ON public.preprod_boards FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS preprod_reactions_touch_updated_at ON public.preprod_frame_reactions;
CREATE TRIGGER preprod_reactions_touch_updated_at BEFORE UPDATE ON public.preprod_frame_reactions FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS preprod_frames_touch_updated_at ON public.preprod_frames;
CREATE TRIGGER preprod_frames_touch_updated_at BEFORE UPDATE ON public.preprod_frames FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS projects_touch ON public.projects;
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_showcases_updated_at ON public.showcases;
CREATE TRIGGER trg_showcases_updated_at BEFORE UPDATE ON public.showcases FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS supplier_profile_updated_at ON public.supplier_profile;
CREATE TRIGGER supplier_profile_updated_at BEFORE UPDATE ON public.supplier_profile FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_team_channels_updated_at ON public.team_channels;
CREATE TRIGGER trg_team_channels_updated_at BEFORE UPDATE ON public.team_channels FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS workspaces_touch ON public.workspaces;
CREATE TRIGGER workspaces_touch BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


-- ---------------------------------------------------------------------
-- Row-level security (enable)
-- ---------------------------------------------------------------------
ALTER TABLE public.brands                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_unsubscribe_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preprod_boards                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preprod_frame_comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preprod_frame_reactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preprod_frames                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliverables             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_references               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_threads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_media                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcases                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_profile                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_channel_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_channel_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_channels                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_message_attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces                       ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- Row-level security policies
-- ---------------------------------------------------------------------
-- brands
CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((is_ws_member(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
CREATE POLICY brands_write_admin ON public.brands FOR ALL TO authenticated USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))) WITH CHECK ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));

-- invoice_line_items
CREATE POLICY invoice_items_modify ON public.invoice_line_items FOR ALL USING (is_yagi_admin(auth.uid())) WITH CHECK (is_yagi_admin(auth.uid()));
CREATE POLICY invoice_items_select ON public.invoice_line_items FOR SELECT USING ((EXISTS ( SELECT 1 FROM invoices i WHERE ((i.id = invoice_line_items.invoice_id) AND (is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), i.workspace_id))))));

-- invoices
CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((is_yagi_admin(auth.uid()) OR (is_mock = false)));
CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (is_yagi_admin(auth.uid()));
CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), workspace_id)));
CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (is_yagi_admin(auth.uid())) WITH CHECK (is_yagi_admin(auth.uid()));

-- meeting_attendees
CREATE POLICY meeting_attendees_insert ON public.meeting_attendees FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM meetings m WHERE ((m.id = meeting_attendees.meeting_id) AND (is_ws_admin(auth.uid(), m.workspace_id) OR is_yagi_admin(auth.uid()))))));
CREATE POLICY meeting_attendees_select ON public.meeting_attendees FOR SELECT USING ((EXISTS ( SELECT 1 FROM meetings m WHERE ((m.id = meeting_attendees.meeting_id) AND (is_ws_member(auth.uid(), m.workspace_id) OR is_yagi_admin(auth.uid()))))));

-- meetings
CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((is_ws_member(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));

-- notification_events
CREATE POLICY notif_events_select_own ON public.notification_events FOR SELECT USING ((user_id = auth.uid()));
CREATE POLICY notif_events_update_own ON public.notification_events FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- notification_preferences
CREATE POLICY prefs_select_own ON public.notification_preferences FOR SELECT USING ((user_id = auth.uid()));
CREATE POLICY prefs_update_own ON public.notification_preferences FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY prefs_upsert_own ON public.notification_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));

-- notification_unsubscribe_tokens
CREATE POLICY unsub_tokens_deny_all ON public.notification_unsubscribe_tokens FOR ALL USING (false) WITH CHECK (false);

-- preprod_boards
CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), workspace_id)));
CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), workspace_id)));
CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), workspace_id)));
CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), workspace_id)));

-- preprod_frame_comments
CREATE POLICY preprod_comments_select ON public.preprod_frame_comments FOR SELECT USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frame_comments.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), b.workspace_id))))));
CREATE POLICY preprod_comments_update ON public.preprod_frame_comments FOR UPDATE USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frame_comments.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frame_comments.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id))))));

-- preprod_frame_reactions
CREATE POLICY preprod_reactions_select ON public.preprod_frame_reactions FOR SELECT USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frame_reactions.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), b.workspace_id))))));

-- preprod_frames
CREATE POLICY preprod_frames_delete ON public.preprod_frames FOR DELETE USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frames.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id))))));
CREATE POLICY preprod_frames_insert ON public.preprod_frames FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frames.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id))))));
CREATE POLICY preprod_frames_select ON public.preprod_frames FOR SELECT USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frames.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), b.workspace_id))))));
CREATE POLICY preprod_frames_update ON public.preprod_frames FOR UPDATE USING ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frames.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1 FROM preprod_boards b WHERE ((b.id = preprod_frames.board_id) AND (is_yagi_admin(auth.uid()) OR is_ws_admin(auth.uid(), b.workspace_id))))));

-- profiles
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));

-- project_deliverables
CREATE POLICY deliverables_rw ON public.project_deliverables FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_deliverables.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_deliverables.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))))));

-- project_milestones
CREATE POLICY milestones_rw ON public.project_milestones FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_milestones.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_milestones.project_id) AND (is_ws_admin(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))))));

-- project_references
CREATE POLICY proj_refs_rw ON public.project_references FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_references.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_references.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))))));

-- project_threads
CREATE POLICY proj_threads_rw ON public.project_threads FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_threads.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = project_threads.project_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))))));

-- projects
CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (is_yagi_admin(auth.uid()));
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((is_ws_member(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))) WITH CHECK ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));

-- showcase_media
CREATE POLICY showcase_media_delete ON public.showcase_media FOR DELETE USING ((EXISTS ( SELECT 1 FROM showcases s WHERE ((s.id = showcase_media.showcase_id) AND is_yagi_admin(auth.uid())))));
CREATE POLICY showcase_media_insert ON public.showcase_media FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM showcases s WHERE ((s.id = showcase_media.showcase_id) AND is_yagi_admin(auth.uid())))));
CREATE POLICY showcase_media_select ON public.showcase_media FOR SELECT USING ((EXISTS ( SELECT 1 FROM showcases s WHERE ((s.id = showcase_media.showcase_id) AND (is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = s.project_id) AND is_ws_member(auth.uid(), p.workspace_id)))))))));
CREATE POLICY showcase_media_update ON public.showcase_media FOR UPDATE USING ((EXISTS ( SELECT 1 FROM showcases s WHERE ((s.id = showcase_media.showcase_id) AND is_yagi_admin(auth.uid())))));

-- showcases
CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (is_yagi_admin(auth.uid()));
CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (is_yagi_admin(auth.uid()));
CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = showcases.project_id) AND is_ws_member(auth.uid(), p.workspace_id))))));
CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = showcases.project_id) AND is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1 FROM projects p WHERE ((p.id = showcases.project_id) AND is_ws_admin(auth.uid(), p.workspace_id))))));

-- supplier_profile
CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (is_yagi_admin(auth.uid()));
CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (is_yagi_admin(auth.uid())) WITH CHECK (is_yagi_admin(auth.uid()));

-- team_channel_message_attachments
CREATE POLICY tc_attachments_insert ON public.team_channel_message_attachments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM team_channel_messages m WHERE ((m.id = team_channel_message_attachments.message_id) AND (m.author_id = auth.uid())))));
CREATE POLICY tc_attachments_select ON public.team_channel_message_attachments FOR SELECT USING ((EXISTS ( SELECT 1 FROM (team_channel_messages m JOIN team_channels c ON ((c.id = m.channel_id))) WHERE ((m.id = team_channel_message_attachments.message_id) AND is_yagi_internal_ws(c.workspace_id) AND (is_ws_member(auth.uid(), c.workspace_id) OR is_yagi_admin(auth.uid()))))));

-- team_channel_messages
CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR is_yagi_admin(auth.uid())));
CREATE POLICY team_channel_messages_insert ON public.team_channel_messages FOR INSERT WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM team_channels c WHERE ((c.id = team_channel_messages.channel_id) AND is_yagi_internal_ws(c.workspace_id) AND is_ws_member(auth.uid(), c.workspace_id))))));
CREATE POLICY team_channel_messages_select ON public.team_channel_messages FOR SELECT USING ((EXISTS ( SELECT 1 FROM team_channels c WHERE ((c.id = team_channel_messages.channel_id) AND is_yagi_internal_ws(c.workspace_id) AND (is_ws_member(auth.uid(), c.workspace_id) OR is_yagi_admin(auth.uid()))))));
CREATE POLICY team_channel_messages_update ON public.team_channel_messages FOR UPDATE USING ((author_id = auth.uid())) WITH CHECK ((author_id = auth.uid()));

-- team_channels
CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((is_yagi_internal_ws(workspace_id) AND (is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))));
CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((is_yagi_internal_ws(workspace_id) AND (is_ws_member(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))));
CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((is_yagi_internal_ws(workspace_id) AND (is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))));

-- thread_message_attachments
CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1 FROM thread_messages tm WHERE ((tm.id = thread_message_attachments.message_id) AND (tm.visibility = 'internal'::text)))))));
CREATE POLICY thread_message_attachments_delete ON public.thread_message_attachments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM thread_messages tm WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR is_yagi_admin(auth.uid()))))));
CREATE POLICY thread_message_attachments_insert ON public.thread_message_attachments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM ((thread_messages tm JOIN project_threads t ON ((t.id = tm.thread_id))) JOIN projects p ON ((p.id = t.project_id))) WHERE ((tm.id = thread_message_attachments.message_id) AND (tm.author_id = auth.uid()) AND is_ws_member(auth.uid(), p.workspace_id)))));
CREATE POLICY thread_message_attachments_select ON public.thread_message_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM ((thread_messages tm JOIN project_threads t ON ((t.id = tm.thread_id))) JOIN projects p ON ((p.id = t.project_id))) WHERE ((tm.id = thread_message_attachments.message_id) AND is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR is_yagi_admin(auth.uid()))))));

-- thread_messages
CREATE POLICY thread_messages_insert ON public.thread_messages FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM (project_threads t JOIN projects p ON ((p.id = t.project_id))) WHERE ((t.id = thread_messages.thread_id) AND is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND is_yagi_admin(auth.uid())))));
CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
CREATE POLICY thread_msgs_rw ON public.thread_messages FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM (project_threads t JOIN projects p ON ((p.id = t.project_id))) WHERE ((t.id = thread_messages.thread_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1 FROM (project_threads t JOIN projects p ON ((p.id = t.project_id))) WHERE ((t.id = thread_messages.thread_id) AND (is_ws_member(auth.uid(), p.workspace_id) OR is_yagi_admin(auth.uid()))))));

-- user_roles
CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR is_yagi_admin(auth.uid())));
CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND is_ws_admin(auth.uid(), workspace_id)));
CREATE POLICY user_roles_yagi_admin ON public.user_roles FOR ALL TO authenticated USING (is_yagi_admin(auth.uid())) WITH CHECK (is_yagi_admin(auth.uid()));

-- workspace_invitations
CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
CREATE POLICY ws_inv_write_admin ON public.workspace_invitations FOR ALL TO authenticated USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))) WITH CHECK ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));

-- workspace_members
CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((is_ws_member(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));
CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1 FROM workspace_members m WHERE (m.workspace_id = workspace_members.workspace_id))))) OR is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid())));

-- workspaces
CREATE POLICY ws_create_any_auth ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (is_yagi_admin(auth.uid()));
CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((is_ws_member(auth.uid(), id) OR is_yagi_admin(auth.uid())));
CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((is_ws_admin(auth.uid(), id) OR is_yagi_admin(auth.uid()))) WITH CHECK ((is_ws_admin(auth.uid(), id) OR is_yagi_admin(auth.uid())));

-- =====================================================================
-- End of snapshot
-- =====================================================================

-- =====================================================================
-- Phase 2.0 baseline — imperfect source-of-truth acknowledged
-- =====================================================================
-- pg_dump v18 (client) → Postgres 17 (Supabase) 출력을 기반으로 하되,
-- Claude Code가 다음을 supplement 했음 (pg_dump가 누락한 부분):
--   - 5 extensions (CREATE EXTENSION statements)
--   - 10 storage buckets (INSERT INTO storage.buckets)
--   - 3 realtime publications (ALTER PUBLICATION ... ADD TABLE)
--
-- 이 supplement는 Phase 1 summaries + memory 기반이라 live DB와
-- 100% 정확히 일치한다는 보장 없음. Phase 2.1+에서 Docker 환경
-- 생기면 pure pg_dump 재실행 → diff 검증 → 이 baseline 덮어쓰기 권장.
--
-- Detailed limitations + Phase 2.1 re-dump checklist:
--   .yagi-autobuild/phase-2-0/BASELINE_LIMITATIONS.md
-- =====================================================================
--
-- Phase 2.0 baseline (Option C squash) — supersedes 22 historical migrations
-- Source: pg_dump v18.3 against live DB jvamvbpxnztynsccvcmr (PG17.6) on 2026-04-22
-- Patched header: PG18 \restrict/\unrestrict stripped (incompatible with PG17 apply);
--                 CREATE SCHEMA softened to IF NOT EXISTS (Supabase always has public/storage);
--                 PII COPY data blocks stripped (38 tables — schema-only baseline);
--                 manual supplements added for extensions (top), storage buckets + realtime (bottom).
-- Forensic + future fresh-clone reproducer; live DB is canonical source of truth.
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- MANUAL SUPPLEMENT 1/2 — extensions (not captured by pg_dump --schema)
-- Captured 2026-04-22 from live pg_extension. plpgsql/supabase_vault/pg_graphql
-- are Supabase-managed and intentionally omitted.
--

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS storage;


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: bootstrap_workspace(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bootstrap_workspace(p_name text, p_slug text, p_logo_url text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Must have a profile first
  if not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'profile_required';
  end if;

  -- Create workspace
  insert into public.workspaces (name, slug, logo_url)
  values (p_name, p_slug, p_logo_url)
  returning id into v_workspace_id;

  -- Add creator as admin member
  insert into public.workspace_members (workspace_id, user_id, role, joined_at)
  values (v_workspace_id, v_user_id, 'admin', now());

  -- Grant workspace_admin role
  insert into public.user_roles (user_id, role, workspace_id)
  values (v_user_id, 'workspace_admin', v_workspace_id);

  return v_workspace_id;
end;
$$;


--
-- Name: FUNCTION bootstrap_workspace(p_name text, p_slug text, p_logo_url text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.bootstrap_workspace(p_name text, p_slug text, p_logo_url text) IS 'Atomically bootstraps a new workspace with the caller as admin. Bypasses RLS via security definer; enforces auth.uid() check internally.';


--
-- Name: increment_showcase_view(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_showcase_view(sid uuid) RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update showcases
     set view_count = view_count + 1
   where id = sid
     and status = 'published'
   returning view_count;
$$;


--
-- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists(
    select 1 from workspace_members
    where user_id = uid and workspace_id = wsid and role = 'admin'
  );
$$;


--
-- Name: is_ws_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_ws_member(uid uuid, wsid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists(select 1 from workspace_members where user_id = uid and workspace_id = wsid);
$$;


--
-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
$$;


--
-- Name: is_yagi_internal_ws(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_yagi_internal_ws(ws_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from workspaces
    where id = ws_id and slug = 'yagi-internal'
  )
$$;


--
-- Name: meetings_sync_workspace_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.meetings_sync_workspace_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: preprod_boards_set_workspace_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.preprod_boards_set_workspace_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: recalc_invoice_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalc_invoice_totals() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
end $$;


--
-- Name: resolve_user_ids_by_emails(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_user_ids_by_emails(p_emails text[]) RETURNS TABLE(email text, user_id uuid)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
  select u.email::text, u.id
  from auth.users u
  where lower(u.email) = any (select lower(e) from unnest(p_emails) as e)
$$;


--
-- Name: tg_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: tg_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at = now(); return new; end;
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    industry text,
    description text,
    brand_guide jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT brands_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$'::text))
);


--
-- Name: invoice_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    item_name text NOT NULL,
    specification text,
    quantity numeric(12,2) DEFAULT 1 NOT NULL,
    unit_price_krw integer NOT NULL,
    supply_krw integer NOT NULL,
    vat_krw integer NOT NULL,
    note text,
    source_type text,
    source_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoice_line_items_source_type_check CHECK ((source_type = ANY (ARRAY['manual'::text, 'meeting'::text, 'storyboard'::text, 'deliverable'::text])))
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    invoice_number text,
    nts_approval_number text,
    status text DEFAULT 'draft'::text NOT NULL,
    supply_date date NOT NULL,
    issue_date date,
    due_date date,
    subtotal_krw integer DEFAULT 0 NOT NULL,
    vat_krw integer DEFAULT 0 NOT NULL,
    total_krw integer DEFAULT 0 NOT NULL,
    memo text,
    popbill_mgt_key text,
    popbill_response jsonb,
    filed_at timestamp with time zone,
    paid_at timestamp with time zone,
    void_reason text,
    void_at timestamp with time zone,
    is_mock boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'paid'::text, 'void'::text])))
);


--
-- Name: meeting_attendees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_attendees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    user_id uuid,
    response_status text DEFAULT 'needsAction'::text,
    is_organizer boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT meeting_attendees_response_status_check CHECK ((response_status = ANY (ARRAY['needsAction'::text, 'accepted'::text, 'declined'::text, 'tentative'::text])))
);


--
-- Name: meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 30 NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    meet_link text,
    google_event_id text,
    calendar_sync_status text DEFAULT 'pending'::text NOT NULL,
    calendar_sync_error text,
    summary_md text,
    summary_sent_at timestamp with time zone,
    created_by uuid NOT NULL,
    cancelled_reason text,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT meetings_calendar_sync_status_check CHECK ((calendar_sync_status = ANY (ARRAY['pending'::text, 'synced'::text, 'fallback_ics'::text, 'failed'::text]))),
    CONSTRAINT meetings_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: notification_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid,
    workspace_id uuid,
    kind text NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    body text,
    url_path text,
    payload jsonb,
    email_sent_at timestamp with time zone,
    email_batch_id uuid,
    in_app_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_events_severity_check CHECK ((severity = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    user_id uuid NOT NULL,
    email_immediate_enabled boolean DEFAULT true NOT NULL,
    email_digest_enabled boolean DEFAULT true NOT NULL,
    digest_time_local time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone NOT NULL,
    quiet_hours_end time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    timezone text DEFAULT 'Asia/Seoul'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_unsubscribe_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_unsubscribe_tokens (
    token text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone
);


--
-- Name: preprod_boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preprod_boards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    share_token text,
    share_enabled boolean DEFAULT false NOT NULL,
    share_password_hash text,
    approved_at timestamp with time zone,
    approved_by_email text,
    cover_frame_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT preprod_boards_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'shared'::text, 'approved'::text, 'archived'::text])))
);


--
-- Name: preprod_frame_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preprod_frame_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    frame_id uuid NOT NULL,
    board_id uuid NOT NULL,
    author_user_id uuid,
    author_email text,
    author_display_name text NOT NULL,
    body text NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT preprod_frame_comments_body_check CHECK ((length(body) <= 2000)),
    CONSTRAINT preprod_frame_comments_check CHECK (((author_user_id IS NOT NULL) OR (author_email IS NOT NULL)))
);


--
-- Name: preprod_frame_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preprod_frame_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    frame_id uuid NOT NULL,
    board_id uuid NOT NULL,
    reactor_email text NOT NULL,
    reactor_name text,
    reaction text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT preprod_frame_reactions_reaction_check CHECK ((reaction = ANY (ARRAY['like'::text, 'dislike'::text, 'needs_change'::text])))
);


--
-- Name: preprod_frames; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preprod_frames (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid NOT NULL,
    frame_order integer NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    revision_group uuid NOT NULL,
    is_current_revision boolean DEFAULT true NOT NULL,
    media_type text NOT NULL,
    media_storage_path text,
    media_external_url text,
    media_embed_provider text,
    thumbnail_path text,
    caption text,
    director_note text,
    reference_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT preprod_frames_check CHECK ((((media_type = 'image'::text) AND (media_storage_path IS NOT NULL)) OR ((media_type = 'video_upload'::text) AND (media_storage_path IS NOT NULL)) OR ((media_type = 'video_embed'::text) AND (media_external_url IS NOT NULL) AND (media_embed_provider IS NOT NULL)))),
    CONSTRAINT preprod_frames_media_embed_provider_check CHECK (((media_embed_provider IS NULL) OR (media_embed_provider = ANY (ARRAY['youtube'::text, 'vimeo'::text, 'tiktok'::text, 'instagram'::text])))),
    CONSTRAINT preprod_frames_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video_upload'::text, 'video_embed'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    handle text NOT NULL,
    display_name text NOT NULL,
    bio text,
    avatar_url text,
    locale text DEFAULT 'ko'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    team_chat_last_seen jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT profiles_handle_check CHECK ((handle ~ '^[a-z0-9_-]{3,30}$'::text)),
    CONSTRAINT profiles_locale_check CHECK ((locale = ANY (ARRAY['ko'::text, 'en'::text])))
);


--
-- Name: COLUMN profiles.team_chat_last_seen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.team_chat_last_seen IS 'Per-channel last-seen timestamps for unread indicators. Shape: { "<channel_id>": "<iso8601>" }';


--
-- Name: project_deliverables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_deliverables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    submitted_by uuid NOT NULL,
    storage_paths text[] DEFAULT '{}'::text[] NOT NULL,
    external_urls text[] DEFAULT '{}'::text[] NOT NULL,
    note text,
    status text DEFAULT 'submitted'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_deliverables_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'changes_requested'::text, 'approved'::text])))
);


--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    due_at timestamp with time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_milestones_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text])))
);


--
-- Name: project_references; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_references (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    added_by uuid NOT NULL,
    storage_path text,
    external_url text,
    og_title text,
    og_description text,
    og_image_url text,
    caption text,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    media_type text DEFAULT 'image'::text NOT NULL,
    duration_seconds integer,
    page_count integer,
    thumbnail_path text,
    embed_provider text,
    CONSTRAINT project_references_duration_seconds_check CHECK (((duration_seconds IS NULL) OR (duration_seconds >= 0))),
    CONSTRAINT project_references_embed_provider_check CHECK (((embed_provider IS NULL) OR (embed_provider = ANY (ARRAY['youtube'::text, 'vimeo'::text, 'tiktok'::text, 'instagram'::text])))),
    CONSTRAINT project_references_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text]))),
    CONSTRAINT project_references_page_count_check CHECK (((page_count IS NULL) OR (page_count >= 0))),
    CONSTRAINT ref_has_source CHECK (((storage_path IS NOT NULL) OR (external_url IS NOT NULL)))
);


--
-- Name: project_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    brand_id uuid,
    project_type text DEFAULT 'direct_commission'::text NOT NULL,
    created_by uuid NOT NULL,
    title text NOT NULL,
    brief text,
    deliverable_types text[] DEFAULT '{}'::text[] NOT NULL,
    estimated_budget_range text,
    target_delivery_at timestamp with time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    intake_mode text DEFAULT 'brief'::text NOT NULL,
    proposal_goal text,
    proposal_audience text,
    proposal_budget_range text,
    proposal_timeline text,
    CONSTRAINT projects_intake_mode_check CHECK ((intake_mode = ANY (ARRAY['brief'::text, 'proposal_request'::text]))),
    CONSTRAINT projects_project_type_check CHECK ((project_type = ANY (ARRAY['direct_commission'::text, 'contest_brief'::text]))),
    CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'in_discovery'::text, 'in_production'::text, 'in_revision'::text, 'delivered'::text, 'approved'::text, 'archived'::text])))
);


--
-- Name: showcase_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.showcase_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    showcase_id uuid NOT NULL,
    sort_order integer NOT NULL,
    media_type text NOT NULL,
    storage_path text,
    external_url text,
    embed_provider text,
    caption text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT showcase_media_embed_provider_check CHECK (((embed_provider IS NULL) OR (embed_provider = ANY (ARRAY['youtube'::text, 'vimeo'::text, 'tiktok'::text, 'instagram'::text])))),
    CONSTRAINT showcase_media_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video_upload'::text, 'video_embed'::text])))
);


--
-- Name: showcases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.showcases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    made_with_yagi boolean DEFAULT true NOT NULL,
    badge_removal_requested boolean DEFAULT false NOT NULL,
    badge_removal_approved_at timestamp with time zone,
    badge_removal_approved_by uuid,
    is_password_protected boolean DEFAULT false NOT NULL,
    password_hash text,
    view_count integer DEFAULT 0 NOT NULL,
    og_image_path text,
    og_image_regenerated_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT showcases_cover_media_type_check CHECK ((cover_media_type = ANY (ARRAY['image'::text, 'video_upload'::text, 'video_embed'::text]))),
    CONSTRAINT showcases_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text)),
    CONSTRAINT showcases_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))
);


--
-- Name: supplier_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_registration_number text NOT NULL,
    corporate_name text NOT NULL,
    representative_name text NOT NULL,
    address text NOT NULL,
    business_type text,
    business_item text,
    contact_email text NOT NULL,
    contact_phone text,
    default_rates jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_channel_message_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_channel_message_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    kind text NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    thumbnail_path text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_channel_message_attachments_kind_check CHECK ((kind = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text, 'file'::text])))
);


--
-- Name: team_channel_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_channel_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text NOT NULL,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_channel_messages_body_check CHECK (((length(body) >= 1) AND (length(body) <= 5000)))
);


--
-- Name: team_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    topic text,
    is_archived boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_channels_name_check CHECK (((length(name) >= 1) AND (length(name) <= 50))),
    CONSTRAINT team_channels_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text)),
    CONSTRAINT team_channels_topic_check CHECK ((length(topic) <= 200))
);


--
-- Name: thread_message_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_message_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    storage_path text NOT NULL,
    mime_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text NOT NULL,
    thumbnail_path text,
    file_name text NOT NULL,
    size_bytes bigint NOT NULL,
    CONSTRAINT thread_message_attachments_kind_check CHECK ((kind = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text, 'file'::text]))),
    CONSTRAINT thread_message_attachments_size_bytes_check CHECK (((size_bytes >= 0) AND (size_bytes <= 524288000)))
);


--
-- Name: thread_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thread_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    visibility text DEFAULT 'shared'::text NOT NULL,
    parent_message_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone,
    CONSTRAINT thread_messages_visibility_check CHECK ((visibility = ANY (ARRAY['internal'::text, 'shared'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    workspace_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
    CONSTRAINT ws_role_requires_ws CHECK ((((role ~~ 'workspace_%'::text) AND (workspace_id IS NOT NULL)) OR ((role !~~ 'workspace_%'::text) AND (workspace_id IS NULL))))
);


--
-- Name: workspace_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    token text NOT NULL,
    invited_by uuid,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workspace_invitations_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
);


--
-- Name: workspace_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    invited_by uuid,
    invited_at timestamp with time zone,
    joined_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
);


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    plan text DEFAULT 'starter'::text NOT NULL,
    tax_id text,
    tax_invoice_email text,
    brand_guide jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    business_registration_number text,
    representative_name text,
    business_address text,
    business_type text,
    business_item text,
    CONSTRAINT workspaces_plan_check CHECK ((plan = ANY (ARRAY['starter'::text, 'growth'::text, 'custom'::text]))),
    CONSTRAINT workspaces_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'::text))
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: invoice_line_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: meeting_attendees; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: meetings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notification_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notification_unsubscribe_tokens; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: preprod_boards; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: preprod_frame_comments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: preprod_frame_reactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: preprod_frames; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: project_deliverables; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: project_milestones; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: project_references; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: project_threads; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: showcase_media; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: showcases; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: supplier_profile; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: team_channel_message_attachments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: team_channel_messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: team_channels; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: thread_message_attachments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: thread_messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: workspace_invitations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: workspace_members; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: workspaces; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--



--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_workspace_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_workspace_id_slug_key UNIQUE (workspace_id, slug);


--
-- Name: invoice_line_items invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_popbill_mgt_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_popbill_mgt_key_key UNIQUE (popbill_mgt_key);


--
-- Name: meeting_attendees meeting_attendees_meeting_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_attendees
    ADD CONSTRAINT meeting_attendees_meeting_id_email_key UNIQUE (meeting_id, email);


--
-- Name: meeting_attendees meeting_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_attendees
    ADD CONSTRAINT meeting_attendees_pkey PRIMARY KEY (id);


--
-- Name: meetings meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);


--
-- Name: notification_events notification_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: notification_unsubscribe_tokens notification_unsubscribe_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_unsubscribe_tokens
    ADD CONSTRAINT notification_unsubscribe_tokens_pkey PRIMARY KEY (token);


--
-- Name: preprod_boards preprod_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_boards
    ADD CONSTRAINT preprod_boards_pkey PRIMARY KEY (id);


--
-- Name: preprod_boards preprod_boards_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_boards
    ADD CONSTRAINT preprod_boards_share_token_key UNIQUE (share_token);


--
-- Name: preprod_frame_comments preprod_frame_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frame_comments
    ADD CONSTRAINT preprod_frame_comments_pkey PRIMARY KEY (id);


--
-- Name: preprod_frame_reactions preprod_frame_reactions_frame_id_reactor_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frame_reactions
    ADD CONSTRAINT preprod_frame_reactions_frame_id_reactor_email_key UNIQUE (frame_id, reactor_email);


--
-- Name: preprod_frame_reactions preprod_frame_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frame_reactions
    ADD CONSTRAINT preprod_frame_reactions_pkey PRIMARY KEY (id);


--
-- Name: preprod_frames preprod_frames_board_id_revision_group_revision_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frames
    ADD CONSTRAINT preprod_frames_board_id_revision_group_revision_key UNIQUE (board_id, revision_group, revision);


--
-- Name: preprod_frames preprod_frames_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frames
    ADD CONSTRAINT preprod_frames_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_handle_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_handle_key UNIQUE (handle);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_deliverables project_deliverables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_deliverables
    ADD CONSTRAINT project_deliverables_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_references project_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_references
    ADD CONSTRAINT project_references_pkey PRIMARY KEY (id);


--
-- Name: project_threads project_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_threads
    ADD CONSTRAINT project_threads_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: showcase_media showcase_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcase_media
    ADD CONSTRAINT showcase_media_pkey PRIMARY KEY (id);


--
-- Name: showcase_media showcase_media_showcase_id_sort_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcase_media
    ADD CONSTRAINT showcase_media_showcase_id_sort_order_key UNIQUE (showcase_id, sort_order);


--
-- Name: showcases showcases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcases
    ADD CONSTRAINT showcases_pkey PRIMARY KEY (id);


--
-- Name: showcases showcases_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcases
    ADD CONSTRAINT showcases_slug_key UNIQUE (slug);


--
-- Name: supplier_profile supplier_profile_business_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_profile
    ADD CONSTRAINT supplier_profile_business_registration_number_key UNIQUE (business_registration_number);


--
-- Name: supplier_profile supplier_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_profile
    ADD CONSTRAINT supplier_profile_pkey PRIMARY KEY (id);


--
-- Name: team_channel_message_attachments team_channel_message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_channel_message_attachments
    ADD CONSTRAINT team_channel_message_attachments_pkey PRIMARY KEY (id);


--
-- Name: team_channel_messages team_channel_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_channel_messages
    ADD CONSTRAINT team_channel_messages_pkey PRIMARY KEY (id);


--
-- Name: team_channels team_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_channels
    ADD CONSTRAINT team_channels_pkey PRIMARY KEY (id);


--
-- Name: team_channels team_channels_workspace_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_channels
    ADD CONSTRAINT team_channels_workspace_id_slug_key UNIQUE (workspace_id, slug);


--
-- Name: thread_message_attachments thread_message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_message_attachments
    ADD CONSTRAINT thread_message_attachments_pkey PRIMARY KEY (id);


--
-- Name: thread_messages thread_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT thread_messages_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_workspace_id_key UNIQUE (user_id, role, workspace_id);


--
-- Name: workspace_invitations workspace_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_pkey PRIMARY KEY (id);


--
-- Name: workspace_invitations workspace_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_token_key UNIQUE (token);


--
-- Name: workspace_invitations workspace_invitations_workspace_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_workspace_id_email_key UNIQUE (workspace_id, email);


--
-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);


--
-- Name: workspace_members workspace_members_workspace_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: workspaces workspaces_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_slug_key UNIQUE (slug);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: brands_workspace_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brands_workspace_idx ON public.brands USING btree (workspace_id);


--
-- Name: deliverables_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deliverables_project_idx ON public.project_deliverables USING btree (project_id);


--
-- Name: idx_invoice_items_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_invoice ON public.invoice_line_items USING btree (invoice_id);


--
-- Name: idx_invoices_is_mock; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_is_mock ON public.invoices USING btree (is_mock) WHERE (is_mock = true);


--
-- Name: idx_invoices_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_project ON public.invoices USING btree (project_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_invoices_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_workspace ON public.invoices USING btree (workspace_id);


--
-- Name: idx_meeting_attendees_meeting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_attendees_meeting ON public.meeting_attendees USING btree (meeting_id);


--
-- Name: idx_meetings_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_project ON public.meetings USING btree (project_id);


--
-- Name: idx_meetings_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_scheduled ON public.meetings USING btree (scheduled_at);


--
-- Name: idx_meetings_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_workspace ON public.meetings USING btree (workspace_id);


--
-- Name: idx_notif_events_user_unseen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_events_user_unseen ON public.notification_events USING btree (user_id, created_at DESC) WHERE (in_app_seen_at IS NULL);


--
-- Name: idx_notif_events_user_unsent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_events_user_unsent ON public.notification_events USING btree (user_id, severity, created_at) WHERE (email_sent_at IS NULL);


--
-- Name: idx_preprod_boards_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preprod_boards_project ON public.preprod_boards USING btree (project_id);


--
-- Name: idx_preprod_boards_share_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_preprod_boards_share_token ON public.preprod_boards USING btree (share_token) WHERE (share_token IS NOT NULL);


--
-- Name: idx_preprod_comments_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preprod_comments_board ON public.preprod_frame_comments USING btree (board_id);


--
-- Name: idx_preprod_comments_frame; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preprod_comments_frame ON public.preprod_frame_comments USING btree (frame_id);


--
-- Name: idx_preprod_frames_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preprod_frames_board ON public.preprod_frames USING btree (board_id);


--
-- Name: idx_preprod_frames_one_current; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_preprod_frames_one_current ON public.preprod_frames USING btree (revision_group) WHERE (is_current_revision = true);


--
-- Name: idx_preprod_frames_revision_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preprod_frames_revision_group ON public.preprod_frames USING btree (revision_group, is_current_revision);


--
-- Name: idx_preprod_reactions_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preprod_reactions_board ON public.preprod_frame_reactions USING btree (board_id);


--
-- Name: idx_preprod_reactions_frame; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preprod_reactions_frame ON public.preprod_frame_reactions USING btree (frame_id);


--
-- Name: idx_project_references_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_references_media_type ON public.project_references USING btree (project_id, media_type);


--
-- Name: idx_showcase_media_showcase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_showcase_media_showcase ON public.showcase_media USING btree (showcase_id);


--
-- Name: idx_showcases_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_showcases_project ON public.showcases USING btree (project_id);


--
-- Name: idx_showcases_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_showcases_published ON public.showcases USING btree (status, published_at DESC) WHERE (status = 'published'::text);


--
-- Name: idx_showcases_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_showcases_slug ON public.showcases USING btree (slug);


--
-- Name: idx_tc_attachments_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tc_attachments_message ON public.team_channel_message_attachments USING btree (message_id);


--
-- Name: idx_team_channel_messages_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_channel_messages_channel ON public.team_channel_messages USING btree (channel_id, created_at DESC);


--
-- Name: idx_team_channels_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_channels_workspace ON public.team_channels USING btree (workspace_id);


--
-- Name: idx_thread_message_attachments_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thread_message_attachments_message ON public.thread_message_attachments USING btree (message_id);


--
-- Name: idx_unsub_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unsub_tokens_user ON public.notification_unsubscribe_tokens USING btree (user_id);


--
-- Name: milestones_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX milestones_project_idx ON public.project_milestones USING btree (project_id);


--
-- Name: notif_events_debounce_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notif_events_debounce_uniq ON public.notification_events USING btree (user_id, kind, project_id) WHERE ((email_sent_at IS NULL) AND (in_app_seen_at IS NULL) AND (project_id IS NOT NULL) AND (kind = ANY (ARRAY['feedback_received'::text, 'frame_uploaded_batch'::text])));


--
-- Name: project_refs_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_refs_project_idx ON public.project_references USING btree (project_id);


--
-- Name: project_threads_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_threads_project_idx ON public.project_threads USING btree (project_id);


--
-- Name: projects_brand_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_brand_idx ON public.projects USING btree (brand_id);


--
-- Name: projects_type_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_type_status_idx ON public.projects USING btree (project_type, status);


--
-- Name: projects_workspace_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_workspace_idx ON public.projects USING btree (workspace_id);


--
-- Name: thread_messages_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thread_messages_thread_idx ON public.thread_messages USING btree (thread_id);


--
-- Name: user_roles_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_roles_user_idx ON public.user_roles USING btree (user_id);


--
-- Name: user_roles_ws_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_roles_ws_idx ON public.user_roles USING btree (workspace_id);


--
-- Name: workspaces_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workspaces_slug_idx ON public.workspaces USING btree (slug);


--
-- Name: ws_members_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ws_members_user_idx ON public.workspace_members USING btree (user_id);


--
-- Name: ws_members_ws_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ws_members_ws_idx ON public.workspace_members USING btree (workspace_id);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: brands brands_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER brands_touch BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


--
-- Name: invoice_line_items invoice_items_recalc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_items_recalc AFTER INSERT OR DELETE OR UPDATE ON public.invoice_line_items FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_totals();


--
-- Name: invoices invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


--
-- Name: meetings meetings_sync_workspace_id_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER meetings_sync_workspace_id_ins BEFORE INSERT ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.meetings_sync_workspace_id();


--
-- Name: meetings meetings_sync_workspace_id_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER meetings_sync_workspace_id_upd BEFORE UPDATE OF project_id ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.meetings_sync_workspace_id();


--
-- Name: meetings meetings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


--
-- Name: preprod_boards preprod_boards_set_workspace_id_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER preprod_boards_set_workspace_id_ins BEFORE INSERT ON public.preprod_boards FOR EACH ROW EXECUTE FUNCTION public.preprod_boards_set_workspace_id();


--
-- Name: preprod_boards preprod_boards_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER preprod_boards_touch_updated_at BEFORE UPDATE ON public.preprod_boards FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


--
-- Name: preprod_frames preprod_frames_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER preprod_frames_touch_updated_at BEFORE UPDATE ON public.preprod_frames FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


--
-- Name: preprod_frame_reactions preprod_reactions_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER preprod_reactions_touch_updated_at BEFORE UPDATE ON public.preprod_frame_reactions FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


--
-- Name: profiles profiles_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


--
-- Name: projects projects_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


--
-- Name: supplier_profile supplier_profile_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_profile_updated_at BEFORE UPDATE ON public.supplier_profile FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


--
-- Name: notification_preferences tg_set_notif_prefs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_set_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: showcases trg_showcases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_showcases_updated_at BEFORE UPDATE ON public.showcases FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: team_channels trg_team_channels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_team_channels_updated_at BEFORE UPDATE ON public.team_channels FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: workspaces workspaces_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workspaces_touch BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: brands brands_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: invoice_line_items invoice_line_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: invoices invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: invoices invoices_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier_profile(id);


--
-- Name: invoices invoices_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT;


--
-- Name: meeting_attendees meeting_attendees_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_attendees
    ADD CONSTRAINT meeting_attendees_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- Name: meeting_attendees meeting_attendees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_attendees
    ADD CONSTRAINT meeting_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: meetings meetings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: meetings meetings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: meetings meetings_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: notification_events notification_events_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: notification_events notification_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notification_events notification_events_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notification_unsubscribe_tokens notification_unsubscribe_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_unsubscribe_tokens
    ADD CONSTRAINT notification_unsubscribe_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: preprod_boards preprod_boards_cover_frame_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_boards
    ADD CONSTRAINT preprod_boards_cover_frame_fk FOREIGN KEY (cover_frame_id) REFERENCES public.preprod_frames(id) ON DELETE SET NULL;


--
-- Name: preprod_boards preprod_boards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_boards
    ADD CONSTRAINT preprod_boards_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: preprod_boards preprod_boards_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_boards
    ADD CONSTRAINT preprod_boards_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: preprod_boards preprod_boards_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_boards
    ADD CONSTRAINT preprod_boards_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: preprod_frame_comments preprod_frame_comments_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frame_comments
    ADD CONSTRAINT preprod_frame_comments_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id);


--
-- Name: preprod_frame_comments preprod_frame_comments_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frame_comments
    ADD CONSTRAINT preprod_frame_comments_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;


--
-- Name: preprod_frame_comments preprod_frame_comments_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frame_comments
    ADD CONSTRAINT preprod_frame_comments_frame_id_fkey FOREIGN KEY (frame_id) REFERENCES public.preprod_frames(id) ON DELETE CASCADE;


--
-- Name: preprod_frame_comments preprod_frame_comments_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frame_comments
    ADD CONSTRAINT preprod_frame_comments_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: preprod_frame_reactions preprod_frame_reactions_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frame_reactions
    ADD CONSTRAINT preprod_frame_reactions_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;


--
-- Name: preprod_frame_reactions preprod_frame_reactions_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frame_reactions
    ADD CONSTRAINT preprod_frame_reactions_frame_id_fkey FOREIGN KEY (frame_id) REFERENCES public.preprod_frames(id) ON DELETE CASCADE;


--
-- Name: preprod_frames preprod_frames_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preprod_frames
    ADD CONSTRAINT preprod_frames_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_deliverables project_deliverables_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_deliverables
    ADD CONSTRAINT project_deliverables_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_deliverables project_deliverables_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_deliverables
    ADD CONSTRAINT project_deliverables_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: project_deliverables project_deliverables_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_deliverables
    ADD CONSTRAINT project_deliverables_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id);


--
-- Name: project_milestones project_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_references project_references_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_references
    ADD CONSTRAINT project_references_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id);


--
-- Name: project_references project_references_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_references
    ADD CONSTRAINT project_references_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_threads project_threads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_threads
    ADD CONSTRAINT project_threads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: project_threads project_threads_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_threads
    ADD CONSTRAINT project_threads_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: projects projects_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: showcase_media showcase_media_showcase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcase_media
    ADD CONSTRAINT showcase_media_showcase_id_fkey FOREIGN KEY (showcase_id) REFERENCES public.showcases(id) ON DELETE CASCADE;


--
-- Name: showcases showcases_badge_removal_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcases
    ADD CONSTRAINT showcases_badge_removal_approved_by_fkey FOREIGN KEY (badge_removal_approved_by) REFERENCES auth.users(id);


--
-- Name: showcases showcases_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcases
    ADD CONSTRAINT showcases_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id);


--
-- Name: showcases showcases_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcases
    ADD CONSTRAINT showcases_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: showcases showcases_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showcases
    ADD CONSTRAINT showcases_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: team_channel_message_attachments team_channel_message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_channel_message_attachments
    ADD CONSTRAINT team_channel_message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.team_channel_messages(id) ON DELETE CASCADE;


--
-- Name: team_channel_messages team_channel_messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_channel_messages
    ADD CONSTRAINT team_channel_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- Name: team_channel_messages team_channel_messages_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_channel_messages
    ADD CONSTRAINT team_channel_messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.team_channels(id) ON DELETE CASCADE;


--
-- Name: team_channels team_channels_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_channels
    ADD CONSTRAINT team_channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: team_channels team_channels_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_channels
    ADD CONSTRAINT team_channels_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: thread_message_attachments thread_message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_message_attachments
    ADD CONSTRAINT thread_message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.thread_messages(id) ON DELETE CASCADE;


--
-- Name: thread_messages thread_messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT thread_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);


--
-- Name: thread_messages thread_messages_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT thread_messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.thread_messages(id) ON DELETE SET NULL;


--
-- Name: thread_messages thread_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT thread_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.project_threads(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_invitations workspace_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);


--
-- Name: workspace_invitations workspace_invitations_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);


--
-- Name: workspace_members workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

--
-- Name: brands brands_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: brands brands_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: project_deliverables deliverables_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deliverables_rw ON public.project_deliverables TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: invoice_line_items invoice_items_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));


--
-- Name: invoice_line_items invoice_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoice_items_select ON public.invoice_line_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));


--
-- Name: invoice_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices invoices_hide_drafts_from_clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));


--
-- Name: invoices invoices_hide_mocks_from_clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));


--
-- Name: invoices invoices_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));


--
-- Name: invoices invoices_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));


--
-- Name: invoices invoices_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));


--
-- Name: meeting_attendees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_attendees meeting_attendees_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meeting_attendees_insert ON public.meeting_attendees FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: meeting_attendees meeting_attendees_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meeting_attendees_select ON public.meeting_attendees FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: meetings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

--
-- Name: meetings meetings_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: meetings meetings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: meetings meetings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: project_milestones milestones_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY milestones_rw ON public.project_milestones TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: notification_events notif_events_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_events_select_own ON public.notification_events FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: notification_events notif_events_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_events_update_own ON public.notification_events FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: notification_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_unsubscribe_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences prefs_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prefs_select_own ON public.notification_preferences FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: notification_preferences prefs_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prefs_update_own ON public.notification_preferences FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: notification_preferences prefs_upsert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prefs_upsert_own ON public.notification_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: preprod_boards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preprod_boards ENABLE ROW LEVEL SECURITY;

--
-- Name: preprod_boards preprod_boards_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));


--
-- Name: preprod_boards preprod_boards_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));


--
-- Name: preprod_boards preprod_boards_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));


--
-- Name: preprod_boards preprod_boards_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));


--
-- Name: preprod_frame_comments preprod_comments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_comments_select ON public.preprod_frame_comments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));


--
-- Name: preprod_frame_comments preprod_comments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_comments_update ON public.preprod_frame_comments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));


--
-- Name: preprod_frame_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preprod_frame_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: preprod_frame_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preprod_frame_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: preprod_frames; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preprod_frames ENABLE ROW LEVEL SECURITY;

--
-- Name: preprod_frames preprod_frames_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_frames_delete ON public.preprod_frames FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));


--
-- Name: preprod_frames preprod_frames_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_frames_insert ON public.preprod_frames FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));


--
-- Name: preprod_frames preprod_frames_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_frames_select ON public.preprod_frames FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));


--
-- Name: preprod_frames preprod_frames_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_frames_update ON public.preprod_frames FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));


--
-- Name: preprod_frame_reactions preprod_reactions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preprod_reactions_select ON public.preprod_frame_reactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: profiles profiles_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: profiles profiles_upsert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));


--
-- Name: project_references proj_refs_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY proj_refs_rw ON public.project_references TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: project_threads proj_threads_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY proj_threads_rw ON public.project_threads TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: project_deliverables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;

--
-- Name: project_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: project_references; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_references ENABLE ROW LEVEL SECURITY;

--
-- Name: project_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: projects projects_delete_yagi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));


--
-- Name: projects projects_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: projects projects_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: showcase_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.showcase_media ENABLE ROW LEVEL SECURITY;

--
-- Name: showcase_media showcase_media_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY showcase_media_delete ON public.showcase_media FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.showcases s
  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));


--
-- Name: showcase_media showcase_media_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY showcase_media_insert ON public.showcase_media FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.showcases s
  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));


--
-- Name: showcase_media showcase_media_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY showcase_media_select ON public.showcase_media FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.showcases s
  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.projects p
          WHERE ((p.id = s.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))))))));


--
-- Name: showcase_media showcase_media_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY showcase_media_update ON public.showcase_media FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.showcases s
  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));


--
-- Name: showcases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.showcases ENABLE ROW LEVEL SECURITY;

--
-- Name: showcases showcases_delete_internal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));


--
-- Name: showcases showcases_insert_internal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));


--
-- Name: showcases showcases_select_internal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = showcases.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id))))));


--
-- Name: showcases showcases_update_internal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id))))));


--
-- Name: supplier_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_profile supplier_profile_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));


--
-- Name: supplier_profile supplier_profile_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));


--
-- Name: team_channel_message_attachments tc_attachments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_attachments_insert ON public.team_channel_message_attachments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.team_channel_messages m
  WHERE ((m.id = team_channel_message_attachments.message_id) AND (m.author_id = auth.uid())))));


--
-- Name: team_channel_message_attachments tc_attachments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_attachments_select ON public.team_channel_message_attachments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.team_channel_messages m
     JOIN public.team_channels c ON ((c.id = m.channel_id)))
  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: team_channel_message_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_channel_message_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: team_channel_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_channel_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: team_channel_messages team_channel_messages_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));


--
-- Name: team_channel_messages team_channel_messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_channel_messages_insert ON public.team_channel_messages FOR INSERT WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.team_channels c
  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND public.is_ws_member(auth.uid(), c.workspace_id))))));


--
-- Name: team_channel_messages team_channel_messages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_channel_messages_select ON public.team_channel_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_channels c
  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: team_channel_messages team_channel_messages_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_channel_messages_update ON public.team_channel_messages FOR UPDATE USING ((author_id = auth.uid())) WITH CHECK ((author_id = auth.uid()));


--
-- Name: team_channels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: team_channels team_channels_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));


--
-- Name: team_channels team_channels_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));


--
-- Name: team_channels team_channels_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));


--
-- Name: thread_message_attachments thread_attachments_hide_internal_from_clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
   FROM public.thread_messages tm
  WHERE ((tm.id = thread_message_attachments.message_id) AND (tm.visibility = 'internal'::text)))))));


--
-- Name: thread_message_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.thread_message_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: thread_message_attachments thread_message_attachments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY thread_message_attachments_delete ON public.thread_message_attachments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.thread_messages tm
  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: thread_message_attachments thread_message_attachments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY thread_message_attachments_insert ON public.thread_message_attachments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.thread_messages tm
     JOIN public.project_threads t ON ((t.id = tm.thread_id)))
     JOIN public.projects p ON ((p.id = t.project_id)))
  WHERE ((tm.id = thread_message_attachments.message_id) AND (tm.author_id = auth.uid()) AND public.is_ws_member(auth.uid(), p.workspace_id)))));


--
-- Name: thread_message_attachments thread_message_attachments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY thread_message_attachments_select ON public.thread_message_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.thread_messages tm
     JOIN public.project_threads t ON ((t.id = tm.thread_id)))
     JOIN public.projects p ON ((p.id = t.project_id)))
  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: thread_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: thread_messages thread_messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY thread_messages_insert ON public.thread_messages FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.project_threads t
     JOIN public.projects p ON ((p.id = t.project_id)))
  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));


--
-- Name: thread_messages thread_msgs_hide_internal_from_clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));


--
-- Name: thread_messages thread_msgs_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY thread_msgs_rw ON public.thread_messages TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.project_threads t
     JOIN public.projects p ON ((p.id = t.project_id)))
  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.project_threads t
     JOIN public.projects p ON ((p.id = t.project_id)))
  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));


--
-- Name: notification_unsubscribe_tokens unsub_tokens_deny_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY unsub_tokens_deny_all ON public.notification_unsubscribe_tokens USING (false) WITH CHECK (false);


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));


--
-- Name: user_roles user_roles_self_insert_creator; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));


--
-- Name: user_roles user_roles_self_insert_ws_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));


--
-- Name: user_roles user_roles_yagi_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));


--
-- Name: workspace_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

--
-- Name: workspaces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

--
-- Name: workspaces ws_create_any_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ws_create_any_auth ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: workspaces ws_delete_yagi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));


--
-- Name: workspace_invitations ws_inv_read_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: workspace_invitations ws_inv_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: workspace_members ws_members_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: workspace_members ws_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: workspace_members ws_members_self_bootstrap; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
   FROM public.workspace_members m
  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: workspaces ws_read_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: workspaces ws_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));


--
-- Name: objects avatars_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY avatars_read ON storage.objects FOR SELECT USING ((bucket_id = 'avatars'::text));


--
-- Name: objects avatars_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND (owner = auth.uid())));


--
-- Name: objects avatars_write; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY avatars_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));


--
-- Name: objects brand_logos_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY brand_logos_read ON storage.objects FOR SELECT USING ((bucket_id = 'brand-logos'::text));


--
-- Name: objects brand_logos_write; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY brand_logos_write ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'brand-logos'::text));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: objects deliverables_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY deliverables_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'project-deliverables'::text));


--
-- Name: objects deliverables_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY deliverables_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'project-deliverables'::text) AND (EXISTS ( SELECT 1
   FROM (public.project_deliverables d
     JOIN public.projects p ON ((p.id = d.project_id)))
  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));


--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: objects preprod-frames delete internal; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));


--
-- Name: objects preprod-frames read internal; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_member(auth.uid(), b.workspace_id)))))));


--
-- Name: objects preprod-frames write internal; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.preprod_boards b
  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));


--
-- Name: objects refs_insert_authorized; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY refs_insert_authorized ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'project-references'::text) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));


--
-- Name: objects refs_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY refs_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'project-references'::text) AND (EXISTS ( SELECT 1
   FROM (public.project_references pr
     JOIN public.projects p ON ((p.id = pr.project_id)))
  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));


--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: objects showcase-media delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));


--
-- Name: objects showcase-media read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.showcases s
     JOIN public.projects p ON ((p.id = s.project_id)))
  WHERE ((s.id = ((storage.foldername(objects.name))[1])::uuid) AND public.is_ws_member(auth.uid(), p.workspace_id)))))));


--
-- Name: objects showcase-media update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));


--
-- Name: objects showcase-media write; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));


--
-- Name: objects showcase-og delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));


--
-- Name: objects showcase-og update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));


--
-- Name: objects showcase-og write; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));


--
-- Name: objects tc-attachments read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "tc-attachments read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));


--
-- Name: objects tc-attachments write; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "tc-attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));


--
-- Name: objects thread_attachments_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY thread_attachments_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));


--
-- Name: objects thread_attachments_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY thread_attachments_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));


--
-- Name: objects thread_attachments_objects_hide_internal; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
   FROM (public.thread_message_attachments tma
     JOIN public.thread_messages tm ON ((tm.id = tma.message_id)))
  WHERE (((tma.storage_path = objects.name) OR (tma.thumbnail_path = objects.name)) AND (tm.visibility = 'internal'::text)))))));


--
-- Name: objects thread_attachments_select; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY thread_attachments_select ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));


--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: objects ws_logos_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY ws_logos_read ON storage.objects FOR SELECT USING ((bucket_id = 'workspace-logos'::text));


--
-- Name: objects ws_logos_write; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY ws_logos_write ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'workspace-logos'::text));


--
-- MANUAL SUPPLEMENT 2/2 — storage bucket rows + realtime publication membership
-- Captured 2026-04-22 from live storage.buckets and pg_publication_tables.
-- pg_dump --schema-only skips data rows, and publication membership is dumped
-- only when the publication itself is in scope (it isn't, under --schema=public,storage).
--

-- 10 storage buckets (ON CONFLICT DO NOTHING for re-apply safety)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars',                  'avatars',                  false),
  ('brand-logos',              'brand-logos',              true),
  ('preprod-frames',           'preprod-frames',           false),
  ('project-deliverables',     'project-deliverables',     false),
  ('project-references',       'project-references',       false),
  ('showcase-media',           'showcase-media',           false),
  ('showcase-og',              'showcase-og',              true),
  ('team-channel-attachments', 'team-channel-attachments', false),
  ('thread-attachments',       'thread-attachments',       false),
  ('workspace-logos',          'workspace-logos',          true)
ON CONFLICT (id) DO NOTHING;

-- 3 realtime publication members (idempotent guards: only add if not already present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notification_events') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_events';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'team_channel_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.team_channel_messages';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'team_channel_message_attachments') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.team_channel_message_attachments';
  END IF;
END $$;

--
-- PostgreSQL database dump complete
--


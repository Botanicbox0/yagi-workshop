-- Phase 2.5 G8 hardening v3 — closes K05-003A (wrong-type reject) + K05-003B (whitelist).
-- Final loop (3/3 authorized by yagi). Per Codex pass 2 remaining findings.

BEGIN;

CREATE OR REPLACE FUNCTION public.validate_challenge_submission_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_state text;
  v_reqs jsonb;
  v_min_chars int;
  v_max_chars int;
  v_text text;
  v_req_native_video boolean;
  v_req_image boolean;
  v_req_pdf boolean;
  v_req_youtube boolean;
  v_image_max_count int;
  v_yt text;
BEGIN
  SELECT state, submission_requirements INTO v_state, v_reqs
    FROM public.challenges WHERE id = NEW.challenge_id;

  -- Challenge state enforcement (unchanged).
  IF TG_OP = 'INSERT' AND v_state <> 'open' THEN
    RAISE EXCEPTION 'challenge_not_open' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND v_state <> 'open' THEN
    RAISE EXCEPTION 'challenge_locked' USING ERRCODE = '23514';
  END IF;

  -- Status enforcement (unchanged).
  IF TG_OP = 'INSERT' AND NEW.status <> 'ready' THEN
    RAISE EXCEPTION 'invalid_submission_status' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_yagi_admin((select auth.uid())) THEN
      RAISE EXCEPTION 'status_change_admin_only' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- content must be an object.
  IF jsonb_typeof(NEW.content) <> 'object' THEN
    RAISE EXCEPTION 'content_must_be_object' USING ERRCODE = '22023';
  END IF;

  -- === v3 NEW: Wrong-type reject when key present (K05-003A) ===
  IF NEW.content ? 'native_video' AND jsonb_typeof(NEW.content->'native_video') <> 'object' THEN
    RAISE EXCEPTION 'native_video_wrong_type' USING ERRCODE = '22023';
  END IF;
  IF NEW.content ? 'images' AND jsonb_typeof(NEW.content->'images') <> 'array' THEN
    RAISE EXCEPTION 'images_wrong_type' USING ERRCODE = '22023';
  END IF;
  IF NEW.content ? 'pdf' AND jsonb_typeof(NEW.content->'pdf') <> 'object' THEN
    RAISE EXCEPTION 'pdf_wrong_type' USING ERRCODE = '22023';
  END IF;
  IF NEW.content ? 'youtube_url' AND jsonb_typeof(NEW.content->'youtube_url') <> 'string' THEN
    RAISE EXCEPTION 'youtube_url_wrong_type' USING ERRCODE = '22023';
  END IF;

  -- === v3 NEW: Whitelist — reject undeclared keys (K05-003B) ===
  IF NEW.content ? 'native_video' AND v_reqs->'native_video' IS NULL THEN
    RAISE EXCEPTION 'native_video_not_declared' USING ERRCODE = '23514';
  END IF;
  IF NEW.content ? 'images' AND v_reqs->'image' IS NULL THEN
    RAISE EXCEPTION 'image_not_declared' USING ERRCODE = '23514';
  END IF;
  IF NEW.content ? 'pdf' AND v_reqs->'pdf' IS NULL THEN
    RAISE EXCEPTION 'pdf_not_declared' USING ERRCODE = '23514';
  END IF;
  IF NEW.content ? 'youtube_url' AND v_reqs->'youtube_url' IS NULL THEN
    RAISE EXCEPTION 'youtube_url_not_declared' USING ERRCODE = '23514';
  END IF;

  -- text_description bounds (always required per SPEC §1).
  v_min_chars := COALESCE((v_reqs->'text_description'->>'min_chars')::int, 50);
  v_max_chars := COALESCE((v_reqs->'text_description'->>'max_chars')::int, 2000);
  v_text := NEW.content->>'text_description';
  IF v_text IS NULL OR char_length(v_text) < v_min_chars OR char_length(v_text) > v_max_chars THEN
    RAISE EXCEPTION 'text_description_out_of_bounds' USING ERRCODE = '23514';
  END IF;

  -- native_video: required-ness + shape (unchanged).
  v_req_native_video := COALESCE((v_reqs->'native_video'->>'required')::boolean, false);
  IF v_req_native_video THEN
    IF NEW.content->'native_video' IS NULL OR jsonb_typeof(NEW.content->'native_video') <> 'object' THEN
      RAISE EXCEPTION 'native_video_required' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF jsonb_typeof(NEW.content->'native_video') = 'object' THEN
    IF (NEW.content->'native_video'->>'objectKey') IS NULL THEN
      RAISE EXCEPTION 'native_video_missing_objectKey' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- image: required-ness + array type + count bounds (unchanged).
  v_req_image := COALESCE((v_reqs->'image'->>'required')::boolean, false);
  v_image_max_count := COALESCE((v_reqs->'image'->>'max_count')::int, 5);
  IF v_req_image THEN
    IF NEW.content->'images' IS NULL
       OR jsonb_typeof(NEW.content->'images') <> 'array'
       OR jsonb_array_length(NEW.content->'images') = 0 THEN
      RAISE EXCEPTION 'image_required' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF jsonb_typeof(NEW.content->'images') = 'array' THEN
    IF jsonb_array_length(NEW.content->'images') > v_image_max_count THEN
      RAISE EXCEPTION 'image_count_exceeded' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.content->'images') AS img
       WHERE jsonb_typeof(img) <> 'object' OR (img->>'objectKey') IS NULL
    ) THEN
      RAISE EXCEPTION 'image_item_missing_objectKey' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- pdf: required-ness + shape (unchanged).
  v_req_pdf := COALESCE((v_reqs->'pdf'->>'required')::boolean, false);
  IF v_req_pdf THEN
    IF NEW.content->'pdf' IS NULL OR jsonb_typeof(NEW.content->'pdf') <> 'object' THEN
      RAISE EXCEPTION 'pdf_required' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF jsonb_typeof(NEW.content->'pdf') = 'object' THEN
    IF (NEW.content->'pdf'->>'objectKey') IS NULL THEN
      RAISE EXCEPTION 'pdf_missing_objectKey' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- youtube_url: required-ness + regex (unchanged).
  v_req_youtube := COALESCE((v_reqs->'youtube_url'->>'required')::boolean, false);
  v_yt := NEW.content->>'youtube_url';
  IF v_req_youtube THEN
    IF v_yt IS NULL OR v_yt = '' THEN
      RAISE EXCEPTION 'youtube_url_required' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF v_yt IS NOT NULL AND v_yt <> '' THEN
    IF NOT (
      v_yt ~ '^https?://(www\.|m\.)?youtube\.com/watch\?v=[A-Za-z0-9_-]{11}([&?].*)?$'
      OR v_yt ~ '^https?://(www\.|m\.)?youtube\.com/shorts/[A-Za-z0-9_-]{11}/?([?].*)?$'
      OR v_yt ~ '^https?://(www\.|m\.)?youtube\.com/embed/[A-Za-z0-9_-]{11}/?([?].*)?$'
      OR v_yt ~ '^https?://youtu\.be/[A-Za-z0-9_-]{11}/?([?].*)?$'
    ) THEN
      RAISE EXCEPTION 'youtube_url_invalid' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_challenge_submission_content() FROM PUBLIC;

COMMENT ON FUNCTION public.validate_challenge_submission_content() IS
  'Phase 2.5 G8 hardening v3 (K05-003A wrong-type reject + K05-003B undeclared-key whitelist). Final loop 3/3.';

COMMIT;

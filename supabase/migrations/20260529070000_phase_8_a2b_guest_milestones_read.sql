-- Phase 8 Wave A.2.b — Guest project room schedule read
--
-- Existing guest SELECT policies cover projects / project_threads /
-- thread_messages / project_deliverables. The guest room also needs the
-- schedule tab, but `meetings` contains meet links and meeting summaries, so
-- this migration exposes only the project milestone timeline.

DROP POLICY IF EXISTS project_milestones_guest_select ON public.project_milestones;
CREATE POLICY project_milestones_guest_select
ON public.project_milestones
FOR SELECT
TO authenticated
USING (public.is_project_guest(project_id, auth.uid()));

COMMENT ON POLICY project_milestones_guest_select ON public.project_milestones IS
  'Phase 8 A.2.b: project-scoped guests may read milestone schedule rows for their invited project only.';

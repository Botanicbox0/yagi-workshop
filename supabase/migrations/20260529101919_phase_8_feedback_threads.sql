-- Phase 8 — Feedback threads per deliverable version.
-- Existing project-level threads remain deliverable_id NULL.

ALTER TABLE public.project_deliverables
  ADD CONSTRAINT project_deliverables_project_id_id_key UNIQUE (project_id, id);

ALTER TABLE public.project_threads
  ADD COLUMN deliverable_id uuid NULL;

ALTER TABLE public.project_threads
  ADD CONSTRAINT project_threads_deliverable_project_fkey
  FOREIGN KEY (project_id, deliverable_id)
  REFERENCES public.project_deliverables(project_id, id)
  ON DELETE CASCADE;

CREATE INDEX project_threads_deliverable_idx
  ON public.project_threads(deliverable_id)
  WHERE deliverable_id IS NOT NULL;

CREATE UNIQUE INDEX project_threads_one_per_deliverable_idx
  ON public.project_threads(project_id, deliverable_id)
  WHERE deliverable_id IS NOT NULL;

COMMENT ON COLUMN public.project_threads.deliverable_id IS
  'Phase 8: NULL = general project thread; non-NULL = feedback thread for one project_deliverables version.';

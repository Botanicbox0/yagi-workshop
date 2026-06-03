-- R4.5 security fix: deliverable_annotations SELECT leaked internal-visibility annotations
-- (and would leak draft-deliverable annotations) to ws_members. The broad project-membership
-- SELECT policy was permissive and ORed with the visibility policy, so membership alone granted
-- read access regardless of visibility OR the parent deliverable's released_at (R1) gate.
-- Replace the two permissive SELECT policies with a correctly-gated set:
--   admin  -> all annotations
--   member -> visibility='client' AND parent deliverable released AND ws_member
--   guest  -> visibility='client' AND parent deliverable released AND project guest
--
-- NOTE: already applied to prod via Supabase MCP (version 20260603194019) and K-05 verified
-- both directions (member cannot see internal/draft annotations; member still sees client
-- annotations on released deliverables; admin sees all). Version-matched, will not re-run.

drop policy if exists deliverable_annotations_project_select on public.deliverable_annotations;
drop policy if exists deliverable_annotations_visibility_select on public.deliverable_annotations;

create policy deliverable_annotations_select_admin
  on public.deliverable_annotations for select to authenticated
  using ( is_yagi_admin(auth.uid()) );

create policy deliverable_annotations_select_member
  on public.deliverable_annotations for select to authenticated
  using (
    visibility = 'client'
    and exists (
      select 1 from public.projects p
      where p.id = deliverable_annotations.project_id
        and is_ws_member(auth.uid(), p.workspace_id)
    )
    and exists (
      select 1 from public.project_deliverables d
      where d.id = deliverable_annotations.deliverable_id
        and d.released_at is not null
    )
  );

create policy deliverable_annotations_select_guest
  on public.deliverable_annotations for select to authenticated
  using (
    visibility = 'client'
    and exists (
      select 1 from public.projects p
      where p.id = deliverable_annotations.project_id
        and is_project_guest(p.id, auth.uid())
    )
    and exists (
      select 1 from public.project_deliverables d
      where d.id = deliverable_annotations.deliverable_id
        and d.released_at is not null
    )
  );

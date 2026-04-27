'use server';

import { createSupabaseServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function callTransition(
  projectId: string,
  toStatus: string,
  comment: string | null
) {
  const supabase = await createSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC types not yet generated for new migration
  const { data, error } = await (supabase.rpc as any)('transition_project_status', {
    p_project_id: projectId,
    p_to_status: toStatus,
    p_comment: comment,
  });
  if (error) throw error;
  return data;
}

function revalidateProjectPaths(id: string) {
  // Revalidate for all locales via the dynamic [locale] segment
  revalidatePath('/[locale]/app/admin/projects', 'page');
  revalidatePath(`/[locale]/app/projects/${id}`, 'page');
}

export async function startProjectAction(id: string) {
  const result = await callTransition(id, 'in_progress', null);
  revalidateProjectPaths(id);
  return result;
}

export async function deliverProjectAction(id: string) {
  const result = await callTransition(id, 'delivered', null);
  revalidateProjectPaths(id);
  return result;
}

export async function approveProjectAction(id: string, comment: string | null) {
  const result = await callTransition(id, 'approved', comment);
  revalidateProjectPaths(id);
  return result;
}

export async function requestRevisionAction(id: string, comment: string) {
  const result = await callTransition(id, 'in_revision', comment);
  revalidateProjectPaths(id);
  return result;
}

export async function cancelProjectAction(id: string, comment: string | null) {
  const result = await callTransition(id, 'cancelled', comment);
  revalidateProjectPaths(id);
  return result;
}

export async function archiveProjectAction(id: string) {
  const result = await callTransition(id, 'archived', null);
  revalidateProjectPaths(id);
  return result;
}

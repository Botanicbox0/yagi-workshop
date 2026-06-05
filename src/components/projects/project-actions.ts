'use server';

import { createSupabaseServer } from '@/lib/supabase/server';
import { getStudioContext } from '@/lib/workspace/studio-context.server';
import { revalidatePath } from 'next/cache';

async function callTransition(
  projectId: string,
  toStatus: string,
  comment: string | null,
  options?: { requireStudioContext?: boolean }
) {
  const supabase = options?.requireStudioContext
    ? await requireStudioSupabase()
    : await createSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC types not yet generated for new migration
  const { data, error } = await (supabase.rpc as any)('transition_project_status', {
    p_project_id: projectId,
    p_to_status: toStatus,
    p_comment: comment,
  });
  if (error) throw error;
  return data;
}

async function requireStudioSupabase() {
  const auth = await getStudioContext();
  if (!auth.ok) {
    throw new Error(auth.error);
  }
  return auth.supabase;
}

function revalidateProjectPaths(id: string) {
  // Revalidate for all locales via the dynamic [locale] segment
  revalidatePath('/[locale]/app/admin/projects', 'page');
  revalidatePath(`/[locale]/app/projects/${id}`, 'page');
}

export async function startProjectAction(id: string) {
  const result = await callTransition(id, 'in_progress', null, {
    requireStudioContext: true,
  });
  revalidateProjectPaths(id);
  return result;
}

export async function acceptProjectAction(id: string) {
  const result = await callTransition(id, 'in_review', null, {
    requireStudioContext: true,
  });
  revalidateProjectPaths(id);
  return result;
}

export async function deliverProjectAction(id: string) {
  const result = await callTransition(id, 'delivered', null, {
    requireStudioContext: true,
  });
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
  const result = await callTransition(id, 'archived', null, {
    requireStudioContext: true,
  });
  revalidateProjectPaths(id);
  return result;
}

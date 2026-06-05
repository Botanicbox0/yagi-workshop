"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStudioContext } from "@/lib/workspace/studio-context.server";

const projectIdSchema = z.string().uuid();

type ShareResult =
  | { ok: true; url: string; token: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "not_found"
        | "no_released_deliverables"
        | "db";
      message?: string;
    };

type SimpleResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "forbidden" | "not_found" | "db";
      message?: string;
    };

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003";
}

function buildShareUrl(token: string) {
  return `${siteUrl()}/s/d/${token}`;
}

function generateToken() {
  return randomBytes(32).toString("base64url");
}

function revalidateProject(projectId: string) {
  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
  revalidatePath(`/[locale]/app/admin/projects/${projectId}`, "page");
}

export async function shareProjectDeliverables(projectId: string): Promise<ShareResult> {
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) return { ok: false, error: "validation" };

  const auth = await getStudioContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag deliverable share columns
  const sb = auth.supabase as any;

  const { data: project, error: projectError } = await sb
    .from("projects")
    .select("id, status, deliverable_share_token, deliverable_share_enabled")
    .eq("id", parsed.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (projectError) {
    console.error("[shareProjectDeliverables] project fetch failed:", projectError);
    return { ok: false, error: "db", message: projectError.message };
  }
  if (!project || project.status === "cancelled" || project.status === "archived") {
    return { ok: false, error: "not_found" };
  }

  const { count, error: countError } = await sb
    .from("project_deliverables")
    .select("id", { count: "exact", head: true })
    .eq("project_id", parsed.data)
    .not("released_at", "is", null);

  if (countError) {
    console.error("[shareProjectDeliverables] released count failed:", countError);
    return { ok: false, error: "db", message: countError.message };
  }
  if (!count || count < 1) return { ok: false, error: "no_released_deliverables" };

  if (project.deliverable_share_enabled === true && project.deliverable_share_token) {
    return {
      ok: true,
      token: project.deliverable_share_token as string,
      url: buildShareUrl(project.deliverable_share_token as string),
    };
  }

  const token = generateToken();
  const { data: updated, error: updateError } = await sb
    .from("projects")
    .update({
      deliverable_share_enabled: true,
      deliverable_share_token: token,
    })
    .eq("id", parsed.data)
    .select("id");

  if (updateError) {
    console.error("[shareProjectDeliverables] update failed:", updateError);
    return { ok: false, error: "db", message: updateError.message };
  }
  if (!updated || updated.length === 0) return { ok: false, error: "not_found" };

  revalidateProject(parsed.data);
  return { ok: true, token, url: buildShareUrl(token) };
}
export async function unshareProjectDeliverables(projectId: string): Promise<SimpleResult> {
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) return { ok: false, error: "validation" };

  const auth = await getStudioContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag deliverable share columns
  const sb = auth.supabase as any;

  const { error } = await sb
    .from("projects")
    .update({ deliverable_share_enabled: false })
    .eq("id", parsed.data);

  if (error) {
    console.error("[unshareProjectDeliverables] update failed:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidateProject(parsed.data);
  return { ok: true };
}

export async function rotateProjectDeliverablesShare(projectId: string): Promise<ShareResult> {
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) return { ok: false, error: "validation" };

  const auth = await getStudioContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag deliverable share columns
  const sb = auth.supabase as any;

  const { count, error: countError } = await sb
    .from("project_deliverables")
    .select("id", { count: "exact", head: true })
    .eq("project_id", parsed.data)
    .not("released_at", "is", null);
  if (countError) return { ok: false, error: "db", message: countError.message };
  if (!count || count < 1) return { ok: false, error: "no_released_deliverables" };

  const token = generateToken();
  const { data: updated, error } = await sb
    .from("projects")
    .update({
      deliverable_share_enabled: true,
      deliverable_share_token: token,
    })
    .eq("id", parsed.data)
    .is("deleted_at", null)
    .not("status", "in", '("cancelled","archived")')
    .select("id");

  if (error) {
    console.error("[rotateProjectDeliverablesShare] update failed:", error);
    return { ok: false, error: "db", message: error.message };
  }
  if (!updated || updated.length === 0) return { ok: false, error: "not_found" };

  revalidateProject(parsed.data);
  return { ok: true, token, url: buildShareUrl(token) };
}

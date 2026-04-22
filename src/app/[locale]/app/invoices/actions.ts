"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const createInvoiceSchema = z.object({
  projectId: z.string().uuid(),
  supplyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  memo: z.string().max(1000).optional().nullable(),
});

export async function createInvoice(
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  // yagi_admin gate
  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isYagiAdmin) return { ok: false, error: "forbidden" };

  // Load project + its workspace_id
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: "project_not_found" };

  // Load supplier (single-row, must exist; seeded in migration)
  const { data: supplier } = await supabase
    .from("supplier_profile")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!supplier) return { ok: false, error: "no_supplier_profile" };

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      project_id: project.id,
      workspace_id: project.workspace_id,
      supplier_id: supplier.id,
      supply_date: parsed.data.supplyDate,
      due_date: parsed.data.dueDate ?? null,
      memo: parsed.data.memo ?? null,
      status: "draft",
      is_mock: false, // becomes true at issue time if POPBILL_MODE=mock
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[invoices] createInvoice insert", error.message);
    return { ok: false, error: "insert_failed" };
  }

  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/invoices`);
  }
  return { ok: true, id: data.id };
}

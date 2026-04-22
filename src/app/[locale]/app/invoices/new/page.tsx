import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewInvoicePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "invoices" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // yagi_admin only
  const { data: yagiAdminRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");
  if (!yagiAdminRows || yagiAdminRows.length === 0) notFound();

  // Projects accessible via RLS + their workspace info
  const { data: projectsData } = await supabase
    .from("projects")
    .select(
      "id, title, workspace_id, workspace:workspaces(id, name, business_registration_number)"
    )
    .order("created_at", { ascending: false });

  const projects = (projectsData ?? []).map((p) => {
    const ws = p.workspace as
      | { id: string; name: string; business_registration_number: string | null }
      | { id: string; name: string; business_registration_number: string | null }[]
      | null
      | undefined;
    const workspace = Array.isArray(ws) ? (ws[0] ?? null) : (ws ?? null);
    return {
      id: p.id,
      title: p.title,
      workspace_id: p.workspace_id,
      workspace,
    };
  });

  return (
    <div className="min-h-dvh bg-background">
      <div className="px-6 pt-10 pb-0 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl tracking-tight mb-1">
          <em>{t("new_title")}</em>
        </h1>
      </div>
      <NewInvoiceForm projects={projects} />
    </div>
  );
}

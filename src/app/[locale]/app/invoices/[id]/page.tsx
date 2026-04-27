import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/routing";
import { ChevronLeft, Printer } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getPopbillMode } from "@/lib/popbill/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  InvoiceEditor,
  type BuyerInfo,
  type SupplierInfo,
} from "@/components/invoices/invoice-editor";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getStatusBadgeVariant(
  status: string
): "secondary" | "default" | "outline" | "destructive" {
  switch (status) {
    case "draft":
      return "secondary";
    case "issued":
      return "default";
    case "paid":
      return "outline";
    case "void":
      return "destructive";
    default:
      return "secondary";
  }
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { locale, id } = await params;

  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "invoices" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const uid = user.id;

  // yagi_admin detection (matches list page pattern)
  const { data: yagiAdminRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");
  const isYagiAdmin = !!(yagiAdminRows && yagiAdminRows.length > 0);

  // Load invoice with nested project + workspace.
  const { data: invoiceRow } = await supabase
    .from("invoices")
    .select(
      `
      *,
      project:projects!inner(
        id,
        title,
        workspace_id,
        workspace:workspaces!inner(
          id,
          name,
          business_registration_number,
          representative_name,
          business_address,
          tax_invoice_email
        )
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!invoiceRow) {
    notFound();
  }

  // Unwrap project/workspace arrays (postgrest may return array or object).
  const projectRaw = invoiceRow.project as
    | {
        id: string;
        title: string;
        workspace_id: string;
        workspace:
          | {
              id: string;
              name: string;
              business_registration_number: string | null;
              representative_name: string | null;
              business_address: string | null;
              tax_invoice_email: string | null;
            }
          | {
              id: string;
              name: string;
              business_registration_number: string | null;
              representative_name: string | null;
              business_address: string | null;
              tax_invoice_email: string | null;
            }[]
          | null;
      }
    | {
        id: string;
        title: string;
        workspace_id: string;
        workspace:
          | {
              id: string;
              name: string;
              business_registration_number: string | null;
              representative_name: string | null;
              business_address: string | null;
              tax_invoice_email: string | null;
            }
          | {
              id: string;
              name: string;
              business_registration_number: string | null;
              representative_name: string | null;
              business_address: string | null;
              tax_invoice_email: string | null;
            }[]
          | null;
      }[]
    | null;
  const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw;
  if (!project) {
    notFound();
  }
  const workspaceRaw = project.workspace;
  const workspace = Array.isArray(workspaceRaw) ? workspaceRaw[0] : workspaceRaw;
  if (!workspace) {
    notFound();
  }

  // Load supplier (single-row, seeded in migration).
  const { data: supplierRow } = await supabase
    .from("supplier_profile")
    .select("*")
    .limit(1)
    .maybeSingle();

  // Load line items ordered by display_order.
  const { data: lineItemsData } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", id)
    .order("display_order");

  const lineItems = (lineItemsData ?? []).map((li) => ({
    id: li.id,
    item_name: li.item_name,
    specification: li.specification,
    quantity: Number(li.quantity),
    unit_price_krw: Number(li.unit_price_krw),
    supply_krw: Number(li.supply_krw),
    vat_krw: Number(li.vat_krw),
    display_order: li.display_order,
    source_type: li.source_type,
    source_id: li.source_id,
  }));

  const popbillMode = getPopbillMode();

  const supplier: SupplierInfo | null = supplierRow
    ? {
        corporate_name: supplierRow.corporate_name,
        business_registration_number: supplierRow.business_registration_number,
        representative_name: supplierRow.representative_name,
        address: supplierRow.address,
        contact_email: supplierRow.contact_email,
        business_type: supplierRow.business_type,
        business_item: supplierRow.business_item,
      }
    : null;

  const buyer: BuyerInfo = {
    id: workspace.id,
    name: workspace.name,
    business_registration_number: workspace.business_registration_number,
    representative_name: workspace.representative_name,
    business_address: workspace.business_address,
    tax_invoice_email: workspace.tax_invoice_email,
  };

  const invoiceForEditor = {
    id: invoiceRow.id,
    project_id: invoiceRow.project_id,
    workspace_id: invoiceRow.workspace_id,
    status: invoiceRow.status,
    invoice_number: invoiceRow.invoice_number,
    supply_date: invoiceRow.supply_date,
    due_date: invoiceRow.due_date,
    issue_date: invoiceRow.issue_date,
    paid_at: invoiceRow.paid_at,
    void_at: invoiceRow.void_at,
    void_reason: invoiceRow.void_reason,
    subtotal_krw: invoiceRow.subtotal_krw,
    vat_krw: invoiceRow.vat_krw,
    total_krw: invoiceRow.total_krw,
    is_mock: invoiceRow.is_mock,
    filed_at: invoiceRow.filed_at,
    nts_approval_number: invoiceRow.nts_approval_number,
    memo: invoiceRow.memo,
  };

  const status = invoiceRow.status;
  const showPrint = status === "issued" || status === "paid" || status === "void";

  return (
    <div className="px-10 py-8 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {t("back_to_list")}
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="font-display text-3xl tracking-tight">
              
                {invoiceRow.invoice_number ?? t("status_draft")}
              
            </h1>
            <p className="text-sm text-muted-foreground keep-all">
              {project.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={getStatusBadgeVariant(status)}
              className={cn("rounded-full text-[11px] px-2.5 py-0.5")}
            >
              {t(
                `status_${status}` as
                  | "status_draft"
                  | "status_issued"
                  | "status_paid"
                  | "status_void"
              )}
            </Badge>
            {invoiceRow.is_mock && (
              <Badge
                variant="outline"
                className="rounded-full text-[10px] px-2 py-0.5 border-red-300 text-red-800 bg-red-50"
              >
                {t("mock_badge")}
              </Badge>
            )}
            {showPrint && (
              <a
                href={`/${locale}/app/invoices/${id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full uppercase tracking-[0.12em] px-4 py-1.5 border border-input bg-background text-foreground hover:bg-accent text-xs font-medium transition-colors"
              >
                <Printer className="w-3 h-3" />
                {t("print_pdf")}
              </a>
            )}
          </div>
        </div>
      </div>

      <InvoiceEditor
        invoice={invoiceForEditor}
        lineItems={lineItems}
        supplier={supplier}
        buyer={buyer}
        projectTitle={project.title}
        isYagiAdmin={isYagiAdmin}
        locale={locale}
        popbillMode={popbillMode}
      />
    </div>
  );
}

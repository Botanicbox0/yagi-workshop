"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkspace } from "./actions";

const workspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  tax_id: z.string().trim().optional(),
  tax_invoice_email: z.string().email().optional().or(z.literal("")),
});

type WorkspaceFormData = z.infer<typeof workspaceSchema>;

interface WorkspaceFormProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    tax_id: string | null;
    tax_invoice_email: string | null;
  };
}

export function WorkspaceForm({ workspace }: WorkspaceFormProps) {
  const t = useTranslations("settings");
  const tDashboard = useTranslations("dashboard");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: workspace.name,
      tax_id: workspace.tax_id ?? "",
      tax_invoice_email: workspace.tax_invoice_email ?? "",
    },
  });

  const onSubmit = async (data: WorkspaceFormData) => {
    const res = await updateWorkspace({
      workspaceId: workspace.id,
      name: data.name,
      tax_id: data.tax_id || null,
      tax_invoice_email: data.tax_invoice_email || null,
    });
    if ("error" in res) {
      toast.error(t("workspace_tab"));
      return;
    }
    toast.success(t("workspace_tab"));
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* Workspace logo — bucket absent; deferred to Phase 1.3 */}
      <div className="rounded-lg border border-border p-4 opacity-50">
        <p className="text-sm text-muted-foreground">{t("workspace_logo_upload")} — {tDashboard("coming_soon")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="ws_name">{t("workspace_tab")}</Label>
          <Input id="ws_name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tax_id">{t("tax_id_label")}</Label>
          <Input id="tax_id" placeholder={t("tax_id_ph")} {...register("tax_id")} />
          {errors.tax_id && (
            <p className="text-xs text-destructive">{errors.tax_id.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tax_invoice_email">{t("tax_invoice_email_label")}</Label>
          <Input
            id="tax_invoice_email"
            type="email"
            {...register("tax_invoice_email")}
          />
          {errors.tax_invoice_email && (
            <p className="text-xs text-destructive">{errors.tax_invoice_email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full uppercase tracking-[0.12em] text-sm"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
          ) : null}
          {t("profile_save")}
        </Button>
      </form>
    </div>
  );
}

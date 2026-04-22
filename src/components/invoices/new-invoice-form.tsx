"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createInvoice } from "@/app/[locale]/app/invoices/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  projectId: z.string().uuid(),
  supplyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  memo: z.string().max(1000).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

type ProjectOption = {
  id: string;
  title: string;
  workspace_id: string;
  workspace: {
    id: string;
    name: string;
    business_registration_number: string | null;
  } | null;
};

interface NewInvoiceFormProps {
  projects: ProjectOption[];
}

function todayInSeoul(): string {
  // en-CA formats as YYYY-MM-DD
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export function NewInvoiceForm({ projects }: NewInvoiceFormProps) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultProjectId = projects[0]?.id ?? "";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: defaultProjectId,
      supplyDate: todayInSeoul(),
      dueDate: "",
      memo: "",
    },
  });

  const selectedProjectId = watch("projectId");
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const result = await createInvoice({
        projectId: data.projectId,
        supplyDate: data.supplyDate,
        dueDate: data.dueDate && data.dueDate.length > 0 ? data.dueDate : null,
        memo: data.memo && data.memo.length > 0 ? data.memo : null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("new_title"));
      router.push(
        `/app/invoices/${result.id}` as `/app/invoices/${string}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="px-6 pb-16 max-w-2xl mx-auto space-y-6"
    >
      {/* Project */}
      <div className="space-y-1.5">
        <Label htmlFor="projectId" className="keep-all">
          {t("project_label")}
        </Label>
        <select
          id="projectId"
          {...register("projectId")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
              {p.workspace?.name ? ` · ${p.workspace.name}` : ""}
            </option>
          ))}
        </select>
        {errors.projectId && (
          <p className="text-xs text-destructive">{errors.projectId.message}</p>
        )}

        {/* Buyer preview */}
        {selectedProject?.workspace && (
          <div className="mt-2 text-xs text-muted-foreground keep-all">
            <span className="font-medium">{t("buyer_label")}:</span>{" "}
            {selectedProject.workspace.name}
            {selectedProject.workspace.business_registration_number ? (
              <span className="tabular-nums">
                {" · "}
                {selectedProject.workspace.business_registration_number}
              </span>
            ) : (
              <span className="ml-1 text-amber-700">
                · {t("buyer_registration_missing")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Supply date */}
      <div className="space-y-1.5">
        <Label htmlFor="supplyDate" className="keep-all">
          {t("supply_date_label")}
        </Label>
        <Input
          id="supplyDate"
          type="date"
          {...register("supplyDate")}
          className={errors.supplyDate ? "border-destructive" : ""}
        />
        {errors.supplyDate && (
          <p className="text-xs text-destructive">
            {errors.supplyDate.message}
          </p>
        )}
      </div>

      {/* Due date (optional) */}
      <div className="space-y-1.5">
        <Label htmlFor="dueDate" className="keep-all">
          {t("due_date_label")}
        </Label>
        <Input
          id="dueDate"
          type="date"
          {...register("dueDate")}
          className={errors.dueDate ? "border-destructive" : ""}
        />
        {errors.dueDate && (
          <p className="text-xs text-destructive">{errors.dueDate.message}</p>
        )}
      </div>

      {/* Memo */}
      <div className="space-y-1.5">
        <Label htmlFor="memo" className="keep-all">
          {t("memo_label")}
        </Label>
        <Textarea
          id="memo"
          rows={3}
          placeholder={t("memo_ph")}
          {...register("memo")}
          className={errors.memo ? "border-destructive" : ""}
        />
        {errors.memo && (
          <p className="text-xs text-destructive">{errors.memo.message}</p>
        )}
      </div>

      {/* Submit */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full uppercase tracking-[0.12em] px-6 py-2.5 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {t("create_invoice_submit")}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createBoard } from "@/app/[locale]/app/preprod/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface NewBoardFormProps {
  projects: { id: string; title: string; workspace?: { name: string } | null }[];
}

export function NewBoardForm({ projects }: NewBoardFormProps) {
  const t = useTranslations("preprod");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: projects[0]?.id ?? "",
      title: "",
      description: "",
    },
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const result = await createBoard({
        projectId: data.projectId,
        title: data.title,
        description: data.description || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("board_new_title"));
      router.push(`/app/preprod/${result.id}` as `/app/preprod/${string}`);
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
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="keep-all">
          {t("title_label")}
        </Label>
        <Input
          id="title"
          placeholder={t("title_ph")}
          {...register("title")}
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="keep-all">
          {t("description_label")}
        </Label>
        <Textarea
          id="description"
          placeholder={t("description_ph")}
          rows={4}
          {...register("description")}
          className={errors.description ? "border-destructive" : ""}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
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
          {t("create_board_submit")}
        </Button>
      </div>
    </form>
  );
}

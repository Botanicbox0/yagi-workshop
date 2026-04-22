"use client";

// Phase 1.8 subtask 05 — preferences form (client island).

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateNotificationPreferences } from "./actions";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  email_immediate_enabled: z.boolean(),
  email_digest_enabled: z.boolean(),
  digest_time_local: z.string().regex(timeRegex),
  quiet_hours_start: z.string().regex(timeRegex),
  quiet_hours_end: z.string().regex(timeRegex),
  timezone: z.string().trim().min(1).max(64),
});

type FormData = z.infer<typeof schema>;

const TIMEZONES = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

type Props = {
  defaultValues: FormData;
};

export function PrefsForm({ defaultValues }: Props) {
  const t = useTranslations("notifications");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const emailImmediate = watch("email_immediate_enabled");
  const emailDigest = watch("email_digest_enabled");

  const onSubmit = async (data: FormData) => {
    const res = await updateNotificationPreferences(data);
    if ("error" in res) {
      toast.error(t("prefs_save_error"));
      return;
    }
    toast.success(t("prefs_save_success"));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      {/* Email section */}
      <section className="space-y-5">
        <h2 className="text-sm font-medium keep-all">
          {t("prefs_email_section_title")}
        </h2>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label
              htmlFor="email_immediate_enabled"
              className="cursor-pointer"
            >
              {t("prefs_email_immediate_label")}
            </Label>
            <p className="text-xs text-muted-foreground keep-all">
              {t("prefs_email_immediate_help")}
            </p>
          </div>
          <Switch
            id="email_immediate_enabled"
            checked={emailImmediate}
            onCheckedChange={(v) =>
              setValue("email_immediate_enabled", v, { shouldDirty: true })
            }
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="email_digest_enabled" className="cursor-pointer">
              {t("prefs_email_digest_label")}
            </Label>
            <p className="text-xs text-muted-foreground keep-all">
              {t("prefs_email_digest_help")}
            </p>
          </div>
          <Switch
            id="email_digest_enabled"
            checked={emailDigest}
            onCheckedChange={(v) =>
              setValue("email_digest_enabled", v, { shouldDirty: true })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="digest_time_local">
            {t("prefs_digest_time_label")}
          </Label>
          <Input
            id="digest_time_local"
            type="time"
            className="max-w-[160px]"
            {...register("digest_time_local")}
          />
          {errors.digest_time_local && (
            <p className="text-xs text-destructive">
              {errors.digest_time_local.message}
            </p>
          )}
        </div>
      </section>

      {/* Quiet hours */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium keep-all">
          {t("prefs_quiet_hours_section_title")}
        </h2>
        <p className="text-xs text-muted-foreground keep-all">
          {t("prefs_quiet_hours_help")}
        </p>

        <div className="flex items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="quiet_hours_start">
              {t("prefs_quiet_start_label")}
            </Label>
            <Input
              id="quiet_hours_start"
              type="time"
              className="max-w-[160px]"
              {...register("quiet_hours_start")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiet_hours_end">{t("prefs_quiet_end_label")}</Label>
            <Input
              id="quiet_hours_end"
              type="time"
              className="max-w-[160px]"
              {...register("quiet_hours_end")}
            />
          </div>
        </div>
      </section>

      {/* Timezone */}
      <section className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="timezone">{t("prefs_timezone_label")}</Label>
          <select
            id="timezone"
            {...register("timezone")}
            className="flex h-9 w-full max-w-[260px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </section>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full uppercase tracking-[0.12em] text-sm"
      >
        {isSubmitting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
        ) : null}
        {t("prefs_save_button")}
      </Button>
    </form>
  );
}

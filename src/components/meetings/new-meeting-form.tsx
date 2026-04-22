"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Loader2, X, Plus } from "lucide-react";
import { createMeeting } from "@/app/[locale]/app/meetings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { MeetingProject, WorkspaceMember } from "@/app/[locale]/app/meetings/new/page";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const attendeeSchema = z.object({
  email: z.string().email(),
  displayName: z.string().max(100).optional().or(z.literal("")),
});

const schema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  date: z.string().min(1),
  time: z.string().min(1),
  durationMinutes: z.enum(["30", "45", "60", "90"]),
  attendees: z
    .array(attendeeSchema)
    .min(1, "at_least_one")
    .max(10, "too_many"),
});

type FormData = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NewMeetingFormProps {
  locale: string;
  projects: MeetingProject[];
  membersByWorkspace: Record<string, WorkspaceMember[]>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewMeetingForm({
  locale,
  projects,
  membersByWorkspace,
}: NewMeetingFormProps) {
  const t = useTranslations("meetings");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkedMemberEmails, setCheckedMemberEmails] = useState<Set<string>>(
    new Set()
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: projects[0]?.id ?? "",
      title: "",
      description: "",
      date: "",
      time: "",
      durationMinutes: "60",
      attendees: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "attendees",
  });

  const selectedProjectId = watch("projectId");

  // Derive workspace for selected project
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const workspaceMembers = selectedProject
    ? (membersByWorkspace[selectedProject.workspace_id] ?? [])
    : [];

  // When project changes, reset checked members and attendees derived from members
  useEffect(() => {
    setCheckedMemberEmails(new Set());
    // Remove any previously checked-member attendees — keep only custom ones
    // For simplicity: replace all attendees with empty when project changes
    replace([]);
  }, [selectedProjectId, replace]);

  // Sync checked workspace members into attendees field array
  function handleMemberToggle(member: WorkspaceMember, checked: boolean) {
    const newChecked = new Set(checkedMemberEmails);
    if (checked) {
      newChecked.add(member.email);
      // Add to field array if not already present
      const existingIndex = fields.findIndex((f) => f.email === member.email);
      if (existingIndex === -1) {
        append({ email: member.email, displayName: member.displayName });
      }
    } else {
      newChecked.delete(member.email);
      // Remove from field array
      const index = fields.findIndex((f) => f.email === member.email);
      if (index !== -1) {
        remove(index);
      }
    }
    setCheckedMemberEmails(newChecked);
  }

  function addCustomAttendee() {
    append({ email: "", displayName: "" });
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      // Combine date + time into ISO with Asia/Seoul offset (+09:00)
      const scheduledAt = new Date(
        `${data.date}T${data.time}:00+09:00`
      ).toISOString();

      const attendeeEmails = data.attendees.map(
        (a: { email: string; displayName?: string }) => a.email
      );
      const attendeeDisplayNames = data.attendees.map(
        (a: { email: string; displayName?: string }) => a.displayName || null
      );

      const result = await createMeeting({
        projectId: data.projectId,
        title: data.title,
        description: data.description || undefined,
        scheduledAt,
        durationMinutes: Number(data.durationMinutes) as 30 | 45 | 60 | 90,
        attendeeEmails,
        attendeeDisplayNames,
      });

      if (!result.ok) {
        if (result.error === "unauthorized") {
          toast.error(tErrors("unauthorized"));
        } else if (result.error === "forbidden") {
          toast.error(tErrors("unauthorized"));
        } else if (result.error === "validation") {
          toast.error(tErrors("validation"));
        } else {
          toast.error(tErrors("generic"));
        }
        return;
      }

      // Success — show appropriate toast based on sync status
      if (result.syncStatus === "synced") {
        toast.success(t("sync_synced"));
      } else if (result.syncStatus === "fallback_ics") {
        toast.warning(t("sync_fallback_ics"), {
          description: t("calendar_native_note"),
        });
      } else {
        toast.error(t("sync_failed"), {
          description: t("sync_retry"),
        });
      }

      router.push(
        `/${locale}/app/meetings/${result.meetingId}` as `/${string}/app/meetings/${string}`
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <form onSubmit={onSubmit} className="px-6 pb-16 max-w-2xl mx-auto space-y-8">
      {/* Project */}
      <div className="space-y-1.5">
        <Label htmlFor="projectId">
          Project <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="projectId"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger id="projectId">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.projectId && (
          <p className="text-xs text-destructive">{tErrors("validation")}</p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          {t("title_label")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder={t("title_ph")}
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{tErrors("validation")}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">{t("description_label")}</Label>
        <Textarea
          id="description"
          placeholder={t("description_ph")}
          rows={3}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{tErrors("validation")}</p>
        )}
      </div>

      {/* Date + Time */}
      <div className="space-y-1.5">
        <Label>
          {t("scheduled_at_label")} <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-3">
          <Input
            id="date"
            type="date"
            className="flex-1"
            {...register("date")}
          />
          <Input
            id="time"
            type="time"
            className="w-36"
            {...register("time")}
          />
        </div>
        {(errors.date || errors.time) && (
          <p className="text-xs text-destructive">{tErrors("validation")}</p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label>
          {t("duration_label")} <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="durationMinutes"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="flex flex-wrap gap-4"
            >
              {(["30", "45", "60", "90"] as const).map((val) => (
                <div key={val} className="flex items-center gap-2">
                  <RadioGroupItem value={val} id={`duration-${val}`} />
                  <Label
                    htmlFor={`duration-${val}`}
                    className="cursor-pointer font-normal"
                  >
                    {t(`duration_${val}` as "duration_30" | "duration_45" | "duration_60" | "duration_90")}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
        {errors.durationMinutes && (
          <p className="text-xs text-destructive">{tErrors("validation")}</p>
        )}
      </div>

      {/* Attendees */}
      <div className="space-y-3">
        <Label>
          {t("attendees_label")} <span className="text-destructive">*</span>
        </Label>

        {/* Workspace member checkboxes */}
        {workspaceMembers.length > 0 && (
          <div className="border border-border rounded-lg p-3 space-y-2">
            {workspaceMembers
              .filter((m) => m.email)
              .map((member) => {
                const isChecked = checkedMemberEmails.has(member.email);
                return (
                  <label
                    key={member.userId || member.email}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleMemberToggle(member, !!checked)
                      }
                    />
                    <span className="text-sm">
                      {member.displayName}
                      {member.email && (
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          {member.email}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
          </div>
        )}

        {/* Field array — custom / checked attendees editable rows */}
        {fields.length > 0 && (
          <div className="space-y-2">
            {fields.map((field, index) => {
              const isFromMember = checkedMemberEmails.has(field.email);
              return (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Input
                      placeholder={t("attendees_ph")}
                      {...register(`attendees.${index}.email`)}
                      readOnly={isFromMember}
                      className={isFromMember ? "bg-muted" : ""}
                    />
                    {errors.attendees?.[index]?.email && (
                      <p className="text-xs text-destructive">
                        {tErrors("validation")}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 h-9 w-9 shrink-0"
                    onClick={() => {
                      // If this is a member attendee, also uncheck them
                      if (isFromMember) {
                        const newChecked = new Set(checkedMemberEmails);
                        newChecked.delete(field.email);
                        setCheckedMemberEmails(newChecked);
                      }
                      remove(index);
                    }}
                    aria-label={t("attendees_remove")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add custom attendee */}
        {fields.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={addCustomAttendee}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t("attendees_add")}
          </Button>
        )}

        {errors.attendees && !Array.isArray(errors.attendees) && (
          <p className="text-xs text-destructive">{tErrors("validation")}</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          className="rounded-full uppercase tracking-[0.12em] text-xs"
          onClick={() => router.back()}
        >
          {tCommon("back")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full uppercase tracking-[0.12em]"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("new")}
        </Button>
      </div>
    </form>
  );
}

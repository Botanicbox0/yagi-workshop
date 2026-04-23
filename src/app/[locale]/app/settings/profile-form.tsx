"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { updateProfile, updateAvatarUrl } from "./actions";
import {
  validateHandle,
  HANDLE_MIN_LENGTH,
  HANDLE_MAX_LENGTH,
} from "@/lib/handles/validate";
import { canChangeHandle } from "@/lib/handles/change";

const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(HANDLE_MIN_LENGTH)
    .max(HANDLE_MAX_LENGTH)
    .superRefine((val, ctx) => {
      const err = validateHandle(val);
      if (err) ctx.addIssue({ code: "custom", message: err });
    }),
  locale: z.enum(["ko", "en"]),
  bio: z
    .string()
    .trim()
    .max(200, "200자 이내로 입력해주세요.")
    .optional()
    .or(z.literal("")),
  instagram_handle: z
    .string()
    .trim()
    .max(50)
    .regex(/^[a-zA-Z0-9._]*$/, "영문/숫자/./_ 만 사용 가능")
    .optional()
    .or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    locale: "ko" | "en";
  };
  avatarSignedUrl: string | null;
  userId: string;
  bio: string | null;
  instagramHandle: string | null;
  handleChangedAt: string | null;
}

export function ProfileForm({ profile, avatarSignedUrl, userId, bio, instagramHandle, handleChangedAt }: ProfileFormProps) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const router = useRouter();

  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarSignedUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name,
      handle: profile.handle,
      locale: profile.locale,
      bio: bio ?? "",
      instagram_handle: instagramHandle ?? "",
    },
  });

  const handleLock = canChangeHandle(
    handleChangedAt ? new Date(handleChangedAt) : null,
  );
  const handleLocked = !handleLock.allowed;
  const handleUnlockAtLabel = handleLock.unlockAt
    ? new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(handleLock.unlockAt)
    : null;
  const bioValue = watch("bio") ?? "";

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("avatar_upload"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("avatar_upload"));
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createSupabaseBrowser();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file);

      if (uploadError) {
        toast.error(t("avatar_upload"));
        return;
      }

      const res = await updateAvatarUrl({ avatar_url: path });
      if ("error" in res) {
        toast.error(t("avatar_upload"));
        return;
      }

      // Optimistically show local blob URL
      const blobUrl = URL.createObjectURL(file);
      setAvatarPreview(blobUrl);
      router.refresh();
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    const res = await updateProfile(data);
    if ("error" in res) {
      toast.error(t("profile_save"));
      return;
    }
    toast.success(t("profile_save"));
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploadingAvatar}
          className="relative w-16 h-16 rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label={t("avatar_upload")}
        >
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt={profile.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="w-5 h-5 text-muted-foreground" />
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </button>
        <div>
          <p className="text-sm font-medium">{t("avatar_upload")}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Profile form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="display_name">{tOnboarding("display_name")}</Label>
          <Input id="display_name" {...register("display_name")} />
          {errors.display_name && (
            <p className="text-xs text-destructive">{errors.display_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="handle">{tOnboarding("handle")}</Label>
          <Input
            id="handle"
            {...register("handle")}
            disabled={handleLocked}
            aria-describedby={handleLocked ? "handle-lock-note" : undefined}
          />
          {handleLocked && handleUnlockAtLabel && (
            <p
              id="handle-lock-note"
              className="text-xs text-muted-foreground"
              title="핸들은 90일에 한 번 변경할 수 있어요."
            >
              핸들은 90일에 한 번 변경할 수 있어요. 다음 변경 가능: {handleUnlockAtLabel}
            </p>
          )}
          {errors.handle && (
            <p className="text-xs text-destructive">{errors.handle.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">소개 (최대 200자)</Label>
          <Textarea
            id="bio"
            rows={3}
            maxLength={200}
            placeholder="자기소개를 적어보세요"
            {...register("bio")}
          />
          <p className="text-xs text-muted-foreground text-right tabular-nums">
            {bioValue.length}/200자
          </p>
          {errors.bio && (
            <p className="text-xs text-destructive">{errors.bio.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="instagram_handle">인스타그램 핸들 (선택)</Label>
          <Input
            id="instagram_handle"
            placeholder="yagiworkshop"
            {...register("instagram_handle")}
          />
          {errors.instagram_handle && (
            <p className="text-xs text-destructive">{errors.instagram_handle.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="locale">{tCommon("ko")} / {tCommon("en")}</Label>
          <select
            id="locale"
            {...register("locale")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ko">{tCommon("ko")}</option>
            <option value="en">{tCommon("en")}</option>
          </select>
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

"use client";

import { useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export type AvatarUploadProps = {
  currentAvatarUrl: string | null;
  userId: string;
  onUpload: (newUrl: string) => void;
};

const TARGET_SIZE = 512;

function centerAspectCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
    width,
    height
  );
}

async function exportCroppedBlob(
  imgEl: HTMLImageElement,
  crop: Crop
): Promise<Blob | null> {
  const scaleX = imgEl.naturalWidth / imgEl.width;
  const scaleY = imgEl.naturalHeight / imgEl.height;

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cropX = ((crop.x ?? 0) / 100) * imgEl.width * scaleX;
  const cropY = ((crop.y ?? 0) / 100) * imgEl.height * scaleY;
  const cropWidth = (crop.width / 100) * imgEl.width * scaleX;
  const cropHeight = (crop.height / 100) * imgEl.height * scaleY;

  ctx.drawImage(imgEl, cropX, cropY, cropWidth, cropHeight, 0, 0, TARGET_SIZE, TARGET_SIZE);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size <= 2_000_000) {
          resolve(blob);
          return;
        }
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.7);
      },
      "image/jpeg",
      0.85
    );
  });
}

export function AvatarUpload({ currentAvatarUrl, userId, onUpload }: AvatarUploadProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({ unit: "%", x: 5, y: 5, width: 90, height: 90 });
  const [isUploading, setIsUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
    });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }

  async function handleSave() {
    if (!imgRef.current || !imageSrc) return;
    setIsUploading(true);
    setErr(null);

    try {
      const blob = await exportCroppedBlob(imgRef.current, crop);
      if (!blob) {
        const msg = "이미지 자르기에 실패했어요.";
        setErr(msg);
        toast.error(msg);
        return;
      }

      const supabase = createSupabaseBrowser();
      const path = `${userId}/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadError) {
        const msg = "업로드에 실패했어요.";
        setErr(msg);
        toast.error(msg);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      onUpload(data.publicUrl);
      setImageSrc(null);
    } catch {
      const msg = "업로드 중 오류가 발생했어요.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  }

  function handleCancel() {
    setImageSrc(null);
    setErr(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {currentAvatarUrl ? (
        <img
          src={currentAvatarUrl}
          alt="현재 프로필 사진"
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground">
          사진 없음
        </div>
      )}

      {!imageSrc && (
        <>
          <Button
            size="pill"
            variant="outline"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            사진 올리기
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}

      {imageSrc && (
        <div className="flex flex-col gap-4">
          <ReactCrop
            crop={crop}
            onChange={setCrop}
            aspect={1}
            circularCrop
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="자를 이미지"
              onLoad={handleImageLoad}
              className="max-h-80 max-w-full"
            />
          </ReactCrop>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <div className="flex gap-2">
            <Button
              size="pill"
              variant="default"
              type="button"
              onClick={handleSave}
              disabled={isUploading}
            >
              {isUploading ? "업로드 중..." : "저장"}
            </Button>
            <Button
              size="pill"
              variant="outline"
              type="button"
              onClick={handleCancel}
              disabled={isUploading}
            >
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

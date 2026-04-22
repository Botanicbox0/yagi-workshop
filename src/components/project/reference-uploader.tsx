"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Link } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import {
  addReference,
  addReferenceFromUrl,
} from "@/app/[locale]/app/projects/[id]/ref-actions";
import {
  validateVideoFile,
  readVideoMetadata,
} from "@/lib/references/video";
import { validatePdfFile, readPdfMetadata } from "@/lib/references/pdf";

interface ReferenceUploaderProps {
  projectId: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
const DROPZONE_MAX_BYTES = MAX_VIDEO_BYTES; // widest cap; we branch manually.

function extensionFor(file: File, fallback: string): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 8) return fromName.toLowerCase();
  return fallback;
}

export function ReferenceUploader({ projectId }: ReferenceUploaderProps) {
  const t = useTranslations("refs");
  const tErrors = useTranslations("errors");

  const [uploading, setUploading] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlFetching, setUrlFetching] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      const supabase = createSupabaseBrowser();
      try {
        for (const file of acceptedFiles) {
          const type = file.type;

          // Image branch
          if (type.startsWith("image/")) {
            if (file.size > MAX_IMAGE_BYTES) {
              toast.error(tErrors("generic"));
              continue;
            }
            const ext = extensionFor(file, "jpg");
            const path = `${projectId}/${crypto.randomUUID()}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from("project-references")
              .upload(path, file);
            if (uploadError) {
              toast.error(t("url_failed"));
              continue;
            }
            const result = await addReference({
              projectId,
              storage_path: path,
              media_type: "image",
            });
            if (result && "error" in result) {
              toast.error(tErrors("generic"));
            }
            continue;
          }

          // Video branch
          if (type.startsWith("video/")) {
            const check = validateVideoFile(file);
            if (!check.ok) {
              toast.error(
                check.reason === "size"
                  ? t("ref_size_too_large_video")
                  : tErrors("generic")
              );
              continue;
            }
            const meta = await readVideoMetadata(file);
            const ext = extensionFor(file, "mp4");
            const id = crypto.randomUUID();
            const videoPath = `${projectId}/${id}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from("project-references")
              .upload(videoPath, file, { contentType: file.type });
            if (uploadError) {
              toast.error(t("url_failed"));
              continue;
            }

            let thumbnailPath: string | null = null;
            if (meta.poster) {
              const posterPath = `${projectId}/${id}_poster.jpg`;
              const { error: posterError } = await supabase.storage
                .from("project-references")
                .upload(posterPath, meta.poster, {
                  contentType: "image/jpeg",
                });
              if (!posterError) {
                thumbnailPath = posterPath;
              }
            }

            const result = await addReference({
              projectId,
              storage_path: videoPath,
              media_type: "video",
              duration_seconds: meta.duration_seconds,
              thumbnail_path: thumbnailPath,
            });
            if (result && "error" in result) {
              toast.error(tErrors("generic"));
            }
            continue;
          }

          // PDF branch
          if (type === "application/pdf") {
            const pdfCheck = validatePdfFile(file);
            if (!pdfCheck.ok) {
              toast.error(
                pdfCheck.reason === "size"
                  ? t("ref_size_too_large_pdf")
                  : tErrors("generic")
              );
              continue;
            }
            const ext = extensionFor(file, "pdf");
            const id = crypto.randomUUID();
            const pdfPath = `${projectId}/${id}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from("project-references")
              .upload(pdfPath, file, { contentType: file.type });
            if (uploadError) {
              toast.error(t("url_failed"));
              continue;
            }

            const pdfMeta = await readPdfMetadata(file);

            let pdfThumbnailPath: string | null = null;
            if (pdfMeta.poster) {
              const posterPath = `${projectId}/${id}_poster.jpg`;
              const { error: posterError } = await supabase.storage
                .from("project-references")
                .upload(posterPath, pdfMeta.poster, {
                  contentType: "image/jpeg",
                });
              if (!posterError) {
                pdfThumbnailPath = posterPath;
              }
            }

            const result = await addReference({
              projectId,
              storage_path: pdfPath,
              media_type: "pdf",
              thumbnail_path: pdfThumbnailPath,
              page_count: pdfMeta.page_count,
            });
            if (result && "error" in result) {
              toast.error(tErrors("generic"));
            }
            continue;
          }

          // Unknown MIME — dropzone `accept` should prevent this, but be safe.
          toast.error(tErrors("generic"));
        }
      } finally {
        setUploading(false);
      }
    },
    [projectId, t, tErrors]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/gif": [],
      "video/mp4": [],
      "video/quicktime": [],
      "video/webm": [],
      "application/pdf": [],
    },
    maxSize: DROPZONE_MAX_BYTES,
    multiple: true,
  });

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlValue.trim();
    if (!url) return;

    setUrlFetching(true);
    try {
      const result = await addReferenceFromUrl({ projectId, url });
      if ("error" in result) {
        toast.error(tErrors("generic"));
      } else {
        setUrlValue("");
      }
    } finally {
      setUrlFetching(false);
    }
  };

  return (
    <Tabs defaultValue="image" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="image">{t("add_image")}</TabsTrigger>
        <TabsTrigger value="video">{t("ref_type_video")}</TabsTrigger>
        <TabsTrigger value="url">{t("add_url")}</TabsTrigger>
      </TabsList>

      <TabsContent value="image">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-foreground bg-muted/40"
              : "border-border hover:border-foreground/40"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : null}
            <p className="text-sm text-muted-foreground">{t("drop_hint")}</p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="video">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-foreground bg-muted/40"
              : "border-border hover:border-foreground/40"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : null}
            <p className="text-sm text-muted-foreground">
              {t("ref_video_upload_ph")}
            </p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="url">
        <form onSubmit={handleUrlSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder={t("url_ph")}
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              disabled={urlFetching}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={urlFetching || !urlValue.trim()}
              className="rounded-full uppercase tracking-[0.12em] text-xs shrink-0"
            >
              {urlFetching ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  {t("url_fetching")}
                </>
              ) : (
                <>
                  <Link className="h-3 w-3 mr-1" />
                  {t("add_url")}
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("ref_video_url_ph")}
          </p>
        </form>
      </TabsContent>
    </Tabs>
  );
}

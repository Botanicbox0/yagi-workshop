// Called from server action at request-URL-issuance time AND at final submit time.
// Both sides reject invalid shapes. Client-side RHF also uses the same factory
// for progressive validation.
import { z } from "zod";
import { isValidYouTubeUrl } from "@/lib/validation/youtube";
import type { SubmissionRequirements } from "@/lib/challenges/types";

export function buildSubmissionSchema(requirements: SubmissionRequirements) {
  const shape: Record<string, z.ZodTypeAny> = {};

  // text_description is always required
  shape.text_description = z
    .string()
    .min(requirements.text_description.min_chars, {
      message: `최소 ${requirements.text_description.min_chars}자 이상 입력해주세요`,
    })
    .max(requirements.text_description.max_chars, {
      message: `최대 ${requirements.text_description.max_chars}자까지 입력할 수 있어요`,
    });

  // native_video: present only if declared in requirements
  if (requirements.native_video !== undefined) {
    const videoSchema = z.object({
      objectKey: z.string().min(1),
      poster_url: z.string().url().optional(),
      duration_sec: z.number().positive().optional(),
    });
    shape.native_video = requirements.native_video.required
      ? videoSchema
      : videoSchema.optional();
  }

  // youtube_url: present only if declared; validated via isValidYouTubeUrl
  if (requirements.youtube_url !== undefined) {
    const youtubeSchema = z
      .string()
      .refine(isValidYouTubeUrl, { message: "유효한 YouTube URL을 입력해주세요" });
    shape.youtube_url = requirements.youtube_url.required
      ? youtubeSchema
      : youtubeSchema.optional();
  }

  // image: array of objectKey refs, bounded by max_count
  if (requirements.image !== undefined) {
    const imageSchema = z
      .array(z.object({ objectKey: z.string().min(1) }))
      .min(0)
      .max(requirements.image.max_count, {
        message: `이미지는 최대 ${requirements.image.max_count}개까지 올릴 수 있어요`,
      });
    shape.images = requirements.image.required
      ? imageSchema.min(1, { message: "이미지를 최소 1개 올려주세요" })
      : imageSchema.optional();
  }

  // pdf: single objectKey ref
  if (requirements.pdf !== undefined) {
    const pdfSchema = z.object({ objectKey: z.string().min(1) });
    shape.pdf = requirements.pdf.required ? pdfSchema : pdfSchema.optional();
  }

  return z.object(shape);
}

export type BuiltSubmissionSchema = ReturnType<typeof buildSubmissionSchema>;

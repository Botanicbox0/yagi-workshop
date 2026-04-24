import { z } from "zod";

const videoReq = z.object({
  required: z.boolean(),
  max_duration_sec: z.number().int().positive().max(300),
  max_size_mb: z.number().int().positive().max(500),
  formats: z.array(z.enum(["mp4"])).min(1),
});

const imageReq = z.object({
  required: z.boolean(),
  max_count: z.number().int().positive().max(10),
  max_size_mb_each: z.number().int().positive().max(20),
  formats: z.array(z.enum(["jpg", "png", "jpeg"])).min(1),
});

const pdfReq = z.object({
  required: z.boolean(),
  max_size_mb: z.number().int().positive().max(50),
});

const youtubeReq = z.object({ required: z.boolean() });

const textReq = z
  .object({
    required: z.literal(true),
    min_chars: z.number().int().nonnegative().max(5000),
    max_chars: z.number().int().positive().max(5000),
  })
  .refine((v) => v.min_chars <= v.max_chars, "min_chars <= max_chars");

export const submissionRequirementsSchema = z.object({
  native_video: videoReq.optional(),
  image: imageReq.optional(),
  pdf: pdfReq.optional(),
  youtube_url: youtubeReq.optional(),
  text_description: textReq,
});

export const judgingConfigSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("admin_only") }),
  z.object({ mode: z.literal("public_vote") }),
  z.object({
    mode: z.literal("hybrid"),
    admin_weight: z.number().int().min(0).max(100),
  }),
]);

export type SubmissionRequirementsInput = z.infer<typeof submissionRequirementsSchema>;
export type JudgingConfigInput = z.infer<typeof judgingConfigSchema>;

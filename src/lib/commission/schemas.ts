import { z } from "zod";

const COMMISSION_CATEGORIES = [
  "music_video",
  "commercial",
  "teaser",
  "lyric_video",
  "performance",
  "social",
  "other",
] as const;

const BUDGET_RANGES = [
  "under_5m",
  "5m_15m",
  "15m_30m",
  "30m_50m",
  "50m_100m",
  "100m_plus",
  "negotiable",
] as const;

const COMPANY_TYPES = [
  "label",
  "agency",
  "studio",
  "independent",
  "other",
] as const;

// Reference URLs accept YouTube, Vimeo, and Instagram by hostname; everything
// else is rejected at submit time so the form can render a clear error.
const REFERENCE_HOST_ALLOWLIST = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "instagram.com",
];

const referenceUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => {
      try {
        const host = new URL(value).hostname.replace(/^www\./, "");
        return REFERENCE_HOST_ALLOWLIST.some(
          (allowed) => host === allowed || host.endsWith(`.${allowed}`),
        );
      } catch {
        return false;
      }
    },
    { message: "YouTube, Vimeo, 또는 Instagram 링크만 허용됩니다." },
  );

const referenceUploadSchema = z.object({
  object_key: z.string().min(1).max(500),
  file_name: z.string().min(1).max(255),
  size_bytes: z.number().int().nonnegative().max(200 * 1024 * 1024),
});

export const commissionIntakeFormSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(COMMISSION_CATEGORIES),
  budget_range: z.enum(BUDGET_RANGES),
  deadline_preference: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다.")
    .nullable()
    .optional(),
  reference_urls: z.array(referenceUrlSchema).max(3).default([]),
  reference_uploads: z.array(referenceUploadSchema).max(5).default([]),
  brief_md: z
    .string()
    .min(50, "브리프는 최소 50자 이상 작성해 주세요.")
    .max(10000),
  timestamp_notes: z.string().max(5000).nullable().optional(),
});

export type CommissionIntakeFormInput = z.infer<typeof commissionIntakeFormSchema>;

export const clientSignupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  company_name: z.string().min(1).max(120),
  company_type: z.enum(COMPANY_TYPES),
  contact_name: z.string().min(1).max(60),
  contact_phone: z.string().max(40).nullable().optional(),
  website_url: z.string().url().max(500).nullable().optional(),
  instagram_handle: z.string().max(60).nullable().optional(),
});

export type ClientSignupInput = z.infer<typeof clientSignupSchema>;

export const clientProfileEditSchema = clientSignupSchema.omit({
  email: true,
  password: true,
});

export type ClientProfileEditInput = z.infer<typeof clientProfileEditSchema>;

export const commissionAdminResponseSchema = z.object({
  intake_id: z.string().uuid(),
  response_md: z.string().min(20).max(20000),
});

export type CommissionAdminResponseInput = z.infer<
  typeof commissionAdminResponseSchema
>;

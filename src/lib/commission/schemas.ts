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
  "brand",
  "label",
  "agency",
  "startup",
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
  // Empty string normalizes to null on submit; the form passes "" from
  // <Input type="date"> when the user clears the field.
  deadline_preference: z
    .union([
      z.literal(""),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다."),
      z.null(),
    ])
    .optional()
    .transform((v) => (v ? v : null)),
  reference_urls: z.array(referenceUrlSchema).max(3),
  reference_uploads: z.array(referenceUploadSchema).max(5),
  brief_md: z
    .string()
    .min(50, "브리프는 최소 50자 이상 작성해 주세요.")
    .max(10000),
  timestamp_notes: z
    .union([z.literal(""), z.string().max(5000), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
});

export type CommissionIntakeFormInput = z.input<typeof commissionIntakeFormSchema>;
export type CommissionIntakeFormParsed = z.output<typeof commissionIntakeFormSchema>;

// Empty-string → null normalizer for the optional client fields.
// The DB columns enforce CHECK (col IS NULL OR char_length(col) BETWEEN 1 AND ...),
// so passing "" through Zod and into the INSERT would fail at the row
// level and leave the user with a half-created profile (Codex K-05 Loop 2
// Finding F1). This transform aligns Zod with the DB CHECK semantics.
const emptyToNull = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

export const clientSignupSchema = z.object({
  // Auth email (Supabase auth.users.email). May differ from contact_email
  // (company-side contact may not be the account holder).
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  company_name: z.string().min(1).max(120),
  company_type: z.enum(COMPANY_TYPES),
  contact_name: z.string().min(1).max(60),
  contact_email: z.string().email().max(254),
  contact_phone: emptyToNull.pipe(
    z.string().min(1).max(40).nullable(),
  ),
  website_url: emptyToNull.pipe(
    z.string().url().max(500).nullable(),
  ),
  instagram_handle: emptyToNull.pipe(
    z.string().min(1).max(60).nullable(),
  ),
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

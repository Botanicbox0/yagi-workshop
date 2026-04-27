// Phase 2.7 — commission intake type surface.
// Mirrors supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql.
// `database.types.ts` is the runtime source of truth (regen after migration);
// this file gives the rest of the app stable user-land enums + a hand-curated
// shape that's easier to import than the deeply-nested generated row type.

export type CommissionIntakeState =
  | "submitted"
  | "admin_responded"
  | "closed"
  | "archived"
  | "converted";

export type ClientCompanyType =
  | "brand"
  | "label"
  | "agency"
  | "startup"
  | "other";

export type CommissionCategory =
  | "music_video"
  | "commercial"
  | "teaser"
  | "lyric_video"
  | "performance"
  | "social"
  | "other";

export type BudgetRange =
  | "under_5m"
  | "5m_15m"
  | "15m_30m"
  | "30m_50m"
  | "50m_100m"
  | "100m_plus"
  | "negotiable";

export type ReferenceUpload = {
  object_key: string;
  file_name: string;
  size_bytes: number;
};

export type CommissionIntake = {
  id: string;
  client_id: string;
  title: string;
  category: CommissionCategory;
  budget_range: BudgetRange;
  deadline_preference: string | null;
  reference_urls: string[];
  reference_uploads: ReferenceUpload[];
  brief_md: string;
  timestamp_notes: string | null;
  state: CommissionIntakeState;
  admin_response_md: string | null;
  admin_responded_at: string | null;
  admin_responded_by: string | null;
  created_at: string;
  updated_at: string;
  converted_to_project_id: string | null;
};

export type Client = {
  id: string;
  company_name: string;
  company_type: ClientCompanyType;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

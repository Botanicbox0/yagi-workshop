export type SubmissionRequirements = {
  native_video?: {
    required: boolean;
    max_duration_sec: number;
    max_size_mb: number;
    formats: ("mp4")[];
  };
  youtube_url?: {
    required: boolean;
  };
  image?: {
    required: boolean;
    max_count: number;
    max_size_mb_each: number;
    formats: ("jpg" | "png")[];
  };
  pdf?: {
    required: boolean;
    max_size_mb: number;
  };
  text_description: {
    required: true;
    min_chars: number;
    max_chars: number;
  };
};

export type JudgingConfig =
  | { mode: "admin_only" }
  | { mode: "public_vote" }
  | { mode: "hybrid"; admin_weight: number };

export type ChallengeState = "draft" | "open" | "closed_judging" | "closed_announced" | "archived";

export type SubmissionStatus = "created" | "processing" | "ready" | "rejected";

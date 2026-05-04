// Phase 5 Wave C C_4 — 브리프 tab read-only view + [브리프 완성하기 →] CTA.
//
// Renders 3 sections:
//   Stage 1 (Intent)   — title, deliverable_types, description, mood_keywords,
//                         channels, target_audience, visual_ratio, additional_notes
//   Stage 2 (Commit)   — budget_band, target_delivery_at, meeting_preferred_at,
//                         interested_in_twin (3-way: true/false/null)
//   Stage 3 (Submit)   — submitted_at, creator display name
//
// All values are rendered via dt/dd semantic structure — NO input controls.
// Banner + CTA gating per SPEC §"Edit affordance (D5)":
//   status='draft' → banner + primary [브리프 완성하기 →] CTA
//   status!='draft' → read-only only
//
// interested_in_twin 3-way:
//   true  → "관심 있음 / Interested"
//   false → "관심 없음 / Not interested"
//   null  → "미응답 / Not answered"
//
// Display value transformations:
//   - chips for text[] columns
//   - date-only for target_delivery_at (YYYY-MM-DD)
//   - date+time for meeting_preferred_at and submitted_at (YYYY-MM-DD HH:mm)
//   - visual_ratio enum translated + visual_ratio_custom alongside if 'custom'
//
// CTA href: /${locale}/app/projects/new?project={projectId}
//   Query-param hydration wired in Wave B.5 commit 0dfc641.

import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BriefTabProps = {
  locale: "ko" | "en";
  projectId: string;
  status: string;

  // Stage 1
  title: string;
  deliverable_types: string[];
  description: string | null; // projects.brief column
  mood_keywords: string[];
  mood_keywords_free: string | null;
  visual_ratio: string | null;
  visual_ratio_custom: string | null;
  channels: string[];
  target_audience: string | null;
  additional_notes: string | null;

  // Stage 2 (commit)
  budget_band: string | null;
  target_delivery_at: string | null;
  meeting_preferred_at: string | null;
  interested_in_twin: boolean | null;

  // Stage 3 (submit meta)
  submitted_at: string | null;
  creator_display_name: string | null;

  // i18n labels (passed from server page so no client i18n dependency)
  labels: BriefTabLabels;
};

export type BriefTabLabels = {
  // Draft banner
  banner_draft: string;
  cta_complete: string;
  // Section headings
  section_stage1: string;
  section_stage2: string;
  section_stage3: string;
  // Stage 1 field labels
  field_project_name: string;
  field_deliverable_types: string;
  field_description: string;
  field_mood_keywords: string;
  field_channels: string;
  field_target_audience: string;
  field_visual_ratio: string;
  field_additional_notes: string;
  // Stage 2 field labels
  field_budget_band: string;
  field_target_delivery_at: string;
  field_meeting_preferred_at: string;
  field_interested_in_twin: string;
  // Stage 3 field labels
  field_submitted_at: string;
  field_creator: string;
  // Empty / fallback
  empty_dash: string;
  // interested_in_twin 3-way
  twin_interested: string;
  twin_not_interested: string;
  twin_not_answered: string;
  // Budget band map
  budget_under_1m: string;
  budget_1m_to_5m: string;
  budget_5m_to_10m: string;
  budget_negotiable: string;
  // Mood options map (union of known keys + fallback)
  mood_options: Record<string, string>;
  // Channel options map
  channel_options: Record<string, string>;
  // Visual ratio options map
  visual_ratio_options: Record<string, string>;
  // Deliverable type options map
  deliverable_type_options: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Date formatting helpers (no external deps — server component safe)
// ---------------------------------------------------------------------------

function formatDateOnly(isoString: string): string {
  // Input: ISO date string "YYYY-MM-DD" or full ISO datetime.
  // YYYY-MM-DD is the universal display format for both KO and EN.
  return isoString.slice(0, 10);
}

function formatDateTime(isoString: string, locale: "ko" | "en"): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    if (locale === "en") {
      return `${year}-${month}-${day} ${hours}:${mins}`;
    }
    return `${year}-${month}-${day} ${hours}:${mins}`;
  } catch {
    return isoString;
  }
}

// ---------------------------------------------------------------------------
// Chip display (read-only, non-interactive)
// ---------------------------------------------------------------------------

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/60 px-2.5 py-0.5 text-xs font-medium text-foreground/80 keep-all">
      {label}
    </span>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Chip key={item} label={item} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field row — dt/dd pair with subtle hairline divider
// ---------------------------------------------------------------------------

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 border-b border-border/30 last:border-0 grid grid-cols-[160px_1fr] gap-4 items-start">
      <dt className="text-xs font-medium text-muted-foreground keep-all pt-0.5 shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-foreground keep-all leading-relaxed">
        {children}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section card
// ---------------------------------------------------------------------------

function SectionCard({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-0">
      <h3 className="text-sm font-semibold tracking-tight keep-all mb-4 text-foreground">
        {heading}
      </h3>
      <dl className="flex flex-col">{children}</dl>
    </section>
  );
}

// ---------------------------------------------------------------------------
// EmptyValue helper
// ---------------------------------------------------------------------------

function EmptyValue({ dash }: { dash: string }) {
  return <span className="text-muted-foreground/60">{dash}</span>;
}

// ---------------------------------------------------------------------------
// Main BriefTab component
// ---------------------------------------------------------------------------

export function BriefTab({
  locale,
  projectId,
  status,
  title,
  deliverable_types,
  description,
  mood_keywords,
  mood_keywords_free,
  visual_ratio,
  visual_ratio_custom,
  channels,
  target_audience,
  additional_notes,
  budget_band,
  target_delivery_at,
  meeting_preferred_at,
  interested_in_twin,
  submitted_at,
  creator_display_name,
  labels,
}: BriefTabProps) {
  const isDraft = status === "draft";

  // Resolve display values for mapped fields
  const resolvedDeliverableTypes = deliverable_types
    .map((k) => labels.deliverable_type_options[k] ?? k)
    .filter(Boolean);

  const resolvedMoodKeywords = mood_keywords
    .map((k) => labels.mood_options[k] ?? k)
    .filter(Boolean);

  const moodDisplay: string[] = [...resolvedMoodKeywords];
  if (mood_keywords_free?.trim()) {
    moodDisplay.push(mood_keywords_free.trim());
  }

  const resolvedChannels = channels
    .map((k) => labels.channel_options[k] ?? k)
    .filter(Boolean);

  const resolvedVisualRatio = visual_ratio
    ? visual_ratio === "custom"
      ? `${labels.visual_ratio_options["custom"] ?? "custom"}${visual_ratio_custom ? ` (${visual_ratio_custom})` : ""}`
      : (labels.visual_ratio_options[visual_ratio] ?? visual_ratio)
    : null;

  const resolvedBudgetBand = budget_band
    ? budget_band === "under_1m"
      ? labels.budget_under_1m
      : budget_band === "1m_to_5m"
        ? labels.budget_1m_to_5m
        : budget_band === "5m_to_10m"
          ? labels.budget_5m_to_10m
          : budget_band === "negotiable"
            ? labels.budget_negotiable
            : budget_band
    : null;

  const resolvedInterestedInTwin =
    interested_in_twin === null
      ? labels.twin_not_answered
      : interested_in_twin
        ? labels.twin_interested
        : labels.twin_not_interested;

  const dash = <EmptyValue dash={labels.empty_dash} />;

  return (
    <div className="flex flex-col gap-6">
      {/* Draft banner + CTA (D5 gate) */}
      {isDraft && (
        <div className="rounded-2xl border border-[#71D083]/40 bg-[#71D083]/8 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-foreground keep-all leading-relaxed">
            {labels.banner_draft}
          </p>
          <Link
            href={`/${locale}/app/projects/new?project=${projectId}`}
            className="shrink-0 inline-flex items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold px-5 py-2 hover:opacity-80 transition-opacity keep-all"
          >
            {labels.cta_complete}
          </Link>
        </div>
      )}

      {/* Stage 1 — Intent */}
      <SectionCard heading={labels.section_stage1}>
        <FieldRow label={labels.field_project_name}>
          {title || dash}
        </FieldRow>
        <FieldRow label={labels.field_deliverable_types}>
          {resolvedDeliverableTypes.length > 0 ? (
            <ChipList items={resolvedDeliverableTypes} />
          ) : (
            dash
          )}
        </FieldRow>
        <FieldRow label={labels.field_description}>
          {description ? (
            <span className="whitespace-pre-wrap">{description}</span>
          ) : (
            dash
          )}
        </FieldRow>
        <FieldRow label={labels.field_mood_keywords}>
          {moodDisplay.length > 0 ? <ChipList items={moodDisplay} /> : dash}
        </FieldRow>
        <FieldRow label={labels.field_channels}>
          {resolvedChannels.length > 0 ? (
            <ChipList items={resolvedChannels} />
          ) : (
            dash
          )}
        </FieldRow>
        <FieldRow label={labels.field_target_audience}>
          {target_audience ? (
            <span className="whitespace-pre-wrap">{target_audience}</span>
          ) : (
            dash
          )}
        </FieldRow>
        <FieldRow label={labels.field_visual_ratio}>
          {resolvedVisualRatio || dash}
        </FieldRow>
        <FieldRow label={labels.field_additional_notes}>
          {additional_notes ? (
            <span className="whitespace-pre-wrap">{additional_notes}</span>
          ) : (
            dash
          )}
        </FieldRow>
      </SectionCard>

      {/* Stage 2 — Commit */}
      <SectionCard heading={labels.section_stage2}>
        <FieldRow label={labels.field_budget_band}>
          {resolvedBudgetBand || dash}
        </FieldRow>
        <FieldRow label={labels.field_target_delivery_at}>
          {target_delivery_at
            ? formatDateOnly(target_delivery_at)
            : dash}
        </FieldRow>
        <FieldRow label={labels.field_meeting_preferred_at}>
          {meeting_preferred_at
            ? formatDateTime(meeting_preferred_at, locale)
            : dash}
        </FieldRow>
        <FieldRow label={labels.field_interested_in_twin}>
          <span
            className={
              interested_in_twin === true
                ? "text-[#71D083] font-medium"
                : interested_in_twin === false
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60"
            }
          >
            {resolvedInterestedInTwin}
          </span>
        </FieldRow>
      </SectionCard>

      {/* Stage 3 — Submit metadata */}
      <SectionCard heading={labels.section_stage3}>
        <FieldRow label={labels.field_submitted_at}>
          {submitted_at ? formatDateTime(submitted_at, locale) : dash}
        </FieldRow>
        <FieldRow label={labels.field_creator}>
          {creator_display_name || dash}
        </FieldRow>
      </SectionCard>
    </div>
  );
}

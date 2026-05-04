// Phase 4.x task_04 — Board tab (server component) for the post-submit
// detail page. Wraps the existing Phase 3.1 BriefBoardShellClient so
// the redesigned page.tsx stays slim. Fetches its own data so the
// disabled tabs (코멘트 / 결과물) never trigger this code path -- they
// short-circuit to EmptyStateTab in page.tsx.
//
// Self-review (KICKOFF section task_04):
// - project-scope authorization is the responsibility of page.tsx
//   (BLOCKER 1: project.created_by === auth.uid() OR yagi_admin).
//   This component is only rendered after authorization passes.
// - The board RLS itself enforces row-scope (project_boards policy).
//
// Phase 3.1 routing rule preserved: when only a legacy project_briefs
// row exists with no new-system board row at all, render the legacy
// read-only banner.
//
// HF1.6 fix (Hypothesis B): the original source IN ('wizard_seed',
// 'admin_init') check was too narrow — boards with source='migrated'
// (and any other future source values) were silently falling through to
// the "보드가 곧 준비됩니다" placeholder instead of mounting tldraw.
// Fix: ANY project_boards row is treated as a renderable board and passed
// to BriefBoardShellClient. The legacy banner is reserved exclusively for
// projects with NO board row but with an old project_briefs row.

import { createSupabaseServer } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { BriefBoardShellClient } from "@/components/project-board/brief-board-shell-client";
import type { VersionEntry } from "@/components/project-board/version-history-panel";
import type { PdfAttachment, UrlAttachment } from "@/lib/board/asset-index";

type Props = {
  projectId: string;
  isYagiAdmin: boolean;
  /** locale forwarded to translations */
  locale: "ko" | "en";
};

type BoardRow = {
  id: string;
  document: Record<string, unknown> | null;
  source: string | null;
  is_locked: boolean | null;
  attached_pdfs: PdfAttachment[] | null;
  attached_urls: UrlAttachment[] | null;
};

type BriefRow = {
  content_json: unknown;
};

export async function BoardTab({ projectId, isYagiAdmin, locale }: Props) {
  // Phase 3.1 tables are not yet in the generated database.types.ts.
  // The same any-cast pattern used by the existing detail page applies.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
  const supabase = (await createSupabaseServer()) as any;
  const tBrief = await getTranslations({ locale, namespace: "brief_board" });

  const { data: boardRow } = (await supabase
    .from("project_boards")
    .select("id, document, source, is_locked, attached_pdfs, attached_urls")
    .eq("project_id", projectId)
    .maybeSingle()) as { data: BoardRow | null };

  const { data: briefRow } = (await supabase
    .from("project_briefs")
    .select("content_json")
    .eq("project_id", projectId)
    .maybeSingle()) as { data: BriefRow | null };

  // HF1.6: any board row (regardless of source) is renderable via
  // BriefBoardShellClient. The legacy-only check was the regression.
  const hasBoardRow = !!boardRow;
  const hasLegacyBrief = !!briefRow && !!briefRow.content_json;
  // Legacy banner only when there is NO board row but there IS a legacy brief.
  const useLegacyBanner = !hasBoardRow && hasLegacyBrief;

  if (hasBoardRow && boardRow) {
    const { data: bvRaw } = (await supabase
      .from("project_board_versions")
      .select("id, version, created_at, label")
      .eq("board_id", boardRow.id)
      .order("version", { ascending: false })
      .limit(20)) as {
      data:
        | {
            id: string;
            version: number;
            created_at: string;
            label: string | null;
          }[]
        | null;
    };

    const versions: VersionEntry[] = (bvRaw ?? []).map((v) => ({
      id: v.id,
      version: v.version,
      created_at: v.created_at,
      label: v.label,
    }));

    return (
      <BriefBoardShellClient
        projectId={projectId}
        boardId={boardRow.id}
        initialDocument={boardRow.document ?? {}}
        initialLocked={boardRow.is_locked === true}
        viewerRole={isYagiAdmin ? "yagi_admin" : "client"}
        initialPdfs={boardRow.attached_pdfs ?? []}
        initialUrls={boardRow.attached_urls ?? []}
        versions={versions}
        currentVersion={versions.length > 0 ? versions[0].version : 0}
        boardTitle={tBrief("title")}
      />
    );
  }

  if (useLegacyBanner) {
    return (
      <div
        className="border border-border/40 rounded-3xl p-8 text-center"
        role="region"
      >
        <p className="text-sm text-muted-foreground keep-all">
          {locale === "ko"
            ? "이 프로젝트는 이전 시스템에서 만들어졌어요. 보드는 읽기 전용으로 표시됩니다."
            : "This project was created on the legacy system. The board is read-only."}
        </p>
      </div>
    );
  }

  // No board + no legacy brief -- render an empty state. Should be rare
  // (every wizard submit seeds a project_boards row). If it happens,
  // surface a calm 'preparing' line rather than 404.
  return (
    <div
      className="border border-border/40 rounded-3xl p-12 text-center"
      role="region"
    >
      <p className="text-sm text-muted-foreground keep-all">
        {locale === "ko" ? "보드가 곧 준비됩니다." : "Board coming soon."}
      </p>
    </div>
  );
}

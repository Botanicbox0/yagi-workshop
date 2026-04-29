"use client";

/**
 * asset-list-panel.tsx
 * Phase 3.1 task_07 — admin right-rail panel listing all images/PDFs/URLs from
 * project_boards.asset_index (server-side computed via extractAssetIndex).
 * Achromatic (L-011), soft shadow (L-013), font-suit (L-010), no internal seams (L-012).
 *
 * Phase 3.1 hotfix-3 update: AssetIndexEntry shape changed.
 *   - shapeId → shape_id (optional)
 *   - type → kind  ('image' | 'pdf' | 'url')
 *   - src → url
 *   - domain field removed (derive from url)
 */

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { AssetIndexEntry } from "@/lib/board/asset-index";

export interface AssetListPanelProps {
  assets: AssetIndexEntry[];
}

export function AssetListPanel({ assets }: AssetListPanelProps) {
  const t = useTranslations("admin.projects.references");

  const handleCopy = useCallback(async (src: string) => {
    try {
      await navigator.clipboard.writeText(src);
    } catch {
      const input = document.createElement("input");
      input.value = src;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
  }, []);

  const handleDownload = useCallback((src: string, filename?: string) => {
    const a = document.createElement("a");
    a.href = src;
    a.download = filename ?? src.split("/").pop() ?? "download";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  if (assets.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
          {t("title")}
        </h3>
        <p className="text-sm text-muted-foreground keep-all">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
        {t("title")}
      </h3>
      <ul className="space-y-2">
        {assets.map((a, idx) => {
          // Derive a display label from available fields
          const displayLabel =
            a.filename ?? a.title ?? (() => {
              try {
                return new URL(a.url).hostname;
              } catch {
                return a.url;
              }
            })();

          return (
            <li
              key={a.shape_id ?? `${a.source}-${idx}`}
              className="rounded-lg p-3 bg-background"
              style={{
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail / icon */}
                {a.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- R2 public URL not in next/image domains
                  <img
                    src={a.thumbnail_url ?? a.url}
                    alt={a.filename ?? "asset"}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : a.kind === "pdf" ? (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 2h7l4 4v12H5V2z"
                        stroke="#555"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                      <path d="M12 2v4h4" stroke="#555" strokeWidth="1.4" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    {a.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external thumbnail
                      <img
                        src={a.thumbnail_url}
                        alt={a.title ?? "link"}
                        className="w-full h-full rounded object-cover"
                      />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          cx="9"
                          cy="9"
                          r="6.5"
                          stroke="#555"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M2.5 9h13M9 2.5c2 2 2 11 0 13M9 2.5c-2 2-2 11 0 13"
                          stroke="#555"
                          strokeWidth="1.2"
                        />
                      </svg>
                    )}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate keep-all">
                    {displayLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {a.kind}
                    {a.provider && a.provider !== "generic" && (
                      <span className="ml-1 text-muted-foreground/60">
                        · {a.provider}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => void handleCopy(a.url)}
                  className="rounded-full border border-border/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.10em] hover:bg-muted transition-colors"
                >
                  {t("copyUrl")}
                </button>
                {(a.kind === "image" || a.kind === "pdf") && (
                  <button
                    type="button"
                    onClick={() => handleDownload(a.url, a.filename)}
                    className="rounded-full border border-border/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.10em] hover:bg-muted transition-colors"
                  >
                    {t("download")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AssetListPanel;

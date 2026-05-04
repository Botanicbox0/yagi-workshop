Reading additional input from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: high
reasoning summaries: none
session id: 019df201-dd47-7c71-8ef5-fef44c4b78e2
--------
user
Phase 5 Wave B task_05 v3 K-05 LOOP 1 (Tier 1 high). Step 2 Workspace surface. SSRF + RLS + column grant lockdown all in scope. File count = 6, under budget.

Files in scope (6 total):
- src/app/api/oembed/route.ts (NEW — SSRF-guarded oembed proxy, the only server-side fetcher of arbitrary URLs in this Wave)
- src/app/[locale]/app/projects/new/briefing-step2-actions.ts (NEW — 5 server actions: getBriefingDocumentPutUrlAction, addBriefingDocumentAction, removeBriefingDocumentAction, updateBriefingDocumentNoteAction, updateProjectMetadataAction)
- src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx (orchestrator, browser-client fetch of briefing_documents + projects metadata)
- src/app/[locale]/app/projects/new/briefing-canvas-step-2-brief.tsx (left column UI)
- src/app/[locale]/app/projects/new/briefing-canvas-step-2-reference.tsx (center column UI + 1s memo debounce + immediate category change)
- src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx (right column UI + 5s autosave hook with AbortController)

Out of scope (do NOT review): briefing-canvas.tsx wrapper, briefing-canvas-step-1.tsx, i18n keys, briefing-actions.ts (Step 1 action — already CLEAN at task_04 v3 K-05).

Builder grep audit (do not redo — verify):
- briefing_documents RLS policies live + Wave A sub_4 patches applied: SELECT requires workspace_member + project_id IN (workspace_members JOIN); INSERT requires created_by = auth.uid() AND workspace member; UPDATE adds workspace member to USING + WITH CHECK with the 24h window on USING only; DELETE requires workspace member + status='draft' + created_by = auth.uid(). yagi_admin bypass on SELECT/INSERT/UPDATE; DELETE has none.
- Wave A sub_4 F3 column-grant lockdown live: REVOKE UPDATE ON briefing_documents FROM authenticated; GRANT UPDATE (note, category) only. 18 has_*_privilege assertions baked into the migration.
- projects table column lockdown is NOT applied to briefing_canvas metadata columns (the 9 added in task_04 v3 migration 20260504162550). Sidebar autosave uses the user-scoped client UPDATE on those columns; PostgREST works because authenticated still has UPDATE on projects table-wide (Phase 4.x sub_03g F3 was workspaces-only). Verify whether this is acceptable for Phase 5 entry.

Seven focus areas:

1. SSRF on /api/oembed/route.ts — assertSafeUrl rejects http(s)-only schemes, hostname strings ending in .local/.internal, literal localhost; resolves DNS via dns/promises lookup() with verbatim:true and rejects RFC1918 / loopback / link-local / ULA / multicast / CGNAT / 169.254.169.254. safeFetchHtml does manual redirect handling with up to 3 hops, re-validates each hop's IP, hard-caps Content-Length AND streams response with a 5MB byte counter that aborts on overflow. AbortSignal.timeout(5000ms) on every fetch. Verify: any DNS-rebinding window between resolve and fetch? any provider whitelist that's tighter than current implementation needed (e.g., should generic OG-scrape be opt-in only)? OG-meta parser uses regex on text; verify it can't cause ReDoS on a maliciously crafted HTML.

2. assertProjectMutationAuth helper — the central authorization function used by 4 of 5 server actions. Order: getUser → resolveActiveWorkspace → SELECT project (id, workspace_id, status, created_by) → reject if workspace_id != active.id → reject if status != 'draft' → SELECT workspace_members for (workspace_id, user_id) → reject if no row. Verify race conditions between these checks and the subsequent INSERT/UPDATE; verify that a workspace removal between SELECT and INSERT can't slip through.

3. R2 prefix bind on getBriefingDocumentPutUrlAction + addBriefingDocumentAction — presign generates `briefing-docs/${auth.userId}/${kind}/<uuid>.<ext>`; addBriefingDocumentAction re-validates `data.storage_key.startsWith(briefing-docs/${auth.userId}/${kind}/)` AND rejects `..` / leading `/`. Verify no path lets a malicious client INSERT a row with another user's storage_key.

4. removeBriefingDocumentAction — leans entirely on RLS DELETE policy, but adds a SELECT to distinguish not_found from forbidden. Verify the SELECT honours RLS scope (yes — uses user-scoped client). Verify the DELETE has redundant `eq('created_by', user.id)` defense-in-depth.

5. updateBriefingDocumentNoteAction column grant — payload only includes note + category (the two columns granted by Wave A sub_4 F3). Verify no path lets a caller pass a payload with other fields that PostgREST silently accepts. Verify category mutation on kind='brief' rows is rejected at the action layer (DB doesn't enforce — only the action does).

6. updateProjectMetadataAction status guard — UPDATE filters by `eq('status', 'draft')` so the row's own status check serializes against any concurrent status flip. assertProjectMutationAuth checked status earlier, but the UPDATE redoes the check via WHERE clause for safety. Verify no path allows metadata update after the project transitions to in_review.

7. Step 2 sidebar autosave race — useEffect on form changes, 5s debounce timer, AbortController canceling any in-flight save before issuing a new one, lastCommittedRef preventing idle re-saves of unchanged values. Verify rapid-fire edits don't lose the last commit. Verify the AbortController-cancelled save doesn't update the autosave UI state incorrectly. Verify component unmount during a pending save doesn't UI-thrash (cleanup function clears the timer).

Output format:

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding (no priors to track):
[FINDING N] CLASS: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — task_05 v3 ready for yagi visual review and Wave B task_06 entry."

End with one-line summary suitable for the run log.
codex
I’ll review only the six in-scope files and the relevant authorization/RLS touchpoints they depend on, with findings limited to new high/medium issues.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-step2-actions.ts' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/api/oembed/route.ts' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 576ms:
// =============================================================================
// Phase 5 Wave B task_05 v3 ??oembed proxy with SSRF guards
//
// Briefing Canvas Step 2 reference column posts a URL ??this endpoint
// returns { provider, thumbnail_url?, oembed_html?, title? } for client
// rendering. The endpoint is the only server-side fetcher of arbitrary
// URLs, so it is the SSRF surface this Wave introduces.
//
// SSRF protection:
//   1. http(s) scheme only ??file://, data://, gopher:// rejected.
//   2. Hostname ??IP resolve. Reject private (RFC1918), loopback,
//      link-local, ULA (fc00::/7), multicast, and metadata service
//      addresses (169.254.169.254). Resolution happens BEFORE fetch
//      so DNS rebinding has no opening between the resolve and the
//      socket.
//   3. AbortSignal.timeout(5000) hard cap.
//   4. Response size cap (5 MB), enforced via streaming reader so a
//      malicious server can't OOM us with a giant response.
//   5. Manual redirect handling ??re-validate the redirect target IP
//      before following.
//
// Provider detection:
//   - YouTube + Vimeo  ??reuse `lib/oembed.fetchVideoMetadata` (cached).
//   - Instagram        ??return raw URL, no oEmbed (Meta API key
//                         requirement makes this a separate phase).
//   - Generic          ??SSRF-safe fetch + OG-meta parse (og:title,
//                         og:image, og:description).
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { lookup as dnsLookup } from "node:dns/promises";
import net from "node:net";
import { fetchVideoMetadata } from "@/lib/oembed";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_REDIRECTS = 3;

const YOUTUBE_RE = /(?:^|\.)(?:youtube\.com|youtu\.be)$/i;
const VIMEO_RE = /(?:^|\.)vimeo\.com$/i;
const INSTAGRAM_RE = /(?:^|\.)(?:instagram\.com|cdninstagram\.com)$/i;

// ---------------------------------------------------------------------------
// SSRF helpers
// ---------------------------------------------------------------------------

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  // ULA: fc00::/7 ??first byte 0xfc or 0xfd
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // link-local: fe80::/10
  if (lower.startsWith("fe8") || lower.startsWith("fe9") ||
      lower.startsWith("fea") || lower.startsWith("feb")) {
    return true;
  }
  // multicast: ff00::/8
  if (lower.startsWith("ff")) return true;
  // IPv4-mapped (::ffff:0:0/96) ??apply IPv4 rules to the v4 portion
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    if (net.isIPv4(v4)) return isPrivateIPv4(v4);
  }
  return false;
}

async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("scheme must be http(s)");
  }
  if (!parsed.hostname) throw new Error("missing hostname");

  // Reject hostname strings that smell like internal-only.
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("internal hostname rejected");
  }

  // Resolve and reject private IPs. Default DNS lookup honours OS hosts
  // file; on local dev this prevents `host /etc/hosts ??127.0.0.1` mappings
  // from sneaking through.
  if (net.isIP(host)) {
    if (net.isIPv4(host) && isPrivateIPv4(host)) {
      throw new Error("private IPv4 rejected");
    }
    if (net.isIPv6(host) && isPrivateIPv6(host)) {
      throw new Error("private IPv6 rejected");
    }
    return parsed;
  }

  const records = await dnsLookup(host, { all: true, verbatim: true });
  for (const r of records) {
    if (r.family === 4 && isPrivateIPv4(r.address)) {
      throw new Error("private IPv4 resolved");
    }
    if (r.family === 6 && isPrivateIPv6(r.address)) {
      throw new Error("private IPv6 resolved");
    }
  }
  return parsed;
}

async function safeFetchHtml(rawUrl: string): Promise<string | null> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const validated = await assertSafeUrl(current);
    let res: Response;
    try {
      res = await fetch(validated.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent": "YagiWorkshop/1.0 (briefing oembed proxy)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      return null;
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      current = new URL(loc, validated).toString();
      continue;
    }
    if (!res.ok) return null;

    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.startsWith("text/html") && !ct.startsWith("application/xhtml")) {
      return null;
    }
    const cl = Number(res.headers.get("content-length") ?? "0");
    if (cl > MAX_RESPONSE_BYTES) return null;

    // Stream-cap the body so a server lying about Content-Length can't
    // OOM us. Read up to MAX_RESPONSE_BYTES then abort.
    if (!res.body) return null;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      buf.set(c, offset);
      offset += c.byteLength;
    }
    return new TextDecoder("utf-8").decode(buf);
  }
  return null;
}

// ---------------------------------------------------------------------------
// OG meta parser
// ---------------------------------------------------------------------------

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function parseMeta(html: string, prop: string): string | null {
  // Match <meta property="og:image" content="..."> or content-first variant.
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return decodeHtmlEntities(m[1]);
  const reAlt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i",
  );
  const m2 = html.match(reAlt);
  return m2 ? decodeHtmlEntities(m2[1]) : null;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

type OembedResult = {
  provider: "youtube" | "vimeo" | "instagram" | "generic";
  thumbnail_url: string | null;
  oembed_html: string | null;
  title: string | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl || rawUrl.length === 0 || rawUrl.length > 2000) {
    return NextResponse.json(
      { error: "missing or invalid url" },
      { status: 400 },
    );
  }

  let parsed: URL;
  try {
    parsed = await assertSafeUrl(rawUrl);
  } catch {
    return NextResponse.json(
      { error: "url rejected" },
      { status: 400 },
    );
  }
  const host = parsed.hostname.toLowerCase();

  // YouTube + Vimeo ??reuse the cached oembed library. fetchVideoMetadata
  // hits the provider's official oembed endpoint, which is trusted.
  if (YOUTUBE_RE.test(host) || VIMEO_RE.test(host)) {
    try {
      const meta = await fetchVideoMetadata(parsed.toString());
      if (meta) {
        const result: OembedResult = {
          provider: meta.provider,
          thumbnail_url: meta.thumbnailUrl,
          oembed_html: null,
          title: meta.title,
        };
        return NextResponse.json(result);
      }
    } catch {
      // fall through to generic metadata fail
    }
    return NextResponse.json(
      {
        provider: YOUTUBE_RE.test(host) ? "youtube" : "vimeo",
        thumbnail_url: null,
        oembed_html: null,
        title: null,
      } satisfies OembedResult,
    );
  }

  // Instagram ??Meta requires API key for oEmbed; for now return the bare
  // provider tag so the client renders the URL with no thumbnail.
  if (INSTAGRAM_RE.test(host)) {
    return NextResponse.json(
      {
        provider: "instagram",
        thumbnail_url: null,
        oembed_html: null,
        title: null,
      } satisfies OembedResult,
    );
  }

  // Generic ??SSRF-safe fetch + OG meta parse.
  const html = await safeFetchHtml(parsed.toString());
  if (!html) {
    return NextResponse.json(
      {
        provider: "generic",
        thumbnail_url: null,
        oembed_html: null,
        title: null,
      } satisfies OembedResult,
    );
  }
  const ogTitle = parseMeta(html, "og:title");
  const ogImage = parseMeta(html, "og:image");
  return NextResponse.json(
    {
      provider: "generic",
      thumbnail_url: ogImage,
      oembed_html: null,
      title: ogTitle,
    } satisfies OembedResult,
  );
}


 succeeded in 574ms:
"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 ??Step 2 orchestrator (Briefing Canvas Workspace)
//
// Layout (lg:grid-cols-3 / mobile stack):
//   Col 1: Step2BriefColumn ??蹂댁쑀 ?먮즺 (briefing_documents kind='brief')
//   Col 2: Step2ReferenceColumn ???덊띁?곗뒪 (kind='reference', oembed)
//   Col 3: Step2Sidebar ???뷀뀒??(12 fields, 5s autosave)
//
// Sticky bottom CTA bar:
//   [???댁쟾]  쨌  ?먮룞 ???status indicator  쨌  [?뺤씤 ??
//
// Whiteboard expandable mounts under the 3-col grid; collapsed by default
// per KICKOFF v1.2 짠task_05 (90% ???).
//
// Initial data:
//   - briefing_documents fetched on mount via supabase browser client
//     (RLS-scoped to the project's workspace members).
//   - projects metadata fetched on mount and seeded into Step2Sidebar.
// =============================================================================

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Step2BriefColumn, type BriefDoc } from "./briefing-canvas-step-2-brief";
import {
  Step2ReferenceColumn,
  type ReferenceDoc,
} from "./briefing-canvas-step-2-reference";
import {
  Step2Sidebar,
  type SidebarFormData,
  type AutosaveState,
} from "./briefing-canvas-step-2-sidebar";

type ProjectMetadata = {
  mood_keywords: string[] | null;
  mood_keywords_free: string | null;
  visual_ratio: string | null;
  visual_ratio_custom: string | null;
  channels: string[] | null;
  has_plan: string | null;
  target_audience: string | null;
  additional_notes: string | null;
  budget_band: string | null;
  target_delivery_at: string | null;
  meeting_preferred_at: string | null;
  interested_in_twin: boolean | null;
};

const EMPTY_SIDEBAR: SidebarFormData = {
  mood_keywords: [],
  mood_keywords_free: "",
  visual_ratio: "",
  visual_ratio_custom: "",
  channels: [],
  has_plan: "",
  target_audience: "",
  additional_notes: "",
  budget_band: "",
  target_delivery_at: "",
  meeting_preferred_at: "",
  interested_in_twin: false,
};

function formatSavedAt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function BriefingCanvasStep2({
  projectId,
  onBack,
  onNext,
}: {
  projectId: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("projects");
  const [briefDocs, setBriefDocs] = useState<BriefDoc[]>([]);
  const [refDocs, setRefDocs] = useState<ReferenceDoc[]>([]);
  const [sidebarInitial, setSidebarInitial] = useState<SidebarFormData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);

  // Initial fetch of briefing_documents + projects metadata.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
      const sb = supabase as any;
      const [docsRes, projRes] = await Promise.all([
        sb
          .from("briefing_documents")
          .select(
            "id, kind, source_type, storage_key, filename, size_bytes, mime_type, url, provider, thumbnail_url, oembed_html, note, category, created_at",
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
        sb
          .from("projects")
          .select(
            "mood_keywords, mood_keywords_free, visual_ratio, visual_ratio_custom, channels, has_plan, target_audience, additional_notes, budget_band, target_delivery_at, meeting_preferred_at, interested_in_twin",
          )
          .eq("id", projectId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const docs = (docsRes.data ?? []) as Array<{
        id: string;
        kind: "brief" | "reference";
        source_type: "upload" | "url";
        storage_key: string | null;
        filename: string | null;
        size_bytes: number | null;
        url: string | null;
        provider: string | null;
        thumbnail_url: string | null;
        note: string | null;
        category: string | null;
      }>;
      setBriefDocs(
        docs
          .filter((d) => d.kind === "brief")
          .map((d) => ({
            id: d.id,
            source_type: d.source_type,
            storage_key: d.storage_key,
            filename: d.filename,
            url: d.url,
            size_bytes: d.size_bytes,
          })),
      );
      setRefDocs(
        docs
          .filter((d) => d.kind === "reference")
          .map((d) => ({
            id: d.id,
            url: d.url,
            provider: d.provider,
            thumbnail_url: d.thumbnail_url,
            note: d.note,
            category: d.category,
          })),
      );
      const meta = (projRes.data as ProjectMetadata | null) ?? null;
      setSidebarInitial({
        ...EMPTY_SIDEBAR,
        mood_keywords: meta?.mood_keywords ?? [],
        mood_keywords_free: meta?.mood_keywords_free ?? "",
        visual_ratio: meta?.visual_ratio ?? "",
        visual_ratio_custom: meta?.visual_ratio_custom ?? "",
        channels: meta?.channels ?? [],
        has_plan: (meta?.has_plan as SidebarFormData["has_plan"]) ?? "",
        target_audience: meta?.target_audience ?? "",
        additional_notes: meta?.additional_notes ?? "",
        budget_band:
          (meta?.budget_band as SidebarFormData["budget_band"]) ?? "",
        target_delivery_at: meta?.target_delivery_at
          ? meta.target_delivery_at.slice(0, 10)
          : "",
        meeting_preferred_at: meta?.meeting_preferred_at
          ? meta.meeting_preferred_at.slice(0, 16)
          : "",
        interested_in_twin: meta?.interested_in_twin ?? false,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading || !sidebarInitial) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-foreground/40 mb-3">
          {t("briefing.step2.header.eyebrow")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed keep-all max-w-2xl">
          {t("briefing.step2.header.description")}
        </p>
      </div>

      {/* 3-col grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Step2BriefColumn
          projectId={projectId}
          documents={briefDocs}
          onAdded={(d) => setBriefDocs((prev) => [...prev, d])}
          onRemoved={(id) =>
            setBriefDocs((prev) => prev.filter((d) => d.id !== id))
          }
        />
        <Step2ReferenceColumn
          projectId={projectId}
          documents={refDocs}
          onAdded={(d) => setRefDocs((prev) => [...prev, d])}
          onRemoved={(id) =>
            setRefDocs((prev) => prev.filter((d) => d.id !== id))
          }
          onUpdated={(id, patch) =>
            setRefDocs((prev) =>
              prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
            )
          }
        />
        <Step2Sidebar
          projectId={projectId}
          initial={sidebarInitial}
          onAutosaveState={(state, ts) => {
            setAutosave(state);
            if (ts) setSavedAt(ts);
          }}
        />
      </div>

      {/* Whiteboard expandable ??task_05 v3 ships the disclosure pattern;
          full tldraw mount is FU-Phase5-3. */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mt-8">
        <details className="group rounded-3xl border border-border/40 p-4">
          <summary className="cursor-pointer text-sm font-medium select-none list-none flex items-center justify-between">
            <span>{t("briefing.step2.whiteboard.expand_cta")}</span>
            <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
              ??            </span>
          </summary>
          <div className="mt-4 p-12 rounded-2xl bg-muted/40 text-center">
            <p className="text-xs text-muted-foreground keep-all leading-relaxed">
              {t("briefing.step2.whiteboard.placeholder")}
            </p>
          </div>
        </details>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border/40 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-sm"
          >
            {t("briefing.step2.cta.back")}
          </Button>
          <div className="text-xs text-muted-foreground keep-all flex items-center gap-2">
            {autosave === "saving" && (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{t("briefing.step2.autosave.saving")}</span>
              </>
            )}
            {autosave === "saved" && (
              <span className="text-emerald-600">
                {t("briefing.step2.autosave.saved_at", {
                  time: formatSavedAt(savedAt),
                })}
              </span>
            )}
            {autosave === "error" && (
              <span className="text-destructive">
                {t("briefing.step2.autosave.error")}
              </span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onNext}
            className="text-sm rounded-full px-6"
          >
            {t("briefing.step2.cta.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}


 succeeded in 576ms:
"use server";

// =============================================================================
// Phase 5 Wave B task_05 v3 ??Step 2 workspace server actions
//
// Split from briefing-actions.ts to keep file sizes managable. The Step 1
// transition action (ensureBriefingDraftProject) stays in briefing-actions.ts;
// every Step 2 read/write surface lives here.
//
// 5 actions:
//   - getBriefingDocumentPutUrlAction(input)    ??R2 presigned PUT (upload only)
//   - addBriefingDocumentAction(input)          ??INSERT briefing_documents
//   - removeBriefingDocumentAction(input)       ??DELETE briefing_documents
//   - updateBriefingDocumentNoteAction(input)   ??UPDATE note + category only
//   - updateProjectMetadataAction(input)        ??autosave 12 sidebar fields
//
// Authorization model ??Phase 4.x sub_03f_5 F4 pattern reused, plus the
// briefing_documents column-grant lockdown landed in Wave A sub_4 F3:
//   1. createSupabaseServer (user-scoped)
//   2. resolveActiveWorkspace for active workspace id
//   3. explicit project ownership + workspace-membership re-verify before
//      any write, even though RLS already gates row scope
//   4. status='draft' guard on every Step 2 write (no metadata changes
//      after the project transitions to in_review)
//   5. storage_key prefix bound to auth.uid() in the presign AND re-validated
//      on INSERT (sub_03f_5 F2 pattern)
//   6. UPDATE only writes (note, category) per Wave A sub_4 F3 column grant ??//      anything else fails at the privilege layer regardless of payload
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import {
  createBriefAssetPutUrl,
  briefObjectPublicUrl,
} from "@/lib/r2/client";

// ---------------------------------------------------------------------------
// Shared constants + helpers
// ---------------------------------------------------------------------------

const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_FOR_CONTENT_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const URL_MAX_LEN = 2000;
const KIND_VALUES = ["brief", "reference"] as const;
const CATEGORY_VALUES = ["mood", "composition", "pacing", "general"] as const;

/**
 * Verifies the caller is a current workspace_member of the project's
 * workspace AND that the project is still in 'draft' state. Defense-
 * in-depth ??RLS policies on briefing_documents + projects already
 * gate row scope, but every Step 2 write re-runs this check at the
 * action layer so a status transition or workspace removal between
 * SELECT and INSERT/UPDATE doesn't slip through.
 */
async function assertProjectMutationAuth(projectId: string): Promise<
  | {
      ok: true;
      userId: string;
      workspaceId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
      sb: any;
    }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "no_workspace"
        | "not_found"
        | "forbidden";
      message?: string;
    }
> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  const sb = supabase as any;

  const { data: project, error: selErr } = await sb
    .from("projects")
    .select("id, workspace_id, status, created_by")
    .eq("id", projectId)
    .maybeSingle();
  if (selErr) {
    console.error("[assertProjectMutationAuth] SELECT error:", selErr);
    return { ok: false, error: "forbidden", message: selErr.message };
  }
  if (!project) return { ok: false, error: "not_found" };
  if (project.workspace_id !== active.id) {
    return { ok: false, error: "forbidden", message: "workspace mismatch" };
  }
  if (project.status !== "draft") {
    return {
      ok: false,
      error: "forbidden",
      message: "project is no longer draft",
    };
  }

  const { data: member } = await sb
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    return { ok: false, error: "forbidden", message: "not a workspace member" };
  }

  return { ok: true, userId: user.id, workspaceId: project.workspace_id, sb };
}

// ===========================================================================
// 1. getBriefingDocumentPutUrlAction
// ===========================================================================

const getPutUrlInput = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(KIND_VALUES),
  contentType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type GetPutUrlResult =
  | { ok: true; putUrl: string; storageKey: string; publicUrl: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "not_found"
        | "forbidden"
        | "content_type_not_allowed"
        | "presign_failed";
      message?: string;
    };

export async function getBriefingDocumentPutUrlAction(
  input: unknown,
): Promise<GetPutUrlResult> {
  const parsed = getPutUrlInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(parsed.data.contentType)) {
    return { ok: false, error: "content_type_not_allowed" };
  }
  const auth = await assertProjectMutationAuth(parsed.data.projectId);
  if (!auth.ok) return auth;

  const ext = EXT_FOR_CONTENT_TYPE[parsed.data.contentType] ?? "bin";
  const uuid = crypto.randomUUID();
  // sub_03f_5 F2 pattern reused ??caller-bound prefix + kind segment.
  const storageKey = `briefing-docs/${auth.userId}/${parsed.data.kind}/${uuid}.${ext}`;

  try {
    const putUrl = await createBriefAssetPutUrl(
      storageKey,
      parsed.data.contentType,
      600,
    );
    return {
      ok: true,
      putUrl,
      storageKey,
      publicUrl: briefObjectPublicUrl(storageKey),
    };
  } catch (err) {
    console.error("[getBriefingDocumentPutUrlAction] presign failed:", err);
    return { ok: false, error: "presign_failed" };
  }
}

// ===========================================================================
// 2. addBriefingDocumentAction
// ===========================================================================

const addInput = z.discriminatedUnion("source_type", [
  z.object({
    projectId: z.string().uuid(),
    kind: z.enum(KIND_VALUES),
    source_type: z.literal("upload"),
    storage_key: z.string().min(1).max(500),
    filename: z.string().trim().min(1).max(200),
    size_bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
    mime_type: z.string().min(1).max(200),
    note: z.string().trim().max(500).optional().nullable(),
    category: z.enum(CATEGORY_VALUES).optional().nullable(),
  }),
  z.object({
    projectId: z.string().uuid(),
    kind: z.enum(KIND_VALUES),
    source_type: z.literal("url"),
    url: z
      .string()
      .min(1)
      .max(URL_MAX_LEN)
      .refine(
        (u) => {
          try {
            const p = new URL(u);
            return p.protocol === "http:" || p.protocol === "https:";
          } catch {
            return false;
          }
        },
        { message: "url must be http:// or https://" },
      ),
    provider: z
      .enum(["youtube", "vimeo", "instagram", "generic"])
      .optional()
      .nullable(),
    thumbnail_url: z.string().max(URL_MAX_LEN).optional().nullable(),
    oembed_html: z.string().max(20_000).optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
    category: z.enum(CATEGORY_VALUES).optional().nullable(),
  }),
]);

export type AddBriefingDocumentResult =
  | {
      ok: true;
      document: {
        id: string;
        kind: "brief" | "reference";
        source_type: "upload" | "url";
        storage_key: string | null;
        filename: string | null;
        size_bytes: number | null;
        mime_type: string | null;
        url: string | null;
        provider: string | null;
        thumbnail_url: string | null;
        oembed_html: string | null;
        note: string | null;
        category: string | null;
        created_at: string;
        created_by: string;
      };
    }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "not_found"
        | "forbidden"
        | "db";
      message?: string;
    };

export async function addBriefingDocumentAction(
  input: unknown,
): Promise<AddBriefingDocumentResult> {
  const parsed = addInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const data = parsed.data;
  const auth = await assertProjectMutationAuth(data.projectId);
  if (!auth.ok) return auth;

  // sub_03f_5 F2 ??re-validate caller-bound prefix on the storage_key.
  if (data.source_type === "upload") {
    const requiredPrefix = `briefing-docs/${auth.userId}/${data.kind}/`;
    if (!data.storage_key.startsWith(requiredPrefix)) {
      return {
        ok: false,
        error: "forbidden",
        message: `storage_key prefix must be ${requiredPrefix}`,
      };
    }
    if (data.storage_key.includes("..") || data.storage_key.startsWith("/")) {
      return {
        ok: false,
        error: "forbidden",
        message: "storage_key contains forbidden characters",
      };
    }
  }

  // Reference-only category. KICKOFF v1.3 짠task_05 says category is
  // meaningful only for kind='reference'; reject mismatched payloads
  // explicitly so the UI doesn't silently swallow.
  if (data.kind === "brief" && data.category) {
    return {
      ok: false,
      error: "validation",
      message: "category is meaningful only for kind='reference'",
    };
  }

  const insertPayload =
    data.source_type === "upload"
      ? {
          project_id: data.projectId,
          kind: data.kind,
          source_type: "upload",
          storage_key: data.storage_key,
          filename: data.filename,
          size_bytes: data.size_bytes,
          mime_type: data.mime_type,
          note: data.note ?? null,
          category: data.category ?? null,
          created_by: auth.userId,
        }
      : {
          project_id: data.projectId,
          kind: data.kind,
          source_type: "url",
          url: data.url,
          provider: data.provider ?? "generic",
          thumbnail_url: data.thumbnail_url ?? null,
          oembed_html: data.oembed_html ?? null,
          note: data.note ?? null,
          category:
            data.kind === "reference"
              ? (data.category ?? "general")
              : null,
          created_by: auth.userId,
        };

  const { data: inserted, error: insErr } = await auth.sb
    .from("briefing_documents")
    .insert(insertPayload)
    .select(
      "id, kind, source_type, storage_key, filename, size_bytes, mime_type, url, provider, thumbnail_url, oembed_html, note, category, created_at, created_by",
    )
    .single();
  if (insErr || !inserted) {
    console.error("[addBriefingDocumentAction] INSERT error:", insErr);
    return {
      ok: false,
      error: "db",
      message: insErr?.message ?? "insert failed",
    };
  }

  revalidatePath("/[locale]/app/projects/new", "page");
  return { ok: true, document: inserted };
}

// ===========================================================================
// 3. removeBriefingDocumentAction
// ===========================================================================

const removeInput = z.object({
  documentId: z.string().uuid(),
});

export type RemoveBriefingDocumentResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "not_found"
        | "forbidden"
        | "db";
      message?: string;
    };

export async function removeBriefingDocumentAction(
  input: unknown,
): Promise<RemoveBriefingDocumentResult> {
  const parsed = removeInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  const sb = supabase as any;

  const { data: doc } = await sb
    .from("briefing_documents")
    .select("id, project_id, created_by")
    .eq("id", parsed.data.documentId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "not_found" };
  if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };

  // RLS DELETE policy gates created_by + workspace member + status='draft'.
  // The redundant eq filter on created_by is defense-in-depth.
  const { error: delErr } = await sb
    .from("briefing_documents")
    .delete()
    .eq("id", parsed.data.documentId)
    .eq("created_by", user.id);
  if (delErr) {
    return { ok: false, error: "db", message: delErr.message };
  }

  revalidatePath("/[locale]/app/projects/new", "page");
  return { ok: true };
}

// ===========================================================================
// 4. updateBriefingDocumentNoteAction (note + category only)
// ===========================================================================

const updateNoteInput = z.object({
  documentId: z.string().uuid(),
  note: z.string().trim().max(500).optional().nullable(),
  category: z.enum(CATEGORY_VALUES).optional().nullable(),
});

export type UpdateBriefingNoteResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "not_found"
        | "forbidden"
        | "db";
      message?: string;
    };

export async function updateBriefingDocumentNoteAction(
  input: unknown,
): Promise<UpdateBriefingNoteResult> {
  const parsed = updateNoteInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  const sb = supabase as any;

  const { data: doc } = await sb
    .from("briefing_documents")
    .select("id, kind, created_by")
    .eq("id", parsed.data.documentId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "not_found" };
  if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };

  if (doc.kind === "brief" && parsed.data.category != null) {
    return {
      ok: false,
      error: "validation",
      message: "category is meaningful only for kind='reference'",
    };
  }

  // sub_4 F3 column-grant lockdown means PostgREST UPDATE here can only
  // touch (note, category). We construct a minimal payload to stay
  // defensive in the action layer too.
  const payload: { note?: string | null; category?: string | null } = {};
  if (parsed.data.note !== undefined) payload.note = parsed.data.note;
  if (parsed.data.category !== undefined)
    payload.category = parsed.data.category;
  if (Object.keys(payload).length === 0) {
    return { ok: false, error: "validation", message: "no field to update" };
  }

  const { error: updErr } = await sb
    .from("briefing_documents")
    .update(payload)
    .eq("id", parsed.data.documentId)
    .eq("created_by", user.id);
  if (updErr) {
    return { ok: false, error: "db", message: updErr.message };
  }

  revalidatePath("/[locale]/app/projects/new", "page");
  return { ok: true };
}

// ===========================================================================
// 5. updateProjectMetadataAction ??Step 2 sidebar autosave
// ===========================================================================

const metadataInput = z.object({
  projectId: z.string().uuid(),
  // 12 sidebar fields per yagi-locked Schema Option A. All optional ??  // every field can stay blank through submit. undefined = "don't
  // change", null = "clear to NULL".
  mood_keywords: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  mood_keywords_free: z.string().trim().max(200).optional().nullable(),
  visual_ratio: z.string().trim().max(60).optional().nullable(),
  visual_ratio_custom: z.string().trim().max(60).optional().nullable(),
  channels: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  has_plan: z
    .enum(["have", "want_proposal", "undecided"])
    .optional()
    .nullable(),
  target_audience: z.string().trim().max(500).optional().nullable(),
  additional_notes: z.string().trim().max(2000).optional().nullable(),
  budget_band: z
    .enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"])
    .optional()
    .nullable(),
  target_delivery_at: z.string().nullable().optional(),
  meeting_preferred_at: z.string().datetime().nullable().optional(),
  interested_in_twin: z.boolean().optional(),
});

export type UpdateProjectMetadataResult =
  | { ok: true; savedAt: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "not_found"
        | "forbidden"
        | "db";
      message?: string;
    };

export async function updateProjectMetadataAction(
  input: unknown,
): Promise<UpdateProjectMetadataResult> {
  const parsed = metadataInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const auth = await assertProjectMutationAuth(parsed.data.projectId);
  if (!auth.ok) return auth;

  const payload: Record<string, unknown> = {};
  const fields = [
    "mood_keywords",
    "mood_keywords_free",
    "visual_ratio",
    "visual_ratio_custom",
    "channels",
    "has_plan",
    "target_audience",
    "additional_notes",
    "budget_band",
    "target_delivery_at",
    "meeting_preferred_at",
    "interested_in_twin",
  ] as const;
  for (const f of fields) {
    const v = parsed.data[f];
    if (v !== undefined) payload[f] = v;
  }
  if (Object.keys(payload).length === 0) {
    return { ok: false, error: "validation", message: "no field to update" };
  }

  const { error: updErr } = await auth.sb
    .from("projects")
    .update(payload)
    .eq("id", parsed.data.projectId)
    .eq("status", "draft");
  if (updErr) {
    console.error("[updateProjectMetadataAction] UPDATE error:", updErr);
    return { ok: false, error: "db", message: updErr.message };
  }

  // No revalidatePath on autosave ??the user is mid-edit and a
  // server-component refresh would visually thrash. Revalidation runs
  // on Step 2 ??Step 3 transition.
  return { ok: true, savedAt: new Date().toISOString() };
}


codex
I’ve got the oEmbed route and actions open. Next I’m reading the three UI columns plus the R2/oEmbed helpers so I can distinguish action-layer issues from helper behavior.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-canvas-step-2-brief.tsx' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-canvas-step-2-reference.tsx' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/r2/client.ts' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/oembed.ts' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 403ms:
"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 ??Step 2 left column (蹂댁쑀 ?먮즺 / brief docs)
//
// Two add paths:
//   - File upload: getBriefingDocumentPutUrlAction ??R2 PUT ??addBriefingDocumentAction
//   - Link: addBriefingDocumentAction (kind='brief', source_type='url')
//
// The list shows briefing_documents WHERE kind='brief' for this project,
// with a delete X per row.
// =============================================================================

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, FileText, Link as LinkIcon, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getBriefingDocumentPutUrlAction,
  addBriefingDocumentAction,
  removeBriefingDocumentAction,
} from "./briefing-step2-actions";

export type BriefDoc = {
  id: string;
  source_type: "upload" | "url";
  storage_key: string | null;
  filename: string | null;
  url: string | null;
  size_bytes: number | null;
};

const ACCEPT_MIME =
  "application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp,image/gif";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export function Step2BriefColumn({
  projectId,
  documents,
  onAdded,
  onRemoved,
}: {
  projectId: string;
  documents: BriefDoc[];
  onAdded: (doc: BriefDoc) => void;
  onRemoved: (id: string) => void;
}) {
  const t = useTranslations("projects");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      const presign = await getBriefingDocumentPutUrlAction({
        projectId,
        kind: "brief",
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!presign.ok) {
        toast.error(t("briefing.step2.toast.upload_failed"));
        return;
      }
      const putRes = await fetch(presign.putUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) {
        toast.error(t("briefing.step2.toast.upload_failed"));
        return;
      }
      const insert = await addBriefingDocumentAction({
        projectId,
        kind: "brief",
        source_type: "upload",
        storage_key: presign.storageKey,
        filename: file.name,
        size_bytes: file.size,
        mime_type: file.type,
      });
      if (!insert.ok) {
        toast.error(t("briefing.step2.toast.add_failed"));
        return;
      }
      onAdded({
        id: insert.document.id,
        source_type: "upload",
        storage_key: insert.document.storage_key,
        filename: insert.document.filename,
        url: null,
        size_bytes: insert.document.size_bytes,
      });
    } catch (e) {
      console.error("[Step2BriefColumn] upload threw:", e);
      toast.error(t("briefing.step2.toast.upload_failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLinkAdd() {
    if (!linkValue.trim()) return;
    setLinkBusy(true);
    try {
      const insert = await addBriefingDocumentAction({
        projectId,
        kind: "brief",
        source_type: "url",
        url: linkValue.trim(),
      });
      if (!insert.ok) {
        toast.error(t("briefing.step2.toast.add_failed"));
        return;
      }
      onAdded({
        id: insert.document.id,
        source_type: "url",
        storage_key: null,
        filename: null,
        url: insert.document.url,
        size_bytes: null,
      });
      setLinkValue("");
      setLinkOpen(false);
    } finally {
      setLinkBusy(false);
    }
  }

  async function handleRemove(id: string) {
    const res = await removeBriefingDocumentAction({ documentId: id });
    if (!res.ok) {
      toast.error(t("briefing.step2.toast.remove_failed"));
      return;
    }
    onRemoved(id);
  }

  return (
    <section className="rounded-3xl border border-border/40 p-6 bg-background flex flex-col gap-5">
      <header>
        <h2 className="text-base font-semibold tracking-tight keep-all">
          {t("briefing.step2.sections.brief.title")}
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5 keep-all leading-relaxed">
          {t("briefing.step2.sections.brief.helper")}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="justify-start text-sm"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          {t("briefing.step2.sections.brief.upload_cta")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_MIME}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border/40" />
          <span>{t("briefing.step2.sections.brief.divider")}</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {linkOpen ? (
          <div className="flex flex-col gap-2">
            <Input
              type="url"
              autoFocus
              placeholder={t(
                "briefing.step2.sections.brief.link_input_placeholder",
              )}
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleLinkAdd();
                if (e.key === "Escape") {
                  setLinkOpen(false);
                  setLinkValue("");
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLinkOpen(false);
                  setLinkValue("");
                }}
              >
                {t("briefing.step2.sections.brief.link_cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleLinkAdd}
                disabled={linkBusy || !linkValue.trim()}
              >
                {linkBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("briefing.step2.sections.brief.link_add")
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLinkOpen(true)}
            className="justify-start text-sm"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            {t("briefing.step2.sections.brief.link_cta")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-2">
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground keep-all">
            {t("briefing.step2.sections.brief.list_empty")}
          </p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl",
                "border border-border/40 text-sm",
              )}
            >
              {doc.source_type === "upload" ? (
                <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
              ) : (
                <LinkIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate flex-1">
                {doc.filename ?? doc.url ?? "??}
              </span>
              {doc.size_bytes && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatSize(doc.size_bytes)}
                </span>
              )}
              <button
                type="button"
                onClick={() => void handleRemove(doc.id)}
                className="p-1 rounded hover:bg-muted transition-colors"
                aria-label="Remove"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}


 succeeded in 404ms:
"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 ??Step 2 center column (?덊띁?곗뒪 / reference docs)
//
// URL paste ??/api/oembed proxy ??addBriefingDocumentAction. Each row
// displays thumbnail (when available) + URL + category chip + memo
// textarea + delete X. Memo and category mutate via
// updateBriefingDocumentNoteAction (1s debounce on memo).
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Link as LinkIcon, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addBriefingDocumentAction,
  removeBriefingDocumentAction,
  updateBriefingDocumentNoteAction,
} from "./briefing-step2-actions";

export type ReferenceDoc = {
  id: string;
  url: string | null;
  provider: string | null;
  thumbnail_url: string | null;
  note: string | null;
  category: "mood" | "composition" | "pacing" | "general" | string | null;
};

const CATEGORY_OPTIONS = ["mood", "composition", "pacing", "general"] as const;

export function Step2ReferenceColumn({
  projectId,
  documents,
  onAdded,
  onRemoved,
  onUpdated,
}: {
  projectId: string;
  documents: ReferenceDoc[];
  onAdded: (doc: ReferenceDoc) => void;
  onRemoved: (id: string) => void;
  onUpdated: (id: string, patch: Partial<ReferenceDoc>) => void;
}) {
  const t = useTranslations("projects");
  const [urlValue, setUrlValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      let provider:
        | "youtube"
        | "vimeo"
        | "instagram"
        | "generic"
        | undefined;
      let thumbnail_url: string | undefined;

      try {
        const res = await fetch(
          `/api/oembed?url=${encodeURIComponent(trimmed)}`,
          { signal: AbortSignal.timeout(8_000) },
        );
        if (res.ok) {
          const meta = (await res.json()) as {
            provider?: typeof provider;
            thumbnail_url?: string | null;
          };
          provider = meta.provider;
          thumbnail_url = meta.thumbnail_url ?? undefined;
        }
      } catch {
        // oembed failure is non-fatal ??store the URL with no thumbnail
      }

      const insert = await addBriefingDocumentAction({
        projectId,
        kind: "reference",
        source_type: "url",
        url: trimmed,
        provider,
        thumbnail_url,
        category: "general",
      });
      if (!insert.ok) {
        toast.error(t("briefing.step2.toast.add_failed"));
        return;
      }
      onAdded({
        id: insert.document.id,
        url: insert.document.url,
        provider: insert.document.provider,
        thumbnail_url: insert.document.thumbnail_url,
        note: insert.document.note,
        category: insert.document.category,
      });
      setUrlValue("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    const res = await removeBriefingDocumentAction({ documentId: id });
    if (!res.ok) {
      toast.error(t("briefing.step2.toast.remove_failed"));
      return;
    }
    onRemoved(id);
  }

  return (
    <section className="rounded-3xl border border-border/40 p-6 bg-background flex flex-col gap-5">
      <header>
        <h2 className="text-base font-semibold tracking-tight keep-all">
          {t("briefing.step2.sections.reference.title")}
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5 keep-all leading-relaxed">
          {t("briefing.step2.sections.reference.helper")}
        </p>
      </header>

      <div className="flex gap-2">
        <Input
          type="url"
          placeholder={t(
            "briefing.step2.sections.reference.url_input_placeholder",
          )}
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={busy || !urlValue.trim()}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("briefing.step2.sections.reference.add_cta")
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground keep-all">
            {t("briefing.step2.sections.reference.list_empty")}
          </p>
        ) : (
          documents.map((doc) => (
            <ReferenceRow
              key={doc.id}
              doc={doc}
              onUpdated={(patch) => onUpdated(doc.id, patch)}
              onRemove={() => void handleRemove(doc.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ReferenceRow({
  doc,
  onUpdated,
  onRemove,
}: {
  doc: ReferenceDoc;
  onUpdated: (patch: Partial<ReferenceDoc>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("projects");
  const [noteValue, setNoteValue] = useState(doc.note ?? "");
  const [category, setCategory] = useState<string>(doc.category ?? "general");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1s debounce on note text. Category change persists immediately.
  useEffect(() => {
    if (noteValue === (doc.note ?? "")) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await updateBriefingDocumentNoteAction({
        documentId: doc.id,
        note: noteValue || null,
      });
      if (res.ok) onUpdated({ note: noteValue || null });
    }, 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onUpdated is unstable
  }, [noteValue, doc.id, doc.note]);

  async function handleCategoryChange(next: string) {
    setCategory(next);
    const res = await updateBriefingDocumentNoteAction({
      documentId: doc.id,
      category: next as "mood" | "composition" | "pacing" | "general",
    });
    if (res.ok) onUpdated({ category: next });
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/40">
      <div className="flex items-start gap-3">
        {doc.thumbnail_url ? (
          <div className="w-20 h-14 shrink-0 rounded-lg overflow-hidden relative bg-muted">
            <Image
              src={doc.thumbnail_url}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-20 h-14 shrink-0 rounded-lg bg-muted flex items-center justify-center">
            <LinkIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <a
            href={doc.url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground truncate hover:underline underline-offset-4"
          >
            {doc.url}
          </a>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((opt) => {
              const selected = category === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => void handleCategoryChange(opt)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                    selected
                      ? "bg-foreground text-background"
                      : "border border-border/60 hover:border-border",
                  )}
                >
                  {t(
                    `briefing.step2.sections.reference.categories.${opt}` as Parameters<
                      typeof t
                    >[0],
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded hover:bg-muted transition-colors shrink-0"
          aria-label="Remove"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <Textarea
        value={noteValue}
        onChange={(e) => setNoteValue(e.target.value)}
        placeholder={t(
          "briefing.step2.sections.reference.note_placeholder",
        )}
        rows={2}
        className="resize-none text-xs"
      />
    </div>
  );
}


 succeeded in 404ms:
"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 ??Step 2 right column (?뷀뀒??sidebar + autosave)
//
// 12 sidebar fields, all optional. Local form state debounces 5 seconds
// then commits via updateProjectMetadataAction. Visible status indicator
// in the sticky CTA bar lives in the parent orchestrator (this component
// reports state via the onAutosaveState callback).
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateProjectMetadataAction } from "./briefing-step2-actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOOD_OPTIONS = [
  "emotional",
  "sophisticated",
  "humorous",
  "dynamic",
  "minimal",
  "warm",
  "luxurious",
  "trendy",
  "friendly",
] as const;

const CHANNEL_OPTIONS = [
  "instagram",
  "youtube",
  "tiktok",
  "facebook",
  "website",
  "offline",
  "other",
] as const;

const VISUAL_RATIO_OPTIONS = [
  "1_1",
  "16_9",
  "9_16",
  "4_5",
  "239_1",
  "custom",
] as const;

const HAS_PLAN_OPTIONS = ["have", "want_proposal", "undecided"] as const;
const BUDGET_OPTIONS = [
  "under_1m",
  "1m_to_5m",
  "5m_to_10m",
  "negotiable",
] as const;

// ---------------------------------------------------------------------------
// Form state shape
// ---------------------------------------------------------------------------

export type SidebarFormData = {
  mood_keywords: string[];
  mood_keywords_free: string;
  visual_ratio: string;
  visual_ratio_custom: string;
  channels: string[];
  has_plan: "have" | "want_proposal" | "undecided" | "";
  target_audience: string;
  additional_notes: string;
  budget_band: "under_1m" | "1m_to_5m" | "5m_to_10m" | "negotiable" | "";
  target_delivery_at: string;
  meeting_preferred_at: string;
  interested_in_twin: boolean;
};

export type AutosaveState = "idle" | "saving" | "saved" | "error";

// ---------------------------------------------------------------------------
// Multi-select chip
// ---------------------------------------------------------------------------

function ChipMulti({
  options,
  value,
  onChange,
  labelOf,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  labelOf: (opt: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() =>
              onChange(
                selected
                  ? value.filter((v) => v !== opt)
                  : [...value, opt],
              )
            }
            aria-pressed={selected}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
              selected
                ? "bg-foreground text-background"
                : "border border-border/60 hover:border-border",
            )}
          >
            {labelOf(opt)}
          </button>
        );
      })}
    </div>
  );
}

function ChipSingle({
  options,
  value,
  onChange,
  labelOf,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  labelOf: (opt: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(selected ? "" : opt)}
            aria-pressed={selected}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
              selected
                ? "bg-foreground text-background"
                : "border border-border/60 hover:border-border",
            )}
          >
            {labelOf(opt)}
          </button>
        );
      })}
    </div>
  );
}

function FieldBlock({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label className="text-sm font-semibold tracking-tight keep-all">
          {title}
        </Label>
        {helper && (
          <p className="text-xs text-muted-foreground mt-1 keep-all leading-relaxed">
            {helper}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

export function Step2Sidebar({
  projectId,
  initial,
  onAutosaveState,
}: {
  projectId: string;
  initial: SidebarFormData;
  onAutosaveState: (state: AutosaveState, savedAt?: string) => void;
}) {
  const t = useTranslations("projects");
  const [form, setForm] = useState<SidebarFormData>(initial);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef<string>(JSON.stringify(initial));
  const abortRef = useRef<AbortController | null>(null);

  // Autosave: 5s debounce after each form change. Skip if value matches
  // the last successful commit (prevents idle re-saves).
  useEffect(() => {
    const serialized = JSON.stringify(form);
    if (serialized === lastCommittedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // Cancel any in-flight save before issuing the new one.
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      onAutosaveState("saving");
      const res = await updateProjectMetadataAction({
        projectId,
        mood_keywords: form.mood_keywords,
        mood_keywords_free: form.mood_keywords_free || null,
        visual_ratio: form.visual_ratio || null,
        visual_ratio_custom: form.visual_ratio_custom || null,
        channels: form.channels,
        has_plan: form.has_plan || null,
        target_audience: form.target_audience || null,
        additional_notes: form.additional_notes || null,
        budget_band: form.budget_band || null,
        target_delivery_at: form.target_delivery_at || null,
        meeting_preferred_at:
          form.meeting_preferred_at && form.meeting_preferred_at !== ""
            ? new Date(form.meeting_preferred_at).toISOString()
            : null,
        interested_in_twin: form.interested_in_twin,
      });
      if (ac.signal.aborted) return;
      if (res.ok) {
        lastCommittedRef.current = serialized;
        onAutosaveState("saved", res.savedAt);
      } else {
        onAutosaveState("error");
      }
    }, 5_000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onAutosaveState is parent-stable
  }, [form, projectId]);

  // Convenience setters
  const set = <K extends keyof SidebarFormData>(
    key: K,
    value: SidebarFormData[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <aside className="rounded-3xl border border-border/40 p-6 bg-background flex flex-col gap-6">
      <header>
        <h2 className="text-base font-semibold tracking-tight keep-all">
          {t("briefing.step2.sections.detail.title")}
        </h2>
      </header>

      <FieldBlock
        title={t("briefing.step2.sections.detail.mood.label")}
        helper={t("briefing.step2.sections.detail.mood.helper")}
      >
        <ChipMulti
          options={MOOD_OPTIONS}
          value={form.mood_keywords}
          onChange={(v) => set("mood_keywords", v)}
          labelOf={(k) =>
            t(
              `briefing.step2.sections.detail.mood.options.${k}` as Parameters<
                typeof t
              >[0],
            )
          }
        />
        <Input
          value={form.mood_keywords_free}
          onChange={(e) => set("mood_keywords_free", e.target.value)}
          placeholder={t(
            "briefing.step2.sections.detail.mood.free_input_placeholder",
          )}
          className="text-sm"
        />
      </FieldBlock>

      <FieldBlock title={t("briefing.step2.sections.detail.visual_ratio.label")}>
        <ChipSingle
          options={VISUAL_RATIO_OPTIONS}
          value={form.visual_ratio}
          onChange={(v) => set("visual_ratio", v)}
          labelOf={(k) =>
            t(
              `briefing.step2.sections.detail.visual_ratio.options.${k}` as Parameters<
                typeof t
              >[0],
            )
          }
        />
        {form.visual_ratio === "custom" && (
          <Input
            value={form.visual_ratio_custom}
            onChange={(e) => set("visual_ratio_custom", e.target.value)}
            placeholder={t(
              "briefing.step2.sections.detail.visual_ratio.custom_placeholder",
            )}
            className="text-sm max-w-xs"
          />
        )}
      </FieldBlock>

      <FieldBlock
        title={t("briefing.step2.sections.detail.channels.label")}
        helper={t("briefing.step2.sections.detail.channels.helper")}
      >
        <ChipMulti
          options={CHANNEL_OPTIONS}
          value={form.channels}
          onChange={(v) => set("channels", v)}
          labelOf={(k) =>
            t(
              `briefing.step2.sections.detail.channels.options.${k}` as Parameters<
                typeof t
              >[0],
            )
          }
        />
      </FieldBlock>

      <FieldBlock title={t("briefing.step2.sections.detail.has_plan.label")}>
        <RadioGroup
          value={form.has_plan}
          onValueChange={(v) =>
            set("has_plan", v as SidebarFormData["has_plan"])
          }
          className="flex flex-col gap-2"
        >
          {HAS_PLAN_OPTIONS.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={`has-plan-${opt}`} />
              <Label
                htmlFor={`has-plan-${opt}`}
                className="text-sm font-normal cursor-pointer keep-all"
              >
                {t(
                  `briefing.step2.sections.detail.has_plan.options.${opt}` as Parameters<
                    typeof t
                  >[0],
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </FieldBlock>

      <FieldBlock title={t("briefing.step2.sections.detail.target.label")}>
        <Textarea
          value={form.target_audience}
          onChange={(e) => set("target_audience", e.target.value)}
          placeholder={t(
            "briefing.step2.sections.detail.target.placeholder",
          )}
          rows={3}
          className="resize-none text-sm"
        />
      </FieldBlock>

      <FieldBlock title={t("briefing.step2.sections.detail.more.label")}>
        <Textarea
          value={form.additional_notes}
          onChange={(e) => set("additional_notes", e.target.value)}
          placeholder={t(
            "briefing.step2.sections.detail.more.placeholder",
          )}
          rows={4}
          className="resize-none text-sm"
        />
      </FieldBlock>

      <div className="h-px bg-border/40" />

      <FieldBlock title={t("briefing.step2.sections.detail.budget.label")}>
        <ChipSingle
          options={BUDGET_OPTIONS}
          value={form.budget_band}
          onChange={(v) =>
            set("budget_band", v as SidebarFormData["budget_band"])
          }
          labelOf={(k) =>
            t(
              `briefing.step2.sections.detail.budget.options.${k}` as Parameters<
                typeof t
              >[0],
            )
          }
        />
      </FieldBlock>

      <FieldBlock title={t("briefing.step2.sections.detail.delivery_date.label")}>
        <Input
          type="date"
          value={form.target_delivery_at}
          onChange={(e) => set("target_delivery_at", e.target.value)}
          className="text-sm max-w-xs"
        />
      </FieldBlock>

      <FieldBlock
        title={t("briefing.step2.sections.detail.meeting_at.label")}
        helper={t("briefing.step2.sections.detail.meeting_at.helper")}
      >
        <Input
          type="datetime-local"
          value={form.meeting_preferred_at}
          onChange={(e) => set("meeting_preferred_at", e.target.value)}
          className="text-sm max-w-xs"
        />
      </FieldBlock>

      <div
        className={cn(
          "rounded-2xl p-4 flex items-start gap-3",
          form.interested_in_twin
            ? "bg-emerald-50 border border-emerald-200"
            : "border border-border/40",
        )}
      >
        <input
          type="checkbox"
          id="twin-toggle"
          checked={form.interested_in_twin}
          onChange={(e) => set("interested_in_twin", e.target.checked)}
          className="mt-1"
        />
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="twin-toggle"
            className="text-sm font-semibold cursor-pointer keep-all"
          >
            {t("briefing.step2.sections.detail.twin_toggle.label")}
          </Label>
          <p className="text-xs text-muted-foreground keep-all leading-relaxed">
            {t("briefing.step2.sections.detail.twin_toggle.helper")}
          </p>
        </div>
      </div>
    </aside>
  );
}


 succeeded in 426ms:
import { S3Client } from "@aws-sdk/client-s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[r2] missing env ${name}`);
  return v;
}

export const BUCKET =
  process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "yagi-challenge-submissions";

// Lazy singleton ??instantiated on first real use. Non-upload paths
// (e.g., sitemap.ts) don't need this and shouldn't crash if creds missing.
let _client: S3Client | null = null;
function getClient(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: requireEnv("CLOUDFLARE_R2_ENDPOINT"),
    credentials: {
      accessKeyId: requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    },
    // Defensive against AWS SDK v3 (>=3.729.0) auto-injecting
    // x-amz-checksum-crc32 + x-amz-sdk-checksum-algorithm headers/query on
    // PUT operations. When those land in a presigned URL, the browser-side
    // PUT signature mismatches what R2 verifies. Current SDK at 3.1035 + this
    // flag together emit a clean URL (verified: SignedHeaders=host only, no
    // checksum bits). The middleware below is belt-and-suspenders for future
    // SDK bumps.
    // Refs:
    //   https://github.com/aws/aws-sdk-js-v3/issues/6810
    //   https://github.com/aws/aws-sdk-js-v3/issues/6920
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  // Belt-and-suspenders: strip any flexible-checksum artifacts at the build
  // stage BEFORE getSignedUrl signs the request. Currently a no-op at SDK
  // 3.1035 with the config above, but protects against SDK upgrades that
  // re-introduce auto-injection.
  _client.middlewareStack.add(
    (next) => async (args) => {
      const req = args.request as {
        headers?: Record<string, string>;
        query?: Record<string, string | string[]>;
      };
      if (req.headers) {
        for (const k of Object.keys(req.headers)) {
          const lk = k.toLowerCase();
          if (
            lk === "x-amz-sdk-checksum-algorithm" ||
            lk.startsWith("x-amz-checksum-")
          ) {
            delete req.headers[k];
          }
        }
      }
      if (req.query) {
        for (const k of Object.keys(req.query)) {
          const lk = k.toLowerCase();
          if (
            lk === "x-amz-sdk-checksum-algorithm" ||
            lk.startsWith("x-amz-checksum-")
          ) {
            delete req.query[k];
          }
        }
      }
      return next(args);
    },
    { step: "build", name: "stripChecksumHeaders", priority: "high" }
  );

  return _client;
}

/**
 * Generate a presigned PUT URL for uploading an object.
 * Default expiry 3600s (1h) ??enough for large video uploads.
 * Path convention (caller's responsibility):
 *   tmp/<challenge_id>/<client_uuid>/<filename>   (pre-confirm)
 *   submissions/<challenge_id>/<submission_id>/<filename>  (post-atomic move)
 */
export async function createPresignedPutUrl(
  key: string,
  contentType: string,
  expiresSeconds = 3600
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
}

/**
 * Public URL for serving an uploaded object.
 * Uses the R2 endpoint directly. If CLOUDFLARE_R2_PUBLIC_BASE is set
 * in the future, prefer that for custom-domain serving.
 */
export function objectPublicUrl(key: string): string {
  const base =
    process.env.CLOUDFLARE_R2_PUBLIC_BASE ??
    `${requireEnv("CLOUDFLARE_R2_ENDPOINT")}/${BUCKET}`;
  return `${base}/${key}`;
}

/**
 * Re-export the SDK client getter for advanced ops (CopyObject, HeadObject, DeleteObject).
 * Server actions in src/app/challenges/[slug]/submit/actions.ts will use this for the
 * tmp/ ??submissions/ atomic move + upload verification.
 */
export { getClient as getR2Client };

// =============================================================================
// Phase 2.8 ??Brief Board asset bucket helpers
// =============================================================================
// Per SPEC 짠3.3 brief assets live in an existing R2 bucket under a new
// `project-briefs/<project_id>/<uuid>.<ext>` prefix. SPEC says zero new
// dependencies and reuse Phase 1.x SDK integration ??the BRIEF_BUCKET
// constant defaults to `yagi-commission-files` (the per-Q-059 commission/
// project-files bucket) and is overridable via env for future separation.
//
// Note: presigned URLs are generated server-side; the client uploads the
// blob directly to R2 via the returned URL. Direct browser ??R2 PUT keeps
// large files off our server.

export const BRIEF_BUCKET =
  process.env.CLOUDFLARE_R2_BRIEF_BUCKET ?? "yagi-commission-files";

/**
 * Public URL for a BRIEF_BUCKET object. Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix:
 * the legacy `objectPublicUrl` builds a URL based on `BUCKET` (the challenge
 * submissions bucket), but brief assets are written to `BRIEF_BUCKET`. When
 * `CLOUDFLARE_R2_PUBLIC_BASE` is set (the Phase 3.1 prereq), it overrides
 * regardless and is expected to point at the brief bucket's public URL. When
 * unset, this helper at least targets the correct bucket via the R2 endpoint.
 */
export function briefObjectPublicUrl(key: string): string {
  const base =
    process.env.CLOUDFLARE_R2_PUBLIC_BASE ??
    `${requireEnv("CLOUDFLARE_R2_ENDPOINT")}/${BRIEF_BUCKET}`;
  return `${base}/${key}`;
}

/**
 * Generate a presigned PUT URL for a brief asset upload.
 * Default expiry 600s ??uploads are debounced one-shot, not long-lived.
 */
export async function createBriefAssetPutUrl(
  storageKey: string,
  contentType: string,
  expiresSeconds = 600
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: BRIEF_BUCKET,
    Key: storageKey,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
}

/**
 * Generate a presigned GET URL for a brief asset download / inline render.
 * 1h expiry covers a typical edit session; the editor refreshes URLs lazily
 * on remount, so users with very long sessions just refetch on next mount.
 */
export async function createBriefAssetGetUrl(
  storageKey: string,
  expiresSeconds = 3600
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: BRIEF_BUCKET,
    Key: storageKey,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
}


2026-05-04T08:01:58.874304Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
Get-Content : Cannot find path 'src/lib/oembed.ts' because it does not exist.
At line:2 char:1
+ Get-Content -LiteralPath 'src/lib/oembed.ts' -Raw
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (src/lib/oembed.ts:String) [Get-Content], ItemNotFoundException
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.GetContentCommand
 

 exited 1 in 474ms:
Get-Content : Cannot find path 'src/lib/oembed.ts' because it does not exist.
At line:2 char:1
+ Get-Content -LiteralPath 'src/lib/oembed.ts' -Raw
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (src/lib/oembed.ts:String) [Get-Content], ItemNotFoundException
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.GetContentCommand
 

codex
The first likely security issue is in the SSRF claim itself: the code validates DNS before fetch, but the actual `fetch()` still reconnects by hostname and performs its own lookup. I’m checking the surrounding lines and whether any other in-scope path reaches arbitrary server-side fetch.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg --files | rg 'oembed|briefing_documents|20260504162550|workspace_members|projects'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/api/oembed/route.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-step2-actions.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 414ms:
   1: // =============================================================================
   2: // Phase 5 Wave B task_05 v3 ??oembed proxy with SSRF guards
   3: //
   4: // Briefing Canvas Step 2 reference column posts a URL ??this endpoint
   5: // returns { provider, thumbnail_url?, oembed_html?, title? } for client
   6: // rendering. The endpoint is the only server-side fetcher of arbitrary
   7: // URLs, so it is the SSRF surface this Wave introduces.
   8: //
   9: // SSRF protection:
  10: //   1. http(s) scheme only ??file://, data://, gopher:// rejected.
  11: //   2. Hostname ??IP resolve. Reject private (RFC1918), loopback,
  12: //      link-local, ULA (fc00::/7), multicast, and metadata service
  13: //      addresses (169.254.169.254). Resolution happens BEFORE fetch
  14: //      so DNS rebinding has no opening between the resolve and the
  15: //      socket.
  16: //   3. AbortSignal.timeout(5000) hard cap.
  17: //   4. Response size cap (5 MB), enforced via streaming reader so a
  18: //      malicious server can't OOM us with a giant response.
  19: //   5. Manual redirect handling ??re-validate the redirect target IP
  20: //      before following.
  21: //
  22: // Provider detection:
  23: //   - YouTube + Vimeo  ??reuse `lib/oembed.fetchVideoMetadata` (cached).
  24: //   - Instagram        ??return raw URL, no oEmbed (Meta API key
  25: //                         requirement makes this a separate phase).
  26: //   - Generic          ??SSRF-safe fetch + OG-meta parse (og:title,
  27: //                         og:image, og:description).
  28: // =============================================================================
  29: 
  30: import { NextRequest, NextResponse } from "next/server";
  31: import { lookup as dnsLookup } from "node:dns/promises";
  32: import net from "node:net";
  33: import { fetchVideoMetadata } from "@/lib/oembed";
  34: 
  35: // ---------------------------------------------------------------------------
  36: // Constants
  37: // ---------------------------------------------------------------------------
  38: 
  39: const FETCH_TIMEOUT_MS = 5_000;
  40: const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
  41: const MAX_REDIRECTS = 3;
  42: 
  43: const YOUTUBE_RE = /(?:^|\.)(?:youtube\.com|youtu\.be)$/i;
  44: const VIMEO_RE = /(?:^|\.)vimeo\.com$/i;
  45: const INSTAGRAM_RE = /(?:^|\.)(?:instagram\.com|cdninstagram\.com)$/i;
  46: 
  47: // ---------------------------------------------------------------------------
  48: // SSRF helpers
  49: // ---------------------------------------------------------------------------
  50: 
  51: function isPrivateIPv4(ip: string): boolean {
  52:   const parts = ip.split(".").map(Number);
  53:   if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  54:   const [a, b] = parts;
  55:   if (a === 10) return true;
  56:   if (a === 127) return true;
  57:   if (a === 0) return true;
  58:   if (a === 169 && b === 254) return true; // link-local + AWS metadata
  59:   if (a === 172 && b >= 16 && b <= 31) return true;
  60:   if (a === 192 && b === 168) return true;
  61:   if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  62:   if (a >= 224) return true; // multicast / reserved
  63:   return false;
  64: }
  65: 
  66: function isPrivateIPv6(ip: string): boolean {
  67:   const lower = ip.toLowerCase();
  68:   if (lower === "::1" || lower === "::") return true;
  69:   // ULA: fc00::/7 ??first byte 0xfc or 0xfd
  70:   if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  71:   // link-local: fe80::/10
  72:   if (lower.startsWith("fe8") || lower.startsWith("fe9") ||
  73:       lower.startsWith("fea") || lower.startsWith("feb")) {
  74:     return true;
  75:   }
  76:   // multicast: ff00::/8
  77:   if (lower.startsWith("ff")) return true;
  78:   // IPv4-mapped (::ffff:0:0/96) ??apply IPv4 rules to the v4 portion
  79:   if (lower.startsWith("::ffff:")) {
  80:     const v4 = lower.slice(7);
  81:     if (net.isIPv4(v4)) return isPrivateIPv4(v4);
  82:   }
  83:   return false;
  84: }
  85: 
  86: async function assertSafeUrl(rawUrl: string): Promise<URL> {
  87:   let parsed: URL;
  88:   try {
  89:     parsed = new URL(rawUrl);
  90:   } catch {
  91:     throw new Error("invalid URL");
  92:   }
  93:   if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
  94:     throw new Error("scheme must be http(s)");
  95:   }
  96:   if (!parsed.hostname) throw new Error("missing hostname");
  97: 
  98:   // Reject hostname strings that smell like internal-only.
  99:   const host = parsed.hostname.toLowerCase();
 100:   if (
 101:     host === "localhost" ||
 102:     host.endsWith(".localhost") ||
 103:     host.endsWith(".local") ||
 104:     host.endsWith(".internal")
 105:   ) {
 106:     throw new Error("internal hostname rejected");
 107:   }
 108: 
 109:   // Resolve and reject private IPs. Default DNS lookup honours OS hosts
 110:   // file; on local dev this prevents `host /etc/hosts ??127.0.0.1` mappings
 111:   // from sneaking through.
 112:   if (net.isIP(host)) {
 113:     if (net.isIPv4(host) && isPrivateIPv4(host)) {
 114:       throw new Error("private IPv4 rejected");
 115:     }
 116:     if (net.isIPv6(host) && isPrivateIPv6(host)) {
 117:       throw new Error("private IPv6 rejected");
 118:     }
 119:     return parsed;
 120:   }
 121: 
 122:   const records = await dnsLookup(host, { all: true, verbatim: true });
 123:   for (const r of records) {
 124:     if (r.family === 4 && isPrivateIPv4(r.address)) {
 125:       throw new Error("private IPv4 resolved");
 126:     }
 127:     if (r.family === 6 && isPrivateIPv6(r.address)) {
 128:       throw new Error("private IPv6 resolved");
 129:     }
 130:   }
 131:   return parsed;
 132: }
 133: 
 134: async function safeFetchHtml(rawUrl: string): Promise<string | null> {
 135:   let current = rawUrl;
 136:   for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
 137:     const validated = await assertSafeUrl(current);
 138:     let res: Response;
 139:     try {
 140:       res = await fetch(validated.toString(), {
 141:         redirect: "manual",
 142:         signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
 143:         headers: {
 144:           "User-Agent": "YagiWorkshop/1.0 (briefing oembed proxy)",
 145:           Accept: "text/html,application/xhtml+xml",
 146:         },
 147:       });
 148:     } catch {
 149:       return null;
 150:     }
 151: 
 152:     if (res.status >= 300 && res.status < 400) {
 153:       const loc = res.headers.get("location");
 154:       if (!loc) return null;
 155:       current = new URL(loc, validated).toString();
 156:       continue;
 157:     }
 158:     if (!res.ok) return null;
 159: 
 160:     const ct = (res.headers.get("content-type") ?? "").toLowerCase();
 161:     if (!ct.startsWith("text/html") && !ct.startsWith("application/xhtml")) {
 162:       return null;
 163:     }
 164:     const cl = Number(res.headers.get("content-length") ?? "0");
 165:     if (cl > MAX_RESPONSE_BYTES) return null;
 166: 
 167:     // Stream-cap the body so a server lying about Content-Length can't
 168:     // OOM us. Read up to MAX_RESPONSE_BYTES then abort.
 169:     if (!res.body) return null;
 170:     const reader = res.body.getReader();
 171:     const chunks: Uint8Array[] = [];
 172:     let total = 0;
 173:     while (true) {
 174:       const { value, done } = await reader.read();
 175:       if (done) break;
 176:       total += value.byteLength;
 177:       if (total > MAX_RESPONSE_BYTES) {
 178:         await reader.cancel();
 179:         return null;
 180:       }
 181:       chunks.push(value);
 182:     }
 183:     const buf = new Uint8Array(total);
 184:     let offset = 0;
 185:     for (const c of chunks) {
 186:       buf.set(c, offset);
 187:       offset += c.byteLength;
 188:     }
 189:     return new TextDecoder("utf-8").decode(buf);
 190:   }
 191:   return null;
 192: }
 193: 
 194: // ---------------------------------------------------------------------------
 195: // OG meta parser
 196: // ---------------------------------------------------------------------------
 197: 
 198: function decodeHtmlEntities(s: string): string {
 199:   return s
 200:     .replace(/&amp;/g, "&")
 201:     .replace(/&lt;/g, "<")
 202:     .replace(/&gt;/g, ">")
 203:     .replace(/&quot;/g, '"')
 204:     .replace(/&#39;/g, "'")
 205:     .replace(/&#x2F;/g, "/");
 206: }
 207: 
 208: function parseMeta(html: string, prop: string): string | null {
 209:   // Match <meta property="og:image" content="..."> or content-first variant.
 210:   const re = new RegExp(
 211:     `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
 212:     "i",
 213:   );
 214:   const m = html.match(re);
 215:   if (m) return decodeHtmlEntities(m[1]);
 216:   const reAlt = new RegExp(
 217:     `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
 218:     "i",
 219:   );
 220:   const m2 = html.match(reAlt);
 221:   return m2 ? decodeHtmlEntities(m2[1]) : null;
 222: }
 223: 
 224: // ---------------------------------------------------------------------------
 225: // GET handler
 226: // ---------------------------------------------------------------------------
 227: 
 228: type OembedResult = {
 229:   provider: "youtube" | "vimeo" | "instagram" | "generic";
 230:   thumbnail_url: string | null;
 231:   oembed_html: string | null;
 232:   title: string | null;
 233: };
 234: 
 235: export async function GET(request: NextRequest) {
 236:   const { searchParams } = new URL(request.url);
 237:   const rawUrl = searchParams.get("url");
 238:   if (!rawUrl || rawUrl.length === 0 || rawUrl.length > 2000) {
 239:     return NextResponse.json(
 240:       { error: "missing or invalid url" },
 241:       { status: 400 },
 242:     );
 243:   }
 244: 
 245:   let parsed: URL;
 246:   try {
 247:     parsed = await assertSafeUrl(rawUrl);
 248:   } catch {
 249:     return NextResponse.json(
 250:       { error: "url rejected" },
 251:       { status: 400 },
 252:     );
 253:   }
 254:   const host = parsed.hostname.toLowerCase();
 255: 
 256:   // YouTube + Vimeo ??reuse the cached oembed library. fetchVideoMetadata
 257:   // hits the provider's official oembed endpoint, which is trusted.
 258:   if (YOUTUBE_RE.test(host) || VIMEO_RE.test(host)) {
 259:     try {
 260:       const meta = await fetchVideoMetadata(parsed.toString());
 261:       if (meta) {
 262:         const result: OembedResult = {
 263:           provider: meta.provider,
 264:           thumbnail_url: meta.thumbnailUrl,
 265:           oembed_html: null,
 266:           title: meta.title,
 267:         };
 268:         return NextResponse.json(result);
 269:       }
 270:     } catch {
 271:       // fall through to generic metadata fail
 272:     }
 273:     return NextResponse.json(
 274:       {
 275:         provider: YOUTUBE_RE.test(host) ? "youtube" : "vimeo",
 276:         thumbnail_url: null,
 277:         oembed_html: null,
 278:         title: null,
 279:       } satisfies OembedResult,
 280:     );
 281:   }
 282: 
 283:   // Instagram ??Meta requires API key for oEmbed; for now return the bare
 284:   // provider tag so the client renders the URL with no thumbnail.
 285:   if (INSTAGRAM_RE.test(host)) {
 286:     return NextResponse.json(
 287:       {
 288:         provider: "instagram",
 289:         thumbnail_url: null,
 290:         oembed_html: null,
 291:         title: null,
 292:       } satisfies OembedResult,
 293:     );
 294:   }
 295: 
 296:   // Generic ??SSRF-safe fetch + OG meta parse.
 297:   const html = await safeFetchHtml(parsed.toString());
 298:   if (!html) {
 299:     return NextResponse.json(
 300:       {
 301:         provider: "generic",
 302:         thumbnail_url: null,
 303:         oembed_html: null,
 304:         title: null,
 305:       } satisfies OembedResult,
 306:     );
 307:   }
 308:   const ogTitle = parseMeta(html, "og:title");
 309:   const ogImage = parseMeta(html, "og:image");
 310:   return NextResponse.json(
 311:     {
 312:       provider: "generic",
 313:       thumbnail_url: ogImage,
 314:       oembed_html: null,
 315:       title: ogTitle,
 316:     } satisfies OembedResult,
 317:   );
 318: }

 succeeded in 424ms:
   1: "use client";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave B task_05 v3 ??Step 2 right column (?뷀뀒??sidebar + autosave)
   5: //
   6: // 12 sidebar fields, all optional. Local form state debounces 5 seconds
   7: // then commits via updateProjectMetadataAction. Visible status indicator
   8: // in the sticky CTA bar lives in the parent orchestrator (this component
   9: // reports state via the onAutosaveState callback).
  10: // =============================================================================
  11: 
  12: import { useState, useEffect, useRef } from "react";
  13: import { useTranslations } from "next-intl";
  14: import { cn } from "@/lib/utils";
  15: import { Input } from "@/components/ui/input";
  16: import { Label } from "@/components/ui/label";
  17: import { Textarea } from "@/components/ui/textarea";
  18: import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
  19: import { updateProjectMetadataAction } from "./briefing-step2-actions";
  20: 
  21: // ---------------------------------------------------------------------------
  22: // Constants
  23: // ---------------------------------------------------------------------------
  24: 
  25: const MOOD_OPTIONS = [
  26:   "emotional",
  27:   "sophisticated",
  28:   "humorous",
  29:   "dynamic",
  30:   "minimal",
  31:   "warm",
  32:   "luxurious",
  33:   "trendy",
  34:   "friendly",
  35: ] as const;
  36: 
  37: const CHANNEL_OPTIONS = [
  38:   "instagram",
  39:   "youtube",
  40:   "tiktok",
  41:   "facebook",
  42:   "website",
  43:   "offline",
  44:   "other",
  45: ] as const;
  46: 
  47: const VISUAL_RATIO_OPTIONS = [
  48:   "1_1",
  49:   "16_9",
  50:   "9_16",
  51:   "4_5",
  52:   "239_1",
  53:   "custom",
  54: ] as const;
  55: 
  56: const HAS_PLAN_OPTIONS = ["have", "want_proposal", "undecided"] as const;
  57: const BUDGET_OPTIONS = [
  58:   "under_1m",
  59:   "1m_to_5m",
  60:   "5m_to_10m",
  61:   "negotiable",
  62: ] as const;
  63: 
  64: // ---------------------------------------------------------------------------
  65: // Form state shape
  66: // ---------------------------------------------------------------------------
  67: 
  68: export type SidebarFormData = {
  69:   mood_keywords: string[];
  70:   mood_keywords_free: string;
  71:   visual_ratio: string;
  72:   visual_ratio_custom: string;
  73:   channels: string[];
  74:   has_plan: "have" | "want_proposal" | "undecided" | "";
  75:   target_audience: string;
  76:   additional_notes: string;
  77:   budget_band: "under_1m" | "1m_to_5m" | "5m_to_10m" | "negotiable" | "";
  78:   target_delivery_at: string;
  79:   meeting_preferred_at: string;
  80:   interested_in_twin: boolean;
  81: };
  82: 
  83: export type AutosaveState = "idle" | "saving" | "saved" | "error";
  84: 
  85: // ---------------------------------------------------------------------------
  86: // Multi-select chip
  87: // ---------------------------------------------------------------------------
  88: 
  89: function ChipMulti({
  90:   options,
  91:   value,
  92:   onChange,
  93:   labelOf,
  94: }: {
  95:   options: readonly string[];
  96:   value: string[];
  97:   onChange: (next: string[]) => void;
  98:   labelOf: (opt: string) => string;
  99: }) {
 100:   return (
 101:     <div className="flex flex-wrap gap-1.5">
 102:       {options.map((opt) => {
 103:         const selected = value.includes(opt);
 104:         return (
 105:           <button
 106:             key={opt}
 107:             type="button"
 108:             onClick={() =>
 109:               onChange(
 110:                 selected
 111:                   ? value.filter((v) => v !== opt)
 112:                   : [...value, opt],
 113:               )
 114:             }
 115:             aria-pressed={selected}
 116:             className={cn(
 117:               "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
 118:               selected
 119:                 ? "bg-foreground text-background"
 120:                 : "border border-border/60 hover:border-border",
 121:             )}
 122:           >
 123:             {labelOf(opt)}
 124:           </button>
 125:         );
 126:       })}
 127:     </div>
 128:   );
 129: }
 130: 
 131: function ChipSingle({
 132:   options,
 133:   value,
 134:   onChange,
 135:   labelOf,
 136: }: {
 137:   options: readonly string[];
 138:   value: string;
 139:   onChange: (next: string) => void;
 140:   labelOf: (opt: string) => string;
 141: }) {
 142:   return (
 143:     <div className="flex flex-wrap gap-1.5">
 144:       {options.map((opt) => {
 145:         const selected = value === opt;
 146:         return (
 147:           <button
 148:             key={opt}
 149:             type="button"
 150:             onClick={() => onChange(selected ? "" : opt)}
 151:             aria-pressed={selected}
 152:             className={cn(
 153:               "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
 154:               selected
 155:                 ? "bg-foreground text-background"
 156:                 : "border border-border/60 hover:border-border",
 157:             )}
 158:           >
 159:             {labelOf(opt)}
 160:           </button>
 161:         );
 162:       })}
 163:     </div>
 164:   );
 165: }
 166: 
 167: function FieldBlock({
 168:   title,
 169:   helper,
 170:   children,
 171: }: {
 172:   title: string;
 173:   helper?: string;
 174:   children: React.ReactNode;
 175: }) {
 176:   return (
 177:     <div className="flex flex-col gap-3">
 178:       <div>
 179:         <Label className="text-sm font-semibold tracking-tight keep-all">
 180:           {title}
 181:         </Label>
 182:         {helper && (
 183:           <p className="text-xs text-muted-foreground mt-1 keep-all leading-relaxed">
 184:             {helper}
 185:           </p>
 186:         )}
 187:       </div>
 188:       {children}
 189:     </div>
 190:   );
 191: }
 192: 
 193: // ---------------------------------------------------------------------------
 194: // Sidebar component
 195: // ---------------------------------------------------------------------------
 196: 
 197: export function Step2Sidebar({
 198:   projectId,
 199:   initial,
 200:   onAutosaveState,
 201: }: {
 202:   projectId: string;
 203:   initial: SidebarFormData;
 204:   onAutosaveState: (state: AutosaveState, savedAt?: string) => void;
 205: }) {
 206:   const t = useTranslations("projects");
 207:   const [form, setForm] = useState<SidebarFormData>(initial);
 208:   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 209:   const lastCommittedRef = useRef<string>(JSON.stringify(initial));
 210:   const abortRef = useRef<AbortController | null>(null);
 211: 
 212:   // Autosave: 5s debounce after each form change. Skip if value matches
 213:   // the last successful commit (prevents idle re-saves).
 214:   useEffect(() => {
 215:     const serialized = JSON.stringify(form);
 216:     if (serialized === lastCommittedRef.current) return;
 217: 
 218:     if (debounceRef.current) clearTimeout(debounceRef.current);
 219:     debounceRef.current = setTimeout(async () => {
 220:       // Cancel any in-flight save before issuing the new one.
 221:       abortRef.current?.abort();
 222:       const ac = new AbortController();
 223:       abortRef.current = ac;
 224: 
 225:       onAutosaveState("saving");
 226:       const res = await updateProjectMetadataAction({
 227:         projectId,
 228:         mood_keywords: form.mood_keywords,
 229:         mood_keywords_free: form.mood_keywords_free || null,
 230:         visual_ratio: form.visual_ratio || null,
 231:         visual_ratio_custom: form.visual_ratio_custom || null,
 232:         channels: form.channels,
 233:         has_plan: form.has_plan || null,
 234:         target_audience: form.target_audience || null,
 235:         additional_notes: form.additional_notes || null,
 236:         budget_band: form.budget_band || null,
 237:         target_delivery_at: form.target_delivery_at || null,
 238:         meeting_preferred_at:
 239:           form.meeting_preferred_at && form.meeting_preferred_at !== ""
 240:             ? new Date(form.meeting_preferred_at).toISOString()
 241:             : null,
 242:         interested_in_twin: form.interested_in_twin,
 243:       });
 244:       if (ac.signal.aborted) return;
 245:       if (res.ok) {
 246:         lastCommittedRef.current = serialized;
 247:         onAutosaveState("saved", res.savedAt);
 248:       } else {
 249:         onAutosaveState("error");
 250:       }
 251:     }, 5_000);
 252: 
 253:     return () => {
 254:       if (debounceRef.current) clearTimeout(debounceRef.current);
 255:     };
 256:     // eslint-disable-next-line react-hooks/exhaustive-deps -- onAutosaveState is parent-stable
 257:   }, [form, projectId]);
 258: 
 259:   // Convenience setters
 260:   const set = <K extends keyof SidebarFormData>(
 261:     key: K,
 262:     value: SidebarFormData[K],
 263:   ) => setForm((f) => ({ ...f, [key]: value }));
 264: 
 265:   return (
 266:     <aside className="rounded-3xl border border-border/40 p-6 bg-background flex flex-col gap-6">
 267:       <header>
 268:         <h2 className="text-base font-semibold tracking-tight keep-all">
 269:           {t("briefing.step2.sections.detail.title")}
 270:         </h2>
 271:       </header>
 272: 
 273:       <FieldBlock
 274:         title={t("briefing.step2.sections.detail.mood.label")}
 275:         helper={t("briefing.step2.sections.detail.mood.helper")}
 276:       >
 277:         <ChipMulti
 278:           options={MOOD_OPTIONS}
 279:           value={form.mood_keywords}
 280:           onChange={(v) => set("mood_keywords", v)}
 281:           labelOf={(k) =>
 282:             t(
 283:               `briefing.step2.sections.detail.mood.options.${k}` as Parameters<
 284:                 typeof t
 285:               >[0],
 286:             )
 287:           }
 288:         />
 289:         <Input
 290:           value={form.mood_keywords_free}
 291:           onChange={(e) => set("mood_keywords_free", e.target.value)}
 292:           placeholder={t(
 293:             "briefing.step2.sections.detail.mood.free_input_placeholder",
 294:           )}
 295:           className="text-sm"
 296:         />
 297:       </FieldBlock>
 298: 
 299:       <FieldBlock title={t("briefing.step2.sections.detail.visual_ratio.label")}>
 300:         <ChipSingle
 301:           options={VISUAL_RATIO_OPTIONS}
 302:           value={form.visual_ratio}
 303:           onChange={(v) => set("visual_ratio", v)}
 304:           labelOf={(k) =>
 305:             t(
 306:               `briefing.step2.sections.detail.visual_ratio.options.${k}` as Parameters<
 307:                 typeof t
 308:               >[0],
 309:             )
 310:           }
 311:         />
 312:         {form.visual_ratio === "custom" && (
 313:           <Input
 314:             value={form.visual_ratio_custom}
 315:             onChange={(e) => set("visual_ratio_custom", e.target.value)}
 316:             placeholder={t(
 317:               "briefing.step2.sections.detail.visual_ratio.custom_placeholder",
 318:             )}
 319:             className="text-sm max-w-xs"
 320:           />
 321:         )}
 322:       </FieldBlock>
 323: 
 324:       <FieldBlock
 325:         title={t("briefing.step2.sections.detail.channels.label")}
 326:         helper={t("briefing.step2.sections.detail.channels.helper")}
 327:       >
 328:         <ChipMulti
 329:           options={CHANNEL_OPTIONS}
 330:           value={form.channels}
 331:           onChange={(v) => set("channels", v)}
 332:           labelOf={(k) =>
 333:             t(
 334:               `briefing.step2.sections.detail.channels.options.${k}` as Parameters<
 335:                 typeof t
 336:               >[0],
 337:             )
 338:           }
 339:         />
 340:       </FieldBlock>
 341: 
 342:       <FieldBlock title={t("briefing.step2.sections.detail.has_plan.label")}>
 343:         <RadioGroup
 344:           value={form.has_plan}
 345:           onValueChange={(v) =>
 346:             set("has_plan", v as SidebarFormData["has_plan"])
 347:           }
 348:           className="flex flex-col gap-2"
 349:         >
 350:           {HAS_PLAN_OPTIONS.map((opt) => (
 351:             <div key={opt} className="flex items-center gap-2">
 352:               <RadioGroupItem value={opt} id={`has-plan-${opt}`} />
 353:               <Label
 354:                 htmlFor={`has-plan-${opt}`}
 355:                 className="text-sm font-normal cursor-pointer keep-all"
 356:               >
 357:                 {t(
 358:                   `briefing.step2.sections.detail.has_plan.options.${opt}` as Parameters<
 359:                     typeof t
 360:                   >[0],
 361:                 )}
 362:               </Label>
 363:             </div>
 364:           ))}
 365:         </RadioGroup>
 366:       </FieldBlock>
 367: 
 368:       <FieldBlock title={t("briefing.step2.sections.detail.target.label")}>
 369:         <Textarea
 370:           value={form.target_audience}
 371:           onChange={(e) => set("target_audience", e.target.value)}
 372:           placeholder={t(
 373:             "briefing.step2.sections.detail.target.placeholder",
 374:           )}
 375:           rows={3}
 376:           className="resize-none text-sm"
 377:         />
 378:       </FieldBlock>
 379: 
 380:       <FieldBlock title={t("briefing.step2.sections.detail.more.label")}>
 381:         <Textarea
 382:           value={form.additional_notes}
 383:           onChange={(e) => set("additional_notes", e.target.value)}
 384:           placeholder={t(
 385:             "briefing.step2.sections.detail.more.placeholder",
 386:           )}
 387:           rows={4}
 388:           className="resize-none text-sm"
 389:         />
 390:       </FieldBlock>
 391: 
 392:       <div className="h-px bg-border/40" />
 393: 
 394:       <FieldBlock title={t("briefing.step2.sections.detail.budget.label")}>
 395:         <ChipSingle
 396:           options={BUDGET_OPTIONS}
 397:           value={form.budget_band}
 398:           onChange={(v) =>
 399:             set("budget_band", v as SidebarFormData["budget_band"])
 400:           }
 401:           labelOf={(k) =>
 402:             t(
 403:               `briefing.step2.sections.detail.budget.options.${k}` as Parameters<
 404:                 typeof t
 405:               >[0],
 406:             )
 407:           }
 408:         />
 409:       </FieldBlock>
 410: 
 411:       <FieldBlock title={t("briefing.step2.sections.detail.delivery_date.label")}>
 412:         <Input
 413:           type="date"
 414:           value={form.target_delivery_at}
 415:           onChange={(e) => set("target_delivery_at", e.target.value)}
 416:           className="text-sm max-w-xs"
 417:         />
 418:       </FieldBlock>
 419: 
 420:       <FieldBlock
 421:         title={t("briefing.step2.sections.detail.meeting_at.label")}
 422:         helper={t("briefing.step2.sections.detail.meeting_at.helper")}
 423:       >
 424:         <Input
 425:           type="datetime-local"
 426:           value={form.meeting_preferred_at}
 427:           onChange={(e) => set("meeting_preferred_at", e.target.value)}
 428:           className="text-sm max-w-xs"
 429:         />
 430:       </FieldBlock>
 431: 
 432:       <div
 433:         className={cn(
 434:           "rounded-2xl p-4 flex items-start gap-3",
 435:           form.interested_in_twin
 436:             ? "bg-emerald-50 border border-emerald-200"
 437:             : "border border-border/40",
 438:         )}
 439:       >
 440:         <input
 441:           type="checkbox"
 442:           id="twin-toggle"
 443:           checked={form.interested_in_twin}
 444:           onChange={(e) => set("interested_in_twin", e.target.checked)}
 445:           className="mt-1"
 446:         />
 447:         <div className="flex flex-col gap-1">
 448:           <Label
 449:             htmlFor="twin-toggle"
 450:             className="text-sm font-semibold cursor-pointer keep-all"
 451:           >
 452:             {t("briefing.step2.sections.detail.twin_toggle.label")}
 453:           </Label>
 454:           <p className="text-xs text-muted-foreground keep-all leading-relaxed">
 455:             {t("briefing.step2.sections.detail.twin_toggle.helper")}
 456:           </p>
 457:         </div>
 458:       </div>
 459:     </aside>
 460:   );
 461: }

 succeeded in 427ms:
   1: "use server";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave B task_05 v3 ??Step 2 workspace server actions
   5: //
   6: // Split from briefing-actions.ts to keep file sizes managable. The Step 1
   7: // transition action (ensureBriefingDraftProject) stays in briefing-actions.ts;
   8: // every Step 2 read/write surface lives here.
   9: //
  10: // 5 actions:
  11: //   - getBriefingDocumentPutUrlAction(input)    ??R2 presigned PUT (upload only)
  12: //   - addBriefingDocumentAction(input)          ??INSERT briefing_documents
  13: //   - removeBriefingDocumentAction(input)       ??DELETE briefing_documents
  14: //   - updateBriefingDocumentNoteAction(input)   ??UPDATE note + category only
  15: //   - updateProjectMetadataAction(input)        ??autosave 12 sidebar fields
  16: //
  17: // Authorization model ??Phase 4.x sub_03f_5 F4 pattern reused, plus the
  18: // briefing_documents column-grant lockdown landed in Wave A sub_4 F3:
  19: //   1. createSupabaseServer (user-scoped)
  20: //   2. resolveActiveWorkspace for active workspace id
  21: //   3. explicit project ownership + workspace-membership re-verify before
  22: //      any write, even though RLS already gates row scope
  23: //   4. status='draft' guard on every Step 2 write (no metadata changes
  24: //      after the project transitions to in_review)
  25: //   5. storage_key prefix bound to auth.uid() in the presign AND re-validated
  26: //      on INSERT (sub_03f_5 F2 pattern)
  27: //   6. UPDATE only writes (note, category) per Wave A sub_4 F3 column grant ??//      anything else fails at the privilege layer regardless of payload
  28: // =============================================================================
  29: 
  30: import { z } from "zod";
  31: import { revalidatePath } from "next/cache";
  32: import { createSupabaseServer } from "@/lib/supabase/server";
  33: import { resolveActiveWorkspace } from "@/lib/workspace/active";
  34: import {
  35:   createBriefAssetPutUrl,
  36:   briefObjectPublicUrl,
  37: } from "@/lib/r2/client";
  38: 
  39: // ---------------------------------------------------------------------------
  40: // Shared constants + helpers
  41: // ---------------------------------------------------------------------------
  42: 
  43: const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  44:   "application/pdf",
  45:   "application/vnd.ms-powerpoint",
  46:   "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  47:   "image/jpeg",
  48:   "image/png",
  49:   "image/webp",
  50:   "image/gif",
  51: ]);
  52: 
  53: const EXT_FOR_CONTENT_TYPE: Record<string, string> = {
  54:   "application/pdf": "pdf",
  55:   "application/vnd.ms-powerpoint": "ppt",
  56:   "application/vnd.openxmlformats-officedocument.presentationml.presentation":
  57:     "pptx",
  58:   "image/jpeg": "jpg",
  59:   "image/png": "png",
  60:   "image/webp": "webp",
  61:   "image/gif": "gif",
  62: };
  63: 
  64: const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
  65: const URL_MAX_LEN = 2000;
  66: const KIND_VALUES = ["brief", "reference"] as const;
  67: const CATEGORY_VALUES = ["mood", "composition", "pacing", "general"] as const;
  68: 
  69: /**
  70:  * Verifies the caller is a current workspace_member of the project's
  71:  * workspace AND that the project is still in 'draft' state. Defense-
  72:  * in-depth ??RLS policies on briefing_documents + projects already
  73:  * gate row scope, but every Step 2 write re-runs this check at the
  74:  * action layer so a status transition or workspace removal between
  75:  * SELECT and INSERT/UPDATE doesn't slip through.
  76:  */
  77: async function assertProjectMutationAuth(projectId: string): Promise<
  78:   | {
  79:       ok: true;
  80:       userId: string;
  81:       workspaceId: string;
  82:       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  83:       sb: any;
  84:     }
  85:   | {
  86:       ok: false;
  87:       error:
  88:         | "unauthenticated"
  89:         | "no_workspace"
  90:         | "not_found"
  91:         | "forbidden";
  92:       message?: string;
  93:     }
  94: > {
  95:   const supabase = await createSupabaseServer();
  96:   const {
  97:     data: { user },
  98:     error: authErr,
  99:   } = await supabase.auth.getUser();
 100:   if (authErr || !user) return { ok: false, error: "unauthenticated" };
 101: 
 102:   const active = await resolveActiveWorkspace(user.id);
 103:   if (!active) return { ok: false, error: "no_workspace" };
 104: 
 105:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
 106:   const sb = supabase as any;
 107: 
 108:   const { data: project, error: selErr } = await sb
 109:     .from("projects")
 110:     .select("id, workspace_id, status, created_by")
 111:     .eq("id", projectId)
 112:     .maybeSingle();
 113:   if (selErr) {
 114:     console.error("[assertProjectMutationAuth] SELECT error:", selErr);
 115:     return { ok: false, error: "forbidden", message: selErr.message };
 116:   }
 117:   if (!project) return { ok: false, error: "not_found" };
 118:   if (project.workspace_id !== active.id) {
 119:     return { ok: false, error: "forbidden", message: "workspace mismatch" };
 120:   }
 121:   if (project.status !== "draft") {
 122:     return {
 123:       ok: false,
 124:       error: "forbidden",
 125:       message: "project is no longer draft",
 126:     };
 127:   }
 128: 
 129:   const { data: member } = await sb
 130:     .from("workspace_members")
 131:     .select("user_id")
 132:     .eq("workspace_id", project.workspace_id)
 133:     .eq("user_id", user.id)
 134:     .maybeSingle();
 135:   if (!member) {
 136:     return { ok: false, error: "forbidden", message: "not a workspace member" };
 137:   }
 138: 
 139:   return { ok: true, userId: user.id, workspaceId: project.workspace_id, sb };
 140: }
 141: 
 142: // ===========================================================================
 143: // 1. getBriefingDocumentPutUrlAction
 144: // ===========================================================================
 145: 
 146: const getPutUrlInput = z.object({
 147:   projectId: z.string().uuid(),
 148:   kind: z.enum(KIND_VALUES),
 149:   contentType: z.string().min(1).max(200),
 150:   sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
 151: });
 152: 
 153: export type GetPutUrlResult =
 154:   | { ok: true; putUrl: string; storageKey: string; publicUrl: string }
 155:   | {
 156:       ok: false;
 157:       error:
 158:         | "validation"
 159:         | "unauthenticated"
 160:         | "no_workspace"
 161:         | "not_found"
 162:         | "forbidden"
 163:         | "content_type_not_allowed"
 164:         | "presign_failed";
 165:       message?: string;
 166:     };
 167: 
 168: export async function getBriefingDocumentPutUrlAction(
 169:   input: unknown,
 170: ): Promise<GetPutUrlResult> {
 171:   const parsed = getPutUrlInput.safeParse(input);
 172:   if (!parsed.success) {
 173:     return { ok: false, error: "validation", message: parsed.error.message };
 174:   }
 175:   if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(parsed.data.contentType)) {
 176:     return { ok: false, error: "content_type_not_allowed" };
 177:   }
 178:   const auth = await assertProjectMutationAuth(parsed.data.projectId);
 179:   if (!auth.ok) return auth;
 180: 
 181:   const ext = EXT_FOR_CONTENT_TYPE[parsed.data.contentType] ?? "bin";
 182:   const uuid = crypto.randomUUID();
 183:   // sub_03f_5 F2 pattern reused ??caller-bound prefix + kind segment.
 184:   const storageKey = `briefing-docs/${auth.userId}/${parsed.data.kind}/${uuid}.${ext}`;
 185: 
 186:   try {
 187:     const putUrl = await createBriefAssetPutUrl(
 188:       storageKey,
 189:       parsed.data.contentType,
 190:       600,
 191:     );
 192:     return {
 193:       ok: true,
 194:       putUrl,
 195:       storageKey,
 196:       publicUrl: briefObjectPublicUrl(storageKey),
 197:     };
 198:   } catch (err) {
 199:     console.error("[getBriefingDocumentPutUrlAction] presign failed:", err);
 200:     return { ok: false, error: "presign_failed" };
 201:   }
 202: }
 203: 
 204: // ===========================================================================
 205: // 2. addBriefingDocumentAction
 206: // ===========================================================================
 207: 
 208: const addInput = z.discriminatedUnion("source_type", [
 209:   z.object({
 210:     projectId: z.string().uuid(),
 211:     kind: z.enum(KIND_VALUES),
 212:     source_type: z.literal("upload"),
 213:     storage_key: z.string().min(1).max(500),
 214:     filename: z.string().trim().min(1).max(200),
 215:     size_bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
 216:     mime_type: z.string().min(1).max(200),
 217:     note: z.string().trim().max(500).optional().nullable(),
 218:     category: z.enum(CATEGORY_VALUES).optional().nullable(),
 219:   }),
 220:   z.object({
 221:     projectId: z.string().uuid(),
 222:     kind: z.enum(KIND_VALUES),
 223:     source_type: z.literal("url"),
 224:     url: z
 225:       .string()
 226:       .min(1)
 227:       .max(URL_MAX_LEN)
 228:       .refine(
 229:         (u) => {
 230:           try {
 231:             const p = new URL(u);
 232:             return p.protocol === "http:" || p.protocol === "https:";
 233:           } catch {
 234:             return false;
 235:           }
 236:         },
 237:         { message: "url must be http:// or https://" },
 238:       ),
 239:     provider: z
 240:       .enum(["youtube", "vimeo", "instagram", "generic"])
 241:       .optional()
 242:       .nullable(),
 243:     thumbnail_url: z.string().max(URL_MAX_LEN).optional().nullable(),
 244:     oembed_html: z.string().max(20_000).optional().nullable(),
 245:     note: z.string().trim().max(500).optional().nullable(),
 246:     category: z.enum(CATEGORY_VALUES).optional().nullable(),
 247:   }),
 248: ]);
 249: 
 250: export type AddBriefingDocumentResult =
 251:   | {
 252:       ok: true;
 253:       document: {
 254:         id: string;
 255:         kind: "brief" | "reference";
 256:         source_type: "upload" | "url";
 257:         storage_key: string | null;
 258:         filename: string | null;
 259:         size_bytes: number | null;
 260:         mime_type: string | null;
 261:         url: string | null;
 262:         provider: string | null;
 263:         thumbnail_url: string | null;
 264:         oembed_html: string | null;
 265:         note: string | null;
 266:         category: string | null;
 267:         created_at: string;
 268:         created_by: string;
 269:       };
 270:     }
 271:   | {
 272:       ok: false;
 273:       error:
 274:         | "validation"
 275:         | "unauthenticated"
 276:         | "no_workspace"
 277:         | "not_found"
 278:         | "forbidden"
 279:         | "db";
 280:       message?: string;
 281:     };
 282: 
 283: export async function addBriefingDocumentAction(
 284:   input: unknown,
 285: ): Promise<AddBriefingDocumentResult> {
 286:   const parsed = addInput.safeParse(input);
 287:   if (!parsed.success) {
 288:     return { ok: false, error: "validation", message: parsed.error.message };
 289:   }
 290:   const data = parsed.data;
 291:   const auth = await assertProjectMutationAuth(data.projectId);
 292:   if (!auth.ok) return auth;
 293: 
 294:   // sub_03f_5 F2 ??re-validate caller-bound prefix on the storage_key.
 295:   if (data.source_type === "upload") {
 296:     const requiredPrefix = `briefing-docs/${auth.userId}/${data.kind}/`;
 297:     if (!data.storage_key.startsWith(requiredPrefix)) {
 298:       return {
 299:         ok: false,
 300:         error: "forbidden",
 301:         message: `storage_key prefix must be ${requiredPrefix}`,
 302:       };
 303:     }
 304:     if (data.storage_key.includes("..") || data.storage_key.startsWith("/")) {
 305:       return {
 306:         ok: false,
 307:         error: "forbidden",
 308:         message: "storage_key contains forbidden characters",
 309:       };
 310:     }
 311:   }
 312: 
 313:   // Reference-only category. KICKOFF v1.3 짠task_05 says category is
 314:   // meaningful only for kind='reference'; reject mismatched payloads
 315:   // explicitly so the UI doesn't silently swallow.
 316:   if (data.kind === "brief" && data.category) {
 317:     return {
 318:       ok: false,
 319:       error: "validation",
 320:       message: "category is meaningful only for kind='reference'",
 321:     };
 322:   }
 323: 
 324:   const insertPayload =
 325:     data.source_type === "upload"
 326:       ? {
 327:           project_id: data.projectId,
 328:           kind: data.kind,
 329:           source_type: "upload",
 330:           storage_key: data.storage_key,
 331:           filename: data.filename,
 332:           size_bytes: data.size_bytes,
 333:           mime_type: data.mime_type,
 334:           note: data.note ?? null,
 335:           category: data.category ?? null,
 336:           created_by: auth.userId,
 337:         }
 338:       : {
 339:           project_id: data.projectId,
 340:           kind: data.kind,
 341:           source_type: "url",
 342:           url: data.url,
 343:           provider: data.provider ?? "generic",
 344:           thumbnail_url: data.thumbnail_url ?? null,
 345:           oembed_html: data.oembed_html ?? null,
 346:           note: data.note ?? null,
 347:           category:
 348:             data.kind === "reference"
 349:               ? (data.category ?? "general")
 350:               : null,
 351:           created_by: auth.userId,
 352:         };
 353: 
 354:   const { data: inserted, error: insErr } = await auth.sb
 355:     .from("briefing_documents")
 356:     .insert(insertPayload)
 357:     .select(
 358:       "id, kind, source_type, storage_key, filename, size_bytes, mime_type, url, provider, thumbnail_url, oembed_html, note, category, created_at, created_by",
 359:     )
 360:     .single();
 361:   if (insErr || !inserted) {
 362:     console.error("[addBriefingDocumentAction] INSERT error:", insErr);
 363:     return {
 364:       ok: false,
 365:       error: "db",
 366:       message: insErr?.message ?? "insert failed",
 367:     };
 368:   }
 369: 
 370:   revalidatePath("/[locale]/app/projects/new", "page");
 371:   return { ok: true, document: inserted };
 372: }
 373: 
 374: // ===========================================================================
 375: // 3. removeBriefingDocumentAction
 376: // ===========================================================================
 377: 
 378: const removeInput = z.object({
 379:   documentId: z.string().uuid(),
 380: });
 381: 
 382: export type RemoveBriefingDocumentResult =
 383:   | { ok: true }
 384:   | {
 385:       ok: false;
 386:       error:
 387:         | "validation"
 388:         | "unauthenticated"
 389:         | "not_found"
 390:         | "forbidden"
 391:         | "db";
 392:       message?: string;
 393:     };
 394: 
 395: export async function removeBriefingDocumentAction(
 396:   input: unknown,
 397: ): Promise<RemoveBriefingDocumentResult> {
 398:   const parsed = removeInput.safeParse(input);
 399:   if (!parsed.success) {
 400:     return { ok: false, error: "validation", message: parsed.error.message };
 401:   }
 402: 
 403:   const supabase = await createSupabaseServer();
 404:   const {
 405:     data: { user },
 406:   } = await supabase.auth.getUser();
 407:   if (!user) return { ok: false, error: "unauthenticated" };
 408: 
 409:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
 410:   const sb = supabase as any;
 411: 
 412:   const { data: doc } = await sb
 413:     .from("briefing_documents")
 414:     .select("id, project_id, created_by")
 415:     .eq("id", parsed.data.documentId)
 416:     .maybeSingle();
 417:   if (!doc) return { ok: false, error: "not_found" };
 418:   if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };
 419: 
 420:   // RLS DELETE policy gates created_by + workspace member + status='draft'.
 421:   // The redundant eq filter on created_by is defense-in-depth.
 422:   const { error: delErr } = await sb
 423:     .from("briefing_documents")
 424:     .delete()
 425:     .eq("id", parsed.data.documentId)
 426:     .eq("created_by", user.id);
 427:   if (delErr) {
 428:     return { ok: false, error: "db", message: delErr.message };
 429:   }
 430: 
 431:   revalidatePath("/[locale]/app/projects/new", "page");
 432:   return { ok: true };
 433: }
 434: 
 435: // ===========================================================================
 436: // 4. updateBriefingDocumentNoteAction (note + category only)
 437: // ===========================================================================
 438: 
 439: const updateNoteInput = z.object({
 440:   documentId: z.string().uuid(),
 441:   note: z.string().trim().max(500).optional().nullable(),
 442:   category: z.enum(CATEGORY_VALUES).optional().nullable(),
 443: });
 444: 
 445: export type UpdateBriefingNoteResult =
 446:   | { ok: true }
 447:   | {
 448:       ok: false;
 449:       error:
 450:         | "validation"
 451:         | "unauthenticated"
 452:         | "not_found"
 453:         | "forbidden"
 454:         | "db";
 455:       message?: string;
 456:     };
 457: 
 458: export async function updateBriefingDocumentNoteAction(
 459:   input: unknown,
 460: ): Promise<UpdateBriefingNoteResult> {
 461:   const parsed = updateNoteInput.safeParse(input);
 462:   if (!parsed.success) {
 463:     return { ok: false, error: "validation", message: parsed.error.message };
 464:   }
 465: 
 466:   const supabase = await createSupabaseServer();
 467:   const {
 468:     data: { user },
 469:   } = await supabase.auth.getUser();
 470:   if (!user) return { ok: false, error: "unauthenticated" };
 471: 
 472:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
 473:   const sb = supabase as any;
 474: 
 475:   const { data: doc } = await sb
 476:     .from("briefing_documents")
 477:     .select("id, kind, created_by")
 478:     .eq("id", parsed.data.documentId)
 479:     .maybeSingle();
 480:   if (!doc) return { ok: false, error: "not_found" };
 481:   if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };
 482: 
 483:   if (doc.kind === "brief" && parsed.data.category != null) {
 484:     return {
 485:       ok: false,
 486:       error: "validation",
 487:       message: "category is meaningful only for kind='reference'",
 488:     };
 489:   }
 490: 
 491:   // sub_4 F3 column-grant lockdown means PostgREST UPDATE here can only
 492:   // touch (note, category). We construct a minimal payload to stay
 493:   // defensive in the action layer too.
 494:   const payload: { note?: string | null; category?: string | null } = {};
 495:   if (parsed.data.note !== undefined) payload.note = parsed.data.note;
 496:   if (parsed.data.category !== undefined)
 497:     payload.category = parsed.data.category;
 498:   if (Object.keys(payload).length === 0) {
 499:     return { ok: false, error: "validation", message: "no field to update" };
 500:   }
 501: 
 502:   const { error: updErr } = await sb
 503:     .from("briefing_documents")
 504:     .update(payload)
 505:     .eq("id", parsed.data.documentId)
 506:     .eq("created_by", user.id);
 507:   if (updErr) {
 508:     return { ok: false, error: "db", message: updErr.message };
 509:   }
 510: 
 511:   revalidatePath("/[locale]/app/projects/new", "page");
 512:   return { ok: true };
 513: }
 514: 
 515: // ===========================================================================
 516: // 5. updateProjectMetadataAction ??Step 2 sidebar autosave
 517: // ===========================================================================
 518: 
 519: const metadataInput = z.object({
 520:   projectId: z.string().uuid(),
 521:   // 12 sidebar fields per yagi-locked Schema Option A. All optional ??  // every field can stay blank through submit. undefined = "don't
 522:   // change", null = "clear to NULL".
 523:   mood_keywords: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
 524:   mood_keywords_free: z.string().trim().max(200).optional().nullable(),
 525:   visual_ratio: z.string().trim().max(60).optional().nullable(),
 526:   visual_ratio_custom: z.string().trim().max(60).optional().nullable(),
 527:   channels: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
 528:   has_plan: z
 529:     .enum(["have", "want_proposal", "undecided"])
 530:     .optional()
 531:     .nullable(),
 532:   target_audience: z.string().trim().max(500).optional().nullable(),
 533:   additional_notes: z.string().trim().max(2000).optional().nullable(),
 534:   budget_band: z
 535:     .enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"])
 536:     .optional()
 537:     .nullable(),
 538:   target_delivery_at: z.string().nullable().optional(),
 539:   meeting_preferred_at: z.string().datetime().nullable().optional(),
 540:   interested_in_twin: z.boolean().optional(),
 541: });
 542: 
 543: export type UpdateProjectMetadataResult =
 544:   | { ok: true; savedAt: string }
 545:   | {
 546:       ok: false;
 547:       error:
 548:         | "validation"
 549:         | "unauthenticated"
 550:         | "no_workspace"
 551:         | "not_found"
 552:         | "forbidden"
 553:         | "db";
 554:       message?: string;
 555:     };
 556: 
 557: export async function updateProjectMetadataAction(
 558:   input: unknown,
 559: ): Promise<UpdateProjectMetadataResult> {
 560:   const parsed = metadataInput.safeParse(input);
 561:   if (!parsed.success) {
 562:     return { ok: false, error: "validation", message: parsed.error.message };
 563:   }
 564:   const auth = await assertProjectMutationAuth(parsed.data.projectId);
 565:   if (!auth.ok) return auth;
 566: 
 567:   const payload: Record<string, unknown> = {};
 568:   const fields = [
 569:     "mood_keywords",
 570:     "mood_keywords_free",
 571:     "visual_ratio",
 572:     "visual_ratio_custom",
 573:     "channels",
 574:     "has_plan",
 575:     "target_audience",
 576:     "additional_notes",
 577:     "budget_band",
 578:     "target_delivery_at",
 579:     "meeting_preferred_at",
 580:     "interested_in_twin",
 581:   ] as const;
 582:   for (const f of fields) {
 583:     const v = parsed.data[f];
 584:     if (v !== undefined) payload[f] = v;
 585:   }
 586:   if (Object.keys(payload).length === 0) {
 587:     return { ok: false, error: "validation", message: "no field to update" };
 588:   }
 589: 
 590:   const { error: updErr } = await auth.sb
 591:     .from("projects")
 592:     .update(payload)
 593:     .eq("id", parsed.data.projectId)
 594:     .eq("status", "draft");
 595:   if (updErr) {
 596:     console.error("[updateProjectMetadataAction] UPDATE error:", updErr);
 597:     return { ok: false, error: "db", message: updErr.message };
 598:   }
 599: 
 600:   // No revalidatePath on autosave ??the user is mid-edit and a
 601:   // server-component refresh would visually thrash. Revalidation runs
 602:   // on Step 2 ??Step 3 transition.
 603:   return { ok: true, savedAt: new Date().toISOString() };
 604: }

 succeeded in 522ms:
supabase\migrations\20260504162550_phase_5_briefing_canvas_metadata_columns.sql
supabase\migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql
supabase\migrations\20260504052541_phase_5_briefing_documents.sql
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql
src\emails\projects\project_submitted_client.tsx
src\emails\projects\project_submitted_admin.tsx
src\emails\projects\project_revision_requested.tsx
src\emails\projects\project_in_progress.tsx
src\emails\projects\project_delivered.tsx
src\emails\projects\project_cancelled.tsx
src\emails\projects\project_approved.tsx
src\lib\oembed\index.ts
src\components\projects\wizard\summary-card.tsx
src\components\projects\wizard\reference-board.tsx
src\components\projects\status-timeline.tsx
src\components\projects\status-badge.tsx
src\components\projects\projects-hub-workflow-strip.tsx
src\components\projects\projects-hub-hero.tsx
src\components\projects\projects-hub-cta-banner.tsx
src\components\projects\project-list-card.tsx
src\components\projects\project-actions.ts
src\components\projects\project-action-buttons.tsx
src\components\projects\interactive-visual-stack.tsx
src\components\projects\admin-delete-button.tsx
src\app\api\oembed\route.ts
src\components\projects\action-modals\revision-request-modal.tsx
src\components\projects\action-modals\cancel-modal.tsx
src\components\projects\action-modals\approval-modal.tsx
src\app\[locale]\app\projects\[id]\thread-actions.ts
src\app\[locale]\app\projects\[id]\ref-actions.ts
src\app\[locale]\app\projects\[id]\page.tsx
src\app\[locale]\app\projects\[id]\brief\actions.ts
src\app\[locale]\app\projects\[id]\board-actions.ts
src\app\[locale]\app\projects\[id]\actions.ts
src\app\[locale]\app\projects\page.tsx
src\components\admin\projects-queue.tsx
src\app\[locale]\app\projects\new\briefing-canvas-step-1.tsx
src\app\[locale]\app\projects\new\briefing-actions.ts
src\app\[locale]\app\projects\new\actions.ts
src\app\[locale]\app\projects\new\briefing-canvas-step-2-brief.tsx
src\app\[locale]\app\projects\new\briefing-canvas-step-2-reference.tsx
src\app\[locale]\app\projects\new\page.tsx
src\app\[locale]\app\projects\new\new-project-wizard.tsx
src\app\[locale]\app\projects\new\briefing-step2-actions.ts
src\app\[locale]\app\projects\new\briefing-canvas.tsx
src\app\[locale]\app\projects\new\briefing-canvas-step-2.tsx
src\app\[locale]\app\projects\new\briefing-canvas-step-2-sidebar.tsx
src\app\[locale]\app\admin\projects\page.tsx
src\app\[locale]\app\admin\projects\[id]\page.tsx

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-canvas-step-2-reference.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/oembed/index.ts' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504052541_phase_5_briefing_documents.sql' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504053641_phase_5_migrate_attached_to_briefing_documents.sql' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504162550_phase_5_briefing_canvas_metadata_columns.sql' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 406ms:
// =============================================================================
// Phase 3.0 ??oEmbed client with caching
//
// Supports YouTube + Vimeo only. Never throws ??returns null on any error.
// Cache: @vercel/kv if env vars present, else module-scoped Map fallback.
// Cache key: oembed:v1:<sha256(url)> ??hashed to avoid PII leak from query params.
// TTL: 30 days.
// =============================================================================

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OEmbedResult = {
  provider: "youtube" | "vimeo";
  title: string;
  thumbnailUrl: string;
  durationSeconds?: number;
};

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

type CacheEntry = {
  value: OEmbedResult | null;
  expiresAt: number;
};

// Module-scoped fallback cache (in-memory Map). Shared across requests within
// the same server process lifetime. On access we evict expired entries lazily.
const _mapCache = new Map<string, CacheEntry>();

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function cacheKey(url: string): string {
  return `oembed:v1:${createHash("sha256").update(url).digest("hex")}`;
}

// @vercel/kv type shim ??used only if the package is present at runtime.
// We avoid a hard import so the module doesn't fail when kv isn't installed.
type KvClient = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
};

async function tryGetKvClient(): Promise<KvClient | null> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- optional dep not in package.json
    const mod = await (Function('return import("@vercel/kv")')() as Promise<any>);
    return (mod.kv as KvClient) ?? null;
  } catch {
    return null;
  }
}

async function cacheGet(key: string): Promise<OEmbedResult | null | undefined> {
  const kv = await tryGetKvClient();
  if (kv) {
    try {
      const stored = await kv.get<OEmbedResult | null>(key);
      if (stored !== undefined) return stored;
    } catch {
      // kv read failure ??fall through to map cache
    }
  }

  // Map fallback
  const entry = _mapCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    _mapCache.delete(key);
    return undefined;
  }
  return entry.value;
}

async function cacheSet(key: string, value: OEmbedResult | null): Promise<void> {
  const kv = await tryGetKvClient();
  if (kv) {
    try {
      const ttlSeconds = Math.floor(TTL_MS / 1000);
      await kv.set(key, value, { ex: ttlSeconds });
      return;
    } catch {
      // fall through to map cache
    }
  }

  // Map fallback ??also prune stale entries on write (keep memory bounded)
  if (_mapCache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of _mapCache) {
      if (now > v.expiresAt) _mapCache.delete(k);
    }
  }
  _mapCache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

const YOUTUBE_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;
const VIMEO_RE = /^(https?:\/\/)?(www\.)?vimeo\.com\//;

// ---------------------------------------------------------------------------
// oEmbed fetch helpers
// ---------------------------------------------------------------------------

type RawYouTubeOEmbed = {
  title?: string;
  thumbnail_url?: string;
  // YouTube does not include duration in the oEmbed response
};

type RawVimeoOEmbed = {
  title?: string;
  thumbnail_url?: string;
  duration?: number; // seconds
};

async function fetchYouTube(url: string): Promise<OEmbedResult | null> {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(3000),
    headers: { "User-Agent": "YagiWorkshop/1.0" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as RawYouTubeOEmbed;
  if (!json.title || !json.thumbnail_url) return null;
  return {
    provider: "youtube",
    title: json.title,
    thumbnailUrl: json.thumbnail_url,
    // durationSeconds not available from YouTube oEmbed
  };
}

async function fetchVimeo(url: string): Promise<OEmbedResult | null> {
  const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(3000),
    headers: { "User-Agent": "YagiWorkshop/1.0" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as RawVimeoOEmbed;
  if (!json.title || !json.thumbnail_url) return null;
  return {
    provider: "vimeo",
    title: json.title,
    thumbnailUrl: json.thumbnail_url,
    durationSeconds: typeof json.duration === "number" ? json.duration : undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch video metadata via oEmbed for a YouTube or Vimeo URL.
 *
 * - Returns null for unsupported providers, network errors, timeouts, or
 *   malformed responses. Never throws.
 * - Results are cached for 30 days using @vercel/kv (if env vars are set)
 *   or a module-scoped Map.
 */
export async function fetchVideoMetadata(
  url: string,
): Promise<OEmbedResult | null> {
  // Validate it looks like a URL before doing anything
  let normalised: string;
  try {
    normalised = new URL(url).href;
  } catch {
    return null;
  }

  const isYouTube = YOUTUBE_RE.test(normalised);
  const isVimeo = VIMEO_RE.test(normalised);
  if (!isYouTube && !isVimeo) return null;

  const key = cacheKey(normalised);

  try {
    const cached = await cacheGet(key);
    if (cached !== undefined) return cached;
  } catch {
    // cache read failure ??continue to live fetch
  }

  try {
    const result = isYouTube
      ? await fetchYouTube(normalised)
      : await fetchVimeo(normalised);

    try {
      await cacheSet(key, result);
    } catch {
      // cache write failure ??non-fatal
    }

    return result;
  } catch {
    // network error, timeout, JSON parse error ??all return null per spec
    return null;
  }
}


 succeeded in 390ms:
-- Phase 5 Wave A task_01 + sub_4 patch ??briefing_documents table for the
-- new Briefing Canvas paradigm (replaces the project_boards.attached_pdfs/urls
-- jsonb pattern). Schema + 4 RLS policies + column-grant lockdown. Data
-- migration from the legacy jsonb columns lands in task_02.
--
-- Wave A K-05 LOOP 1 verdict (Tier 1 high) layered patches:
--   F1 (HIGH-B): INSERT policy now requires (a) the caller is a current
--       workspace_member of the project's workspace AND (b) the row's
--       created_by equals auth.uid() ??both via WITH CHECK.
--   F2 (HIGH-B): UPDATE + DELETE policies now require the caller is a
--       current workspace_member of the project's workspace; an
--       ex-member who originally created the row no longer retains
--       mutation rights after being removed from the workspace.
--   F3 (MED-B): table-level UPDATE revoked from authenticated; only
--       (note, category) re-granted because those are the only
--       client-editable fields after first INSERT. created_at /
--       created_by / project_id / kind / source_type / storage_key /
--       url / etc. flow through the action layer (or service-role)
--       and stay immutable from PostgREST. has_table_privilege +
--       has_column_privilege assertions in the DO block at the bottom
--       lock the privilege state in.
-- (workspace_members.role enum is `'admin' | 'member'` ??see Phase 2.0
--  baseline line 1825. KICKOFF spec said `'owner' | 'admin'`; that's
--  fixed here to use the actual enum, with `'admin'` as the elevated
--  role and any member can write to projects they belong to.)

-- briefing_documents ??Phase 5 ?좉퇋 ?뚯씠釉?-- 遺꾨━: 湲고쉷??(?섎ː?먭? 吏곸젒 留뚮뱺 ?먮즺) vs ?덊띁?곗뒪 (?몃? 李멸퀬 ?먮즺)
CREATE TABLE briefing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- 遺꾨쪟: 湲고쉷??vs ?덊띁?곗뒪
  kind text NOT NULL CHECK (kind IN ('brief', 'reference')),
  -- ?먮즺 source
  source_type text NOT NULL CHECK (source_type IN ('upload', 'url')),
  -- upload (PDF, image ??
  storage_key text,
  filename text,
  size_bytes bigint,
  mime_type text,
  -- url (?곸긽/?ъ씠???덊띁?곗뒪)
  url text,
  provider text,  -- 'youtube' / 'vimeo' / 'instagram' / 'generic'
  thumbnail_url text,
  oembed_html text,
  -- ?섎ː??硫붾え + 遺꾨쪟 (reference 留??섎?)
  note text,
  category text CHECK (category IS NULL OR category IN ('mood', 'composition', 'pacing', 'general')),
  -- meta
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  -- source_type 蹂?required field 媛뺤젣
  CONSTRAINT briefing_documents_source_check CHECK (
    (source_type = 'upload' AND storage_key IS NOT NULL AND filename IS NOT NULL) OR
    (source_type = 'url' AND url IS NOT NULL)
  )
);

CREATE INDEX idx_briefing_documents_project_kind ON briefing_documents(project_id, kind);
CREATE INDEX idx_briefing_documents_created ON briefing_documents(created_at DESC);

-- RLS ??project ??workspace member 留?access
ALTER TABLE briefing_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: project ??workspace member ?먮뒗 yagi_admin
CREATE POLICY "briefing_documents_select" ON briefing_documents
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- INSERT: caller MUST be a current workspace_member of the project's
-- workspace AND created_by MUST equal auth.uid() (no spoof). yagi_admin
-- bypass for support/migration paths.
-- (sub_4 F1 fix ??KICKOFF v1.2 spec was scoped only via projects.created_by,
--  which left an ex-member with project ownership able to keep inserting.)
CREATE POLICY "briefing_documents_insert" ON briefing_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      created_by = auth.uid()
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- UPDATE: caller MUST be a current workspace_member of the project's
-- workspace AND own the row AND be inside the 24h authoring window.
-- yagi_admin bypass.
-- (sub_4 F2 fix ??without the workspace_members predicate an ex-member
--  could still mutate a row they originally inserted.)
-- created_at immutability is enforced at the column-grant level below
-- (REVOKE UPDATE + selective GRANT excludes created_at) so the 24h
-- window cannot be extended via PostgREST UPDATE.
CREATE POLICY "briefing_documents_update" ON briefing_documents
  FOR UPDATE TO authenticated
  USING (
    (
      created_by = auth.uid()
      AND created_at > now() - interval '24 hours'
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  )
  WITH CHECK (
    (
      created_by = auth.uid()
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- DELETE: caller MUST be a current workspace_member of the project's
-- workspace AND own the row AND the project must still be in 'draft'.
-- yagi_admin not granted DELETE here (admin destructive action goes
-- through service-role / RPC explicitly).
-- (sub_4 F2 fix ??same workspace-membership predicate added.)
CREATE POLICY "briefing_documents_delete" ON briefing_documents
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    AND project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
        AND p.status = 'draft'
    )
  );

-- ============================================================
-- sub_4 F3 ??Column-level grant lockdown.
--
-- Mirrors the Phase 4.x sub_03f_2 pattern that was applied to
-- project_boards. authenticated keeps SELECT + INSERT + DELETE at
-- table-level (RLS gates row scope), but UPDATE is REVOKE'd at the
-- table level and re-granted only on the two columns the action
-- layer is intended to mutate after first INSERT ??`note` and
-- `category`. Everything else (created_at, created_by, project_id,
-- kind, source_type, storage_key, filename, size_bytes, mime_type,
-- url, provider, thumbnail_url, oembed_html) stays untouchable from
-- PostgREST UPDATE; the briefing canvas action layer rewrites
-- entire rows via INSERT (or service-role for admin paths) instead
-- of in-place column edits.
--
-- Without this revoke, the 24h UPDATE window in the policy above
-- would be extendable by a malicious caller setting created_at to
-- now() via a direct PostgREST UPDATE on the column.
-- ============================================================

REVOKE UPDATE ON public.briefing_documents FROM authenticated;
GRANT UPDATE (note, category) ON public.briefing_documents TO authenticated;

DO $$
BEGIN
  -- Effective table-level UPDATE must be denied to authenticated.
  IF has_table_privilege('authenticated', 'public.briefing_documents', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has effective UPDATE on briefing_documents';
  END IF;

  -- Effective column-level UPDATE must remain on the two client-editable
  -- columns the action layer relies on.
  IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'note', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated lost UPDATE on briefing_documents.note';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'category', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated lost UPDATE on briefing_documents.category';
  END IF;

  -- Effective column-level UPDATE must be denied on every server-managed
  -- column. The 24h authoring window in the UPDATE policy above relies
  -- on created_at being immutable from PostgREST.
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'created_at', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.created_at (24h window bypass)';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'created_by', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.created_by';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'project_id', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.project_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'id', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.id';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'kind', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.kind';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'source_type', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.source_type';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'storage_key', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.storage_key';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'url', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.url';
  END IF;
  -- sub_4 LOOP 2 PARTIAL closure ??extend the deny list to every
  -- server-managed column the schema defines. The REVOKE / selective
  -- GRANT above already denies these at the privilege layer, but the
  -- assertion list left them unverified, so a future PUBLIC inheritance
  -- regression on any of them would have escaped the migration's own
  -- guardrail.
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'filename', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.filename';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'size_bytes', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.size_bytes';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'mime_type', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.mime_type';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'provider', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.provider';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'thumbnail_url', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.thumbnail_url';
  END IF;
  IF has_column_privilege('authenticated', 'public.briefing_documents', 'oembed_html', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.oembed_html';
  END IF;
END $$;


 succeeded in 402ms:
-- =============================================================================
-- Phase 5 Wave A task_02 ??Data migration: attached_pdfs/urls jsonb ??briefing_documents
-- =============================================================================
--
-- PURPOSE:
--   Back-fill the new briefing_documents table (created in task_01:
--   20260504052541_phase_5_briefing_documents.sql) from the legacy
--   attached_pdfs / attached_urls jsonb arrays on project_boards.
--
-- DEPENDENCY:
--   MUST apply AFTER 20260504052541_phase_5_briefing_documents.sql.
--   The briefing_documents table must exist before this migration runs.
--
-- ONE-RUN-ONLY / IDEMPOTENCY:
--   The two INSERT ??SELECT statements are NOT inherently idempotent ??--   re-running would create duplicate rows in briefing_documents.
--   Guard: a DO $$ BEGIN ??END $$ block checks IF EXISTS (SELECT 1 FROM
--   briefing_documents LIMIT 1) before executing. If the table already has
--   any rows the block emits a NOTICE and returns without inserting.
--
--   Rationale: "any row present" is the cheapest possible sentinel that
--   requires zero schema changes. The table is empty at task_01 apply time
--   (no other code path populates it yet in Phase 5 Wave A). If a partial
--   run occurred and left orphan rows Builder must manually TRUNCATE
--   briefing_documents before re-applying; that case is called out in the
--   K-05 notes at the bottom of this file.
--
-- SPEC NOTE ??source table correction:
--   The KICKOFF.md spec (lines 444??79) reads `FROM projects p,
--   jsonb_array_elements(p.attached_pdfs) AS item` and uses `p.created_by`
--   as a fallback. However, the attached_pdfs / attached_urls columns do NOT
--   exist on the projects table ??they were added to project_boards in
--   Phase 3.1 hotfix-3 (20260429144523). Therefore this migration sources
--   data from project_boards (with a JOIN to projects for the created_by
--   fallback). All other column mappings follow the KICKOFF spec exactly.
--   This correction is documented in _wave_a_task_02_result.md.
--
-- COLUMNS NOT DROPPED:
--   project_boards.attached_pdfs and project_boards.attached_urls are NOT
--   dropped by this migration ??per KICKOFF 짠?쒖빟 line 1031 (data preservation;
--   cleanup deferred to Wave D ff-merge hotfix or Phase 5.1).
--
-- =============================================================================
-- PRE-APPLY VERIFICATION (Builder runs manually before apply):
--
--   -- Count total PDF elements across all project_boards
--   SELECT
--     COUNT(*) AS board_count,
--     SUM(jsonb_array_length(attached_pdfs)) AS total_pdf_elements,
--     SUM(jsonb_array_length(attached_urls)) AS total_url_elements
--   FROM project_boards
--   WHERE (attached_pdfs IS NOT NULL AND jsonb_array_length(attached_pdfs) > 0)
--      OR (attached_urls IS NOT NULL AND jsonb_array_length(attached_urls) > 0);
--
--   -- Confirm briefing_documents is empty before migration
--   SELECT COUNT(*) FROM briefing_documents;
--   -- Expected: 0
--
-- =============================================================================
-- POST-APPLY VERIFICATION (Builder runs manually after apply):
--
--   -- Count rows in briefing_documents vs source jsonb element counts
--   SELECT
--     source_type,
--     COUNT(*) AS migrated_rows
--   FROM briefing_documents
--   WHERE kind = 'reference'
--   GROUP BY source_type;
--   -- migrated_rows for 'upload' should equal total_pdf_elements above
--   -- migrated_rows for 'url'    should equal total_url_elements above
--
--   -- Cross-check: no orphan rows (briefing_documents without a parent project)
--   SELECT COUNT(*) FROM briefing_documents bd
--   LEFT JOIN projects p ON p.id = bd.project_id
--   WHERE p.id IS NULL;
--   -- Expected: 0
--
--   -- Check for NULL storage_key (would violate briefing_documents_source_check)
--   -- (should be caught by the constraint, but worth verifying separately)
--   SELECT COUNT(*) FROM briefing_documents
--   WHERE source_type = 'upload' AND (storage_key IS NULL OR filename IS NULL);
--   -- Expected: 0
--
--   -- Check for NULL url (would violate briefing_documents_source_check)
--   SELECT COUNT(*) FROM briefing_documents
--   WHERE source_type = 'url' AND url IS NULL;
--   -- Expected: 0
--
-- =============================================================================

DO $$
BEGIN
  -- Idempotency guard: if any row already exists in briefing_documents,
  -- a previous run (or partial run) has already populated it. Skip to avoid
  -- duplicates. Builder must TRUNCATE briefing_documents manually if a
  -- partial run left orphan rows and a clean re-run is desired.
  IF EXISTS (SELECT 1 FROM briefing_documents LIMIT 1) THEN
    RAISE NOTICE 'briefing_documents already populated; skipping migrate (task_02 idempotency guard)';
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- INSERT 1: PDF uploads from project_boards.attached_pdfs
  --
  -- jsonb element shape (set by add_project_board_pdf RPC):
  --   { "id": "<uuid>", "storage_key": "<text>", "filename": "<text>",
  --     "size_bytes": <bigint>, "uploaded_at": "<timestamptz>",
  --     "uploaded_by": "<uuid>" }
  --
  -- Assumption: storage_key and filename are always non-null in well-formed
  -- entries (the RPC validates them). Rows where either is NULL are skipped by
  -- the briefing_documents_source_check constraint and will raise on INSERT.
  -- Builder should verify COUNT(*) matches pre-apply total_pdf_elements after
  -- apply.
  --
  -- Assumption: mime_type is not stored in the jsonb element by the existing
  -- RPC (add_project_board_pdf does not persist mime_type in the jsonb blob).
  -- COALESCE falls back to 'application/pdf' as specified in KICKOFF line 454.
  --
  -- Assumption: uploaded_at (not uploaded_at) is the timestamp field name ??  -- confirmed from RPC source in 20260429144523. KICKOFF uses 'uploaded_at'
  -- which matches the actual jsonb key.
  --
  -- Fallback for created_by: jsonb element uploaded_by ??projects.created_by.
  -- project_boards does not have a created_by column; the join to projects
  -- provides the fallback owner (the project creator). This matches the spirit
  -- of the KICKOFF spec which used p.created_by from a (corrected) projects
  -- join.
  -- -------------------------------------------------------------------------
  INSERT INTO briefing_documents (
    project_id, kind, source_type,
    storage_key, filename, size_bytes, mime_type,
    created_at, created_by
  )
  SELECT
    p.id,
    'reference',
    'upload',
    (item->>'storage_key'),
    (item->>'filename'),
    (item->>'size_bytes')::bigint,
    COALESCE(item->>'mime_type', 'application/pdf'),
    COALESCE((item->>'uploaded_at')::timestamptz, p.created_at),
    COALESCE((item->>'uploaded_by')::uuid, p.created_by)
  FROM projects p
  JOIN project_boards pb ON pb.project_id = p.id,
  jsonb_array_elements(pb.attached_pdfs) AS item
  WHERE pb.attached_pdfs IS NOT NULL
    AND jsonb_array_length(pb.attached_pdfs) > 0;

  -- -------------------------------------------------------------------------
  -- INSERT 2: URL references from project_boards.attached_urls
  --
  -- jsonb element shape (set by add_project_board_url RPC, hotfix-3 version):
  --   { "id": "<uuid>", "url": "<text>", "title": <text|null>,
  --     "thumbnail_url": <text|null>, "provider": "<text>",
  --     "note": <text|null>, "added_at": "<timestamptz>",
  --     "added_by": "<uuid>" }
  --
  -- Assumption: 'added_at' / 'added_by' are the timestamp/user fields ??  -- confirmed from RPC source. KICKOFF spec uses these exact keys.
  --
  -- Assumption: provider is always non-null in well-formed entries
  -- (RPC validates it as 'youtube'/'vimeo'/'generic'). COALESCE to 'generic'
  -- matches KICKOFF line 471 as a safety net for legacy Phase 3.0 rows that
  -- may have been seeded before the provider validation was added.
  --
  -- Note: 'title' is stored in the jsonb element but briefing_documents has
  -- no 'title' column. Title is intentionally NOT migrated (no target column).
  -- This is documented in _wave_a_task_02_result.md.
  --
  -- Fallback for created_by: same pattern as INSERT 1 ??jsonb added_by ??  -- projects.created_by.
  -- -------------------------------------------------------------------------
  INSERT INTO briefing_documents (
    project_id, kind, source_type,
    url, provider, thumbnail_url, note,
    created_at, created_by
  )
  SELECT
    p.id,
    'reference',
    'url',
    (item->>'url'),
    COALESCE(item->>'provider', 'generic'),
    (item->>'thumbnail_url'),
    (item->>'note'),
    COALESCE((item->>'added_at')::timestamptz, p.created_at),
    COALESCE((item->>'added_by')::uuid, p.created_by)
  FROM projects p
  JOIN project_boards pb ON pb.project_id = p.id,
  jsonb_array_elements(pb.attached_urls) AS item
  WHERE pb.attached_urls IS NOT NULL
    AND jsonb_array_length(pb.attached_urls) > 0;

  -- -------------------------------------------------------------------------
  -- sub_4 F4 sanity assertion (Wave A K-05 LOOP 1 MED-C deferred safety net)
  --
  -- Codex K-05 LOOP 1 flagged the theoretical risk that a deleted profile
  -- UUID inside attached_pdfs.uploaded_by / attached_urls.added_by would
  -- pass the ::uuid cast but violate briefing_documents.created_by REFERENCES
  -- profiles(id) on INSERT. Production audit at apply time confirmed 0
  -- stale UIDs (and 0 source elements) so the immediate risk is nil and the
  -- finding is FU-Phase5-1 deferred.
  --
  -- This assertion is the future-proof safety net: any orphan row that
  -- somehow survives both casts AND the FK enforcement (impossible in
  -- normal Postgres, but cheap to verify) will fail the migration loudly
  -- rather than silently leaving inconsistent data. Re-run safe ??the
  -- assertion only loops over rows this migration just inserted, and
  -- because the migration is wrapped in an implicit transaction the
  -- failure rolls everything back.
  -- -------------------------------------------------------------------------
  DECLARE
    v_orphan_count int;
  BEGIN
    SELECT COUNT(*) INTO v_orphan_count
    FROM briefing_documents bd
    LEFT JOIN profiles p ON p.id = bd.created_by
    WHERE p.id IS NULL;
    IF v_orphan_count > 0 THEN
      RAISE EXCEPTION
        'sub_4 F4 assert failed: % orphan briefing_documents.created_by FK rows after migration',
        v_orphan_count;
    END IF;
  END;

END $$;

-- =============================================================================
-- K-05 NOTES (for Codex adversarial review):
--
-- 1. NULL safety: storage_key / filename NULLs in attached_pdfs elements will
--    cause INSERT to fail at the briefing_documents_source_check constraint
--    (source_type='upload' requires both non-null). Malformed elements from
--    pre-RPC direct DB writes (if any) would abort the DO block. Builder
--    should run the pre-apply NULL-check query above before apply.
--
-- 2. created_by FK validity: jsonb uploaded_by / added_by values are stored
--    as text-encoded UUIDs. COALESCE(...)::uuid cast will fail on malformed
--    values. The outer fallback to p.created_by (a FK-validated column on
--    projects) reduces but does not eliminate risk for the primary cast. If
--    the cast fails the entire DO block rolls back (it runs in a single
--    implicit transaction). No partial insert risk.
--
-- 3. Idempotency: guarded by the EXISTS check at block entry. Partial-run
--    risk exists if the Postgres session is interrupted mid-block (between
--    INSERT 1 and INSERT 2). In that case briefing_documents will have upload
--    rows but no url rows; the guard will fire on re-run and skip. Builder
--    must TRUNCATE briefing_documents and re-run. This is the accepted
--    tradeoff for the sentinel approach.
--
-- 4. Schema variance: Phase 3.0 had no attachment columns on project_boards
--    (they were added in hotfix-3 / 20260429144523). The DEFAULT '[]'::jsonb
--    on the columns means older boards have empty arrays; the WHERE
--    jsonb_array_length(...) > 0 guard skips them cleanly.
--    The hotfix-3 K-05 loop (20260429151910) fixed null-handling for
--    title/thumbnail_url/note using to_jsonb(). Those fields may be stored as
--    JSON null (not SQL NULL). `item->>'field'` on a JSON null returns SQL
--    NULL, which is safe for nullable columns.
--
-- 5. Apply gate: yagi confirm required before prod apply per KICKOFF lines
--    492-499. Data loss risk if applied incorrectly (no rollback for data
--    migration). Builder must receive explicit GO before mcp apply_migration.
--
-- 6. RLS bypass: this migration runs as the migration executor role (not an
--    authenticated user), so RLS does not apply during the INSERT. This is
--    correct and intentional ??the migration is a one-time back-fill, not a
--    user-facing write.
-- =============================================================================


 succeeded in 433ms:
   1: "use client";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave B task_05 v3 ??Step 2 center column (?덊띁?곗뒪 / reference docs)
   5: //
   6: // URL paste ??/api/oembed proxy ??addBriefingDocumentAction. Each row
   7: // displays thumbnail (when available) + URL + category chip + memo
   8: // textarea + delete X. Memo and category mutate via
   9: // updateBriefingDocumentNoteAction (1s debounce on memo).
  10: // =============================================================================
  11: 
  12: import { useState, useEffect, useRef } from "react";
  13: import { useTranslations } from "next-intl";
  14: import { Loader2, Link as LinkIcon, X } from "lucide-react";
  15: import Image from "next/image";
  16: import { toast } from "sonner";
  17: import { cn } from "@/lib/utils";
  18: import { Input } from "@/components/ui/input";
  19: import { Button } from "@/components/ui/button";
  20: import { Textarea } from "@/components/ui/textarea";
  21: import {
  22:   addBriefingDocumentAction,
  23:   removeBriefingDocumentAction,
  24:   updateBriefingDocumentNoteAction,
  25: } from "./briefing-step2-actions";
  26: 
  27: export type ReferenceDoc = {
  28:   id: string;
  29:   url: string | null;
  30:   provider: string | null;
  31:   thumbnail_url: string | null;
  32:   note: string | null;
  33:   category: "mood" | "composition" | "pacing" | "general" | string | null;
  34: };
  35: 
  36: const CATEGORY_OPTIONS = ["mood", "composition", "pacing", "general"] as const;
  37: 
  38: export function Step2ReferenceColumn({
  39:   projectId,
  40:   documents,
  41:   onAdded,
  42:   onRemoved,
  43:   onUpdated,
  44: }: {
  45:   projectId: string;
  46:   documents: ReferenceDoc[];
  47:   onAdded: (doc: ReferenceDoc) => void;
  48:   onRemoved: (id: string) => void;
  49:   onUpdated: (id: string, patch: Partial<ReferenceDoc>) => void;
  50: }) {
  51:   const t = useTranslations("projects");
  52:   const [urlValue, setUrlValue] = useState("");
  53:   const [busy, setBusy] = useState(false);
  54: 
  55:   async function handleAdd() {
  56:     const trimmed = urlValue.trim();
  57:     if (!trimmed) return;
  58:     setBusy(true);
  59:     try {
  60:       let provider:
  61:         | "youtube"
  62:         | "vimeo"
  63:         | "instagram"
  64:         | "generic"
  65:         | undefined;
  66:       let thumbnail_url: string | undefined;
  67: 
  68:       try {
  69:         const res = await fetch(
  70:           `/api/oembed?url=${encodeURIComponent(trimmed)}`,
  71:           { signal: AbortSignal.timeout(8_000) },
  72:         );
  73:         if (res.ok) {
  74:           const meta = (await res.json()) as {
  75:             provider?: typeof provider;
  76:             thumbnail_url?: string | null;
  77:           };
  78:           provider = meta.provider;
  79:           thumbnail_url = meta.thumbnail_url ?? undefined;
  80:         }
  81:       } catch {
  82:         // oembed failure is non-fatal ??store the URL with no thumbnail
  83:       }
  84: 
  85:       const insert = await addBriefingDocumentAction({
  86:         projectId,
  87:         kind: "reference",
  88:         source_type: "url",
  89:         url: trimmed,
  90:         provider,
  91:         thumbnail_url,
  92:         category: "general",
  93:       });
  94:       if (!insert.ok) {
  95:         toast.error(t("briefing.step2.toast.add_failed"));
  96:         return;
  97:       }
  98:       onAdded({
  99:         id: insert.document.id,
 100:         url: insert.document.url,
 101:         provider: insert.document.provider,
 102:         thumbnail_url: insert.document.thumbnail_url,
 103:         note: insert.document.note,
 104:         category: insert.document.category,
 105:       });
 106:       setUrlValue("");
 107:     } finally {
 108:       setBusy(false);
 109:     }
 110:   }
 111: 
 112:   async function handleRemove(id: string) {
 113:     const res = await removeBriefingDocumentAction({ documentId: id });
 114:     if (!res.ok) {
 115:       toast.error(t("briefing.step2.toast.remove_failed"));
 116:       return;
 117:     }
 118:     onRemoved(id);
 119:   }
 120: 
 121:   return (
 122:     <section className="rounded-3xl border border-border/40 p-6 bg-background flex flex-col gap-5">
 123:       <header>
 124:         <h2 className="text-base font-semibold tracking-tight keep-all">
 125:           {t("briefing.step2.sections.reference.title")}
 126:         </h2>
 127:         <p className="text-xs text-muted-foreground mt-1.5 keep-all leading-relaxed">
 128:           {t("briefing.step2.sections.reference.helper")}
 129:         </p>
 130:       </header>
 131: 
 132:       <div className="flex gap-2">
 133:         <Input
 134:           type="url"
 135:           placeholder={t(
 136:             "briefing.step2.sections.reference.url_input_placeholder",
 137:           )}
 138:           value={urlValue}
 139:           onChange={(e) => setUrlValue(e.target.value)}
 140:           onKeyDown={(e) => {
 141:             if (e.key === "Enter") void handleAdd();
 142:           }}
 143:           className="flex-1"
 144:         />
 145:         <Button
 146:           type="button"
 147:           size="sm"
 148:           onClick={handleAdd}
 149:           disabled={busy || !urlValue.trim()}
 150:         >
 151:           {busy ? (
 152:             <Loader2 className="w-4 h-4 animate-spin" />
 153:           ) : (
 154:             t("briefing.step2.sections.reference.add_cta")
 155:           )}
 156:         </Button>
 157:       </div>
 158: 
 159:       <div className="flex flex-col gap-3">
 160:         {documents.length === 0 ? (
 161:           <p className="text-xs text-muted-foreground keep-all">
 162:             {t("briefing.step2.sections.reference.list_empty")}
 163:           </p>
 164:         ) : (
 165:           documents.map((doc) => (
 166:             <ReferenceRow
 167:               key={doc.id}
 168:               doc={doc}
 169:               onUpdated={(patch) => onUpdated(doc.id, patch)}
 170:               onRemove={() => void handleRemove(doc.id)}
 171:             />
 172:           ))
 173:         )}
 174:       </div>
 175:     </section>
 176:   );
 177: }
 178: 
 179: function ReferenceRow({
 180:   doc,
 181:   onUpdated,
 182:   onRemove,
 183: }: {
 184:   doc: ReferenceDoc;
 185:   onUpdated: (patch: Partial<ReferenceDoc>) => void;
 186:   onRemove: () => void;
 187: }) {
 188:   const t = useTranslations("projects");
 189:   const [noteValue, setNoteValue] = useState(doc.note ?? "");
 190:   const [category, setCategory] = useState<string>(doc.category ?? "general");
 191:   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 192: 
 193:   // 1s debounce on note text. Category change persists immediately.
 194:   useEffect(() => {
 195:     if (noteValue === (doc.note ?? "")) return;
 196:     if (debounceRef.current) clearTimeout(debounceRef.current);
 197:     debounceRef.current = setTimeout(async () => {
 198:       const res = await updateBriefingDocumentNoteAction({
 199:         documentId: doc.id,
 200:         note: noteValue || null,
 201:       });
 202:       if (res.ok) onUpdated({ note: noteValue || null });
 203:     }, 1000);
 204:     return () => {
 205:       if (debounceRef.current) clearTimeout(debounceRef.current);
 206:     };
 207:     // eslint-disable-next-line react-hooks/exhaustive-deps -- onUpdated is unstable
 208:   }, [noteValue, doc.id, doc.note]);
 209: 
 210:   async function handleCategoryChange(next: string) {
 211:     setCategory(next);
 212:     const res = await updateBriefingDocumentNoteAction({
 213:       documentId: doc.id,
 214:       category: next as "mood" | "composition" | "pacing" | "general",
 215:     });
 216:     if (res.ok) onUpdated({ category: next });
 217:   }
 218: 
 219:   return (
 220:     <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/40">
 221:       <div className="flex items-start gap-3">
 222:         {doc.thumbnail_url ? (
 223:           <div className="w-20 h-14 shrink-0 rounded-lg overflow-hidden relative bg-muted">
 224:             <Image
 225:               src={doc.thumbnail_url}
 226:               alt=""
 227:               fill
 228:               sizes="80px"
 229:               className="object-cover"
 230:               unoptimized
 231:             />
 232:           </div>
 233:         ) : (
 234:           <div className="w-20 h-14 shrink-0 rounded-lg bg-muted flex items-center justify-center">
 235:             <LinkIcon className="w-5 h-5 text-muted-foreground" />
 236:           </div>
 237:         )}
 238:         <div className="flex-1 min-w-0 flex flex-col gap-1">
 239:           <a
 240:             href={doc.url ?? "#"}
 241:             target="_blank"
 242:             rel="noreferrer"
 243:             className="text-xs text-muted-foreground truncate hover:underline underline-offset-4"
 244:           >
 245:             {doc.url}
 246:           </a>
 247:           <div className="flex flex-wrap gap-1.5">
 248:             {CATEGORY_OPTIONS.map((opt) => {
 249:               const selected = category === opt;
 250:               return (
 251:                 <button
 252:                   key={opt}
 253:                   type="button"
 254:                   onClick={() => void handleCategoryChange(opt)}
 255:                   aria-pressed={selected}
 256:                   className={cn(
 257:                     "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
 258:                     selected
 259:                       ? "bg-foreground text-background"
 260:                       : "border border-border/60 hover:border-border",
 261:                   )}
 262:                 >
 263:                   {t(
 264:                     `briefing.step2.sections.reference.categories.${opt}` as Parameters<
 265:                       typeof t
 266:                     >[0],
 267:                   )}
 268:                 </button>
 269:               );
 270:             })}
 271:           </div>
 272:         </div>
 273:         <button
 274:           type="button"
 275:           onClick={onRemove}
 276:           className="p-1 rounded hover:bg-muted transition-colors shrink-0"
 277:           aria-label="Remove"
 278:         >
 279:           <X className="w-3.5 h-3.5 text-muted-foreground" />
 280:         </button>
 281:       </div>
 282:       <Textarea
 283:         value={noteValue}
 284:         onChange={(e) => setNoteValue(e.target.value)}
 285:         placeholder={t(
 286:           "briefing.step2.sections.reference.note_placeholder",
 287:         )}
 288:         rows={2}
 289:         className="resize-none text-xs"
 290:       />
 291:     </div>
 292:   );
 293: }

 succeeded in 405ms:
-- Phase 5 Wave B task_04 v3 ??projects briefing-canvas metadata columns
--
-- Schema decision: Option A (typed columns on projects) per yagi 2026-05-04.
-- Rationale (yagi verbatim): admin queue / filtering / sorting / project
-- overview will reach for these fields directly; jsonb adds friction for
-- those use cases relative to typed columns. Trade-off accepted: 9 new
-- columns on projects vs the simpler "single jsonb metadata" alternative.
--
-- Field map (Step 2 sidebar from KICKOFF v1.3 spec, plus Step 1 multi):
--   purpose                text[]   ??Step 1 multi-select
--   channels               text[]   ??Step 2 sidebar multi-select
--   mood_keywords          text[]   ??Step 2 sidebar preset multi-select
--   mood_keywords_free     text     ??Step 2 sidebar free-text complement
--   visual_ratio           text     ??Step 2 sidebar single-select chip
--   visual_ratio_custom    text     ??populated only when visual_ratio = 'custom'
--   target_audience        text     ??Step 2 sidebar free-text
--   additional_notes       text     ??Step 2 sidebar free-text
--   has_plan               text     ??Step 2 sidebar (have/want_proposal/undecided)
--
-- Existing columns kept as-is (NOT touched by this migration):
--   title (Step 1 name), brief (Step 1 description), deliverable_types
--   (Step 1 multi), budget_band (Step 2 sidebar), target_delivery_at
--   (Step 2 sidebar), meeting_preferred_at (Step 2 sidebar),
--   interested_in_twin (Wave A sub_3a), twin_intent (DEPRECATED, kept).
--
-- Defaults: text[] columns default to '{}' (empty array, NOT NULL) so
-- existing rows back-fill cleanly without a separate UPDATE pass. text
-- scalars default to NULL.
--
-- has_plan CHECK constraint mirrors the zod enum on the client side
-- (have / want_proposal / undecided) so DB rejects malformed values
-- regardless of caller (server action, admin SQL, future ingestion).

ALTER TABLE projects
  ADD COLUMN purpose text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN channels text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN mood_keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN mood_keywords_free text,
  ADD COLUMN visual_ratio text,
  ADD COLUMN visual_ratio_custom text,
  ADD COLUMN target_audience text,
  ADD COLUMN additional_notes text,
  ADD COLUMN has_plan text;

ALTER TABLE projects
  ADD CONSTRAINT projects_has_plan_check
  CHECK (has_plan IS NULL OR has_plan IN ('have', 'want_proposal', 'undecided'));

COMMENT ON COLUMN projects.purpose IS
  'Phase 5 Wave B task_04 v3 ??Step 1 multi-select content purpose. text[] of preset enum keys (sns_ad/branding/sns_channel/event/offline/other) plus arbitrary user-typed values.';
COMMENT ON COLUMN projects.channels IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar multi-select target channels (instagram/youtube/tiktok/facebook/website/offline/other).';
COMMENT ON COLUMN projects.mood_keywords IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar preset multi-select mood (emotional/sophisticated/humorous/dynamic/minimal/warm/luxurious/trendy/friendly).';
COMMENT ON COLUMN projects.mood_keywords_free IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar free-text mood input that complements mood_keywords[]. Comma-separated user input.';
COMMENT ON COLUMN projects.visual_ratio IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar visual aspect ratio chip (1_1/16_9/9_16/4_5/239_1/custom).';
COMMENT ON COLUMN projects.visual_ratio_custom IS
  'Phase 5 Wave B task_04 v3 ??populated only when visual_ratio = ''custom''.';
COMMENT ON COLUMN projects.target_audience IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar free-text target audience description.';
COMMENT ON COLUMN projects.additional_notes IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar free-text catch-all for anything else the briefing user wants to flag.';
COMMENT ON COLUMN projects.has_plan IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar plan availability (have/want_proposal/undecided). NULL means not yet answered.';


codex
The action-layer storage key checks, delete path, and briefing document column grants line up with the stated audit. I’m doing one targeted check on `projects` RLS/grants because the sidebar relies on table-wide `UPDATE` there.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE POLICY .*projects|ALTER TABLE projects ENABLE|GRANT UPDATE|REVOKE UPDATE|ON public.projects|ON projects|projects_update|projects.*UPDATE|FOR UPDATE\" supabase/migrations src -g '*.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"workspace_members|projects\" src/lib/workspace src/lib/supabase src/app/[locale]/app/projects/new -g '*.ts' -g '*.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"briefing_documents|has_column_privilege|GRANT UPDATE|REVOKE UPDATE|CREATE POLICY\" supabase/migrations -g '*.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 468ms:
src/app/[locale]/app/projects/new\actions.ts:15:// The wizard now creates the projects row early (status='draft') so Step 2
src/app/[locale]/app/projects/new\actions.ts:53:// `projects.intake_mode` column stays; existing rows still render via
src/app/[locale]/app/projects/new\actions.ts:54:// the read-only banner on /app/projects/[id].
src/app/[locale]/app/projects/new\actions.ts:95:  // - spec field `tone` → NO matching column on `projects`; omitted from insert
src/app/[locale]/app/projects/new\actions.ts:104:  // before the projects INSERT trusts the value.
src/app/[locale]/app/projects/new\actions.ts:135:    .from("projects")
src/app/[locale]/app/projects/new\actions.ts:146:  // with empty content, so the Brief tab on /app/projects/[id] can mount
src/app/[locale]/app/projects/new\actions.ts:172:    // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
src/app/[locale]/app/projects/new\actions.ts:179:      .from("projects")
src/app/[locale]/app/projects/new\actions.ts:191:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\actions.ts:260:    .from("projects")
src/app/[locale]/app/projects/new\actions.ts:307:  //    projects_wizard_draft_uniq partial index.
src/app/[locale]/app/projects/new\actions.ts:309:    .from("projects")
src/app/[locale]/app/projects/new\actions.ts:326:    await service.from("projects").delete().eq("id", existing.id);
src/app/[locale]/app/projects/new\actions.ts:368:    .from("projects")
src/app/[locale]/app/projects/new\actions.ts:378:        .from("projects")
src/app/[locale]/app/projects/new\actions.ts:411:    await service.from("projects").delete().eq("id", project.id);
src/app/[locale]/app/projects/new\actions.ts:423:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\actions.ts:445:    .from("projects")
src/app/[locale]/app/projects/new\actions.ts:456:  // the transition matrix in projects/[id]/actions.ts.
src/app/[locale]/app/projects/new\actions.ts:464:      .from("projects")
src/app/[locale]/app/projects/new\actions.ts:488:    .from("projects")
src/app/[locale]/app/projects/new\actions.ts:509:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\actions.ts:510:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src/app/[locale]/app/projects/new\actions.ts:711:// (the L-015 auto-transition shortcut — never writes 'submitted' to projects).
src/app/[locale]/app/projects/new\actions.ts:714://   1. INSERT projects with status='in_review' (user-scoped client; RLS
src/app/[locale]/app/projects/new\actions.ts:831:  // value, validated here and again by the projects.twin_intent CHECK constraint
src/app/[locale]/app/projects/new\actions.ts:884:  // RLS already gates projects.INSERT to workspace members; this is
src/app/[locale]/app/projects/new\actions.ts:888:    .from("workspace_members")
src/app/[locale]/app/projects/new\actions.ts:901:      .from("projects")
src/app/[locale]/app/projects/new\actions.ts:925:  // 1. INSERT projects with status='in_review' (L-015 auto-transition; INSERT
src/app/[locale]/app/projects/new\actions.ts:926:  //    is allowed by projects_insert RLS policy for authenticated callers who
src/app/[locale]/app/projects/new\actions.ts:930:    .from("projects")
src/app/[locale]/app/projects/new\actions.ts:932:      // 'name' column does not exist on projects — map to 'title' (existing column)
src/app/[locale]/app/projects/new\actions.ts:934:      // 'description' maps to 'brief' on the projects table
src/app/[locale]/app/projects/new\actions.ts:962:    console.error("[submitProjectAction] projects INSERT error:", projErr);
src/app/[locale]/app/projects/new\actions.ts:1047:    .from("projects")
src/app/[locale]/app/projects/new\actions.ts:1058:  const adminQueueUrl = `${baseUrl}/app/admin/projects`;
src/app/[locale]/app/projects/new\actions.ts:1059:  const projectUrl = `${baseUrl}/app/projects/${project.id}`;
src/app/[locale]/app/projects/new\actions.ts:1125:      url_path: `/app/projects/${project.id}`,
src/app/[locale]/app/projects/new\actions.ts:1131:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\actions.ts:1132:  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
src/app/[locale]/app/projects/new\actions.ts:1137:    redirect: `/app/projects/${project.id}`,
src/app/[locale]/app/projects/new\briefing-actions.ts:109:      .from("projects")
src/app/[locale]/app/projects/new\briefing-actions.ts:139:      .from("projects")
src/app/[locale]/app/projects/new\briefing-actions.ts:154:    revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\briefing-actions.ts:160:    .from("projects")
src/app/[locale]/app/projects/new\briefing-actions.ts:187:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new\briefing-canvas-step-1.tsx:148:  const t = useTranslations("projects");
src/app/[locale]/app/projects/new\briefing-canvas-step-2-brief.tsx:58:  const t = useTranslations("projects");
src/app/[locale]/app/projects/new\briefing-canvas-step-2-reference.tsx:51:  const t = useTranslations("projects");
src/app/[locale]/app/projects/new\briefing-canvas-step-2-reference.tsx:188:  const t = useTranslations("projects");
src/lib/workspace\actions.ts:44:    .from("workspace_members")
src/app/[locale]/app/projects/new\briefing-canvas-step-2-sidebar.tsx:206:  const t = useTranslations("projects");
src/lib/supabase\database.types.ts:406:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:636:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:781:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:847:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:980:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:1310:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:1351:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:1389:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:1427:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:1480:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:1535:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:1625:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:1666:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:1705:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:1710:      projects: {
src/lib/supabase\database.types.ts:1788:            foreignKeyName: "projects_brand_id_fkey"
src/lib/supabase\database.types.ts:1795:            foreignKeyName: "projects_created_by_fkey"
src/lib/supabase\database.types.ts:1802:            foreignKeyName: "projects_workspace_id_fkey"
src/lib/supabase\database.types.ts:2007:            referencedRelation: "projects"
src/lib/supabase\database.types.ts:2494:      workspace_members: {
src/lib/supabase\database.types.ts:2527:            foreignKeyName: "workspace_members_invited_by_fkey"
src/lib/supabase\database.types.ts:2534:            foreignKeyName: "workspace_members_user_id_fkey"
src/lib/supabase\database.types.ts:2541:            foreignKeyName: "workspace_members_workspace_id_fkey"
src/lib/workspace\active.ts:6:// cookie's uuid against workspace_members for the current user, then
src/lib/workspace\active.ts:11://      workspace_members membership on the server.
src/lib/workspace\active.ts:49: * Cross-tenant guard: the SELECT joins through workspace_members for the
src/lib/workspace\active.ts:61:    .from("workspace_members")
src/lib/workspace\active.ts:94: * workspace_members, and falls back to the first membership when
src/app/[locale]/app/projects/new\briefing-canvas-step-2.tsx:20://   - projects metadata fetched on mount and seeded into Step2Sidebar.
src/app/[locale]/app/projects/new\briefing-canvas-step-2.tsx:88:  const t = useTranslations("projects");
src/app/[locale]/app/projects/new\briefing-canvas-step-2.tsx:98:  // Initial fetch of briefing_documents + projects metadata.
src/app/[locale]/app/projects/new\briefing-canvas-step-2.tsx:114:          .from("projects")
src/app/[locale]/app/projects/new\briefing-canvas.tsx:84:  const t = useTranslations("projects");
src/app/[locale]/app/projects/new\briefing-canvas.tsx:218:              onClick={() => router.push("/app/projects")}
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:73: * in-depth — RLS policies on briefing_documents + projects already
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:110:    .from("projects")
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:131:    .from("workspace_members")
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:371:  revalidatePath("/[locale]/app/projects/new", "page");
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:432:  revalidatePath("/[locale]/app/projects/new", "page");
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:512:  revalidatePath("/[locale]/app/projects/new", "page");
src/app/[locale]/app/projects/new\briefing-step2-actions.ts:593:    .from("projects")
src/app/[locale]/app/projects/new\new-project-wizard.tsx:58:import { SummaryCard } from "@/components/projects/wizard/summary-card";
src/app/[locale]/app/projects/new\new-project-wizard.tsx:118:  // projects.twin_intent CHECK constraint added by task_01 migration.
src/app/[locale]/app/projects/new\new-project-wizard.tsx:205:  const t = useTranslations("projects");
src/app/[locale]/app/projects/new\new-project-wizard.tsx:251:  const t = useTranslations("projects");
src/app/[locale]/app/projects/new\new-project-wizard.tsx:291:  const t = useTranslations("projects");
src/app/[locale]/app/projects/new\new-project-wizard.tsx:725:            Maps 1:1 to projects.twin_intent enum (undecided / specific_in_mind / no_twin). */}
src/app/[locale]/app/projects/new\page.tsx:14:  const t = await getTranslations({ locale, namespace: "projects" });

 succeeded in 475ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2923:CREATE INDEX projects_brand_idx ON public.projects USING btree (brand_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2930:CREATE INDEX projects_type_status_idx ON public.projects USING btree (project_type, status);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2937:CREATE INDEX projects_workspace_idx ON public.projects USING btree (workspace_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3119:CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3872:CREATE POLICY notif_events_update_own ON public.notification_events FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3904:CREATE POLICY prefs_update_own ON public.notification_preferences FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3961:CREATE POLICY preprod_comments_update ON public.preprod_frame_comments FOR UPDATE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4017:CREATE POLICY preprod_frames_update ON public.preprod_frames FOR UPDATE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4050:CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4134:-- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4179:CREATE POLICY showcase_media_update ON public.showcase_media FOR UPDATE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4304:CREATE POLICY team_channel_messages_update ON public.team_channel_messages FOR UPDATE USING ((author_id = auth.uid())) WITH CHECK ((author_id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4551:CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND (owner = auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:25:-- #2 — public.meetings.meetings_update FOR UPDATE missing WITH CHECK.
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:37:-- #3 — public.showcase_media.showcase_media_update FOR UPDATE missing WITH CHECK.
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:52:-- #4 — public.team_channels.team_channels_update FOR UPDATE missing WITH CHECK.
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:67:-- #5 — storage.objects.avatars_update FOR UPDATE missing WITH CHECK.
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:78:-- #6 — storage.objects."showcase-media update" FOR UPDATE missing WITH CHECK.
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:88:-- #7 — storage.objects."showcase-og update" FOR UPDATE missing WITH CHECK.
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:245:  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:269:  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:281:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:308:  FOR UPDATE USING (
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:323:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:133:  FOR UPDATE
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:151:  FOR UPDATE
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:47:  FOR UPDATE
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:66:  FOR UPDATE
supabase/migrations\20260424010000_phase_2_5_challenges_closing_reminder_cron.sql:18:     FOR UPDATE SKIP LOCKED
supabase/migrations\20260424000001_phase_2_5_g2_handle_history_hardening.sql:43:--            - SELECT ... FOR UPDATE on profiles row to serialize concurrent
supabase/migrations\20260424000001_phase_2_5_g2_handle_history_hardening.sql:124:   FOR UPDATE;
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:164:  FOR UPDATE
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:218:  FOR UPDATE
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:233:  FOR UPDATE
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:130:   FOR UPDATE;
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:12:-- The new RPC takes a row-level FOR UPDATE lock on project_briefs at entry,
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:59:   FOR UPDATE;
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:85:  --    a duplicate row from sneaking in if the FOR UPDATE lock were
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:31:-- projects UPDATE policy approach: BEFORE UPDATE trigger that raises if
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:401:   FOR UPDATE;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:549:DROP TRIGGER IF EXISTS trg_guard_projects_status ON public.projects;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:552:  BEFORE UPDATE ON public.projects
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:596:  FOR UPDATE TO authenticated
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:646:  FOR UPDATE TO authenticated
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:675:-- SECTION I: RLS — projects UPDATE policy (tighten for status guard)
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:677:-- The existing projects_update policy (from Phase 2.8.2 hardening) allows
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:689:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:691:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:692:  FOR UPDATE TO authenticated
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:723:COMMENT ON POLICY projects_update ON public.projects IS
supabase/migrations\20260427000000_phase_2_8_1_wizard_draft.sql:49:  ON public.projects (workspace_id, created_by)
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:44:  ON public.projects (deleted_at)
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:49:DROP POLICY IF EXISTS projects_read ON public.projects;
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:51:CREATE POLICY projects_read ON public.projects
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:61:-- 3. RLS — replace projects_update ------------------------------------
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:63:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:65:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:66:  FOR UPDATE TO authenticated
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:225:  FOR UPDATE
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:246:  FOR UPDATE
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:518:  -- FOR UPDATE serializes against concurrent project_briefs UPDATE (e.g.,
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:526:    FOR UPDATE;
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:26:DROP POLICY IF EXISTS projects_insert ON public.projects;
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:28:CREATE POLICY projects_insert ON public.projects
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:35:COMMENT ON POLICY projects_insert ON public.projects IS
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:8:-- Finding 1 — projects_update WITH CHECK gap
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:32:-- 1. projects_update — tighten WITH CHECK ----------------------------
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:34:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:36:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:37:  FOR UPDATE TO authenticated
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:82:   FOR UPDATE;
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:94:  FOR UPDATE TO authenticated
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:106:  FOR UPDATE TO authenticated
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:86:  FOR UPDATE TO authenticated
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:149:  FOR UPDATE TO authenticated
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:32:  FOR UPDATE TO authenticated
supabase/migrations\20260429113853_phase_3_1_project_board.sql:61:  FOR UPDATE
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:369:  FOR UPDATE
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:5:-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:16:--   1. REVOKE UPDATE ON workspaces FROM authenticated  (table-level)
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:32:REVOKE UPDATE ON public.workspaces FROM authenticated;
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:34:GRANT UPDATE (
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:108:-- (REVOKE UPDATE + selective GRANT excludes created_at) so the 24h
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:111:  FOR UPDATE TO authenticated
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:179:REVOKE UPDATE ON public.briefing_documents FROM authenticated;
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:180:GRANT UPDATE (note, category) ON public.briefing_documents TO authenticated;

 succeeded in 462ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3729:CREATE POLICY deliverables_rw ON public.project_deliverables TO authenticated USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3747:CREATE POLICY invoice_items_select ON public.invoice_line_items FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3768:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3775:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3809:CREATE POLICY meeting_attendees_insert ON public.meeting_attendees FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3818:CREATE POLICY meeting_attendees_select ON public.meeting_attendees FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3854:CREATE POLICY milestones_rw ON public.project_milestones TO authenticated USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3865:CREATE POLICY notif_events_select_own ON public.notification_events FOR SELECT USING ((user_id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3872:CREATE POLICY notif_events_update_own ON public.notification_events FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3897:CREATE POLICY prefs_select_own ON public.notification_preferences FOR SELECT USING ((user_id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3904:CREATE POLICY prefs_update_own ON public.notification_preferences FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3911:CREATE POLICY prefs_upsert_own ON public.notification_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3952:CREATE POLICY preprod_comments_select ON public.preprod_frame_comments FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3961:CREATE POLICY preprod_comments_update ON public.preprod_frame_comments FOR UPDATE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3990:CREATE POLICY preprod_frames_delete ON public.preprod_frames FOR DELETE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3999:CREATE POLICY preprod_frames_insert ON public.preprod_frames FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4008:CREATE POLICY preprod_frames_select ON public.preprod_frames FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4017:CREATE POLICY preprod_frames_update ON public.preprod_frames FOR UPDATE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4028:CREATE POLICY preprod_reactions_select ON public.preprod_frame_reactions FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4043:CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4050:CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4057:CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4064:CREATE POLICY proj_refs_rw ON public.project_references TO authenticated USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4075:CREATE POLICY proj_threads_rw ON public.project_threads TO authenticated USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4150:CREATE POLICY showcase_media_delete ON public.showcase_media FOR DELETE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4159:CREATE POLICY showcase_media_insert ON public.showcase_media FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4168:CREATE POLICY showcase_media_select ON public.showcase_media FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4179:CREATE POLICY showcase_media_update ON public.showcase_media FOR UPDATE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4248:CREATE POLICY tc_attachments_insert ON public.team_channel_message_attachments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4257:CREATE POLICY tc_attachments_select ON public.team_channel_message_attachments FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4279:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4286:CREATE POLICY team_channel_messages_insert ON public.team_channel_messages FOR INSERT WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4295:CREATE POLICY team_channel_messages_select ON public.team_channel_messages FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4304:CREATE POLICY team_channel_messages_update ON public.team_channel_messages FOR UPDATE USING ((author_id = auth.uid())) WITH CHECK ((author_id = auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4353:CREATE POLICY thread_message_attachments_delete ON public.thread_message_attachments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4362:CREATE POLICY thread_message_attachments_insert ON public.thread_message_attachments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4373:CREATE POLICY thread_message_attachments_select ON public.thread_message_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4390:CREATE POLICY thread_messages_insert ON public.thread_messages FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4400:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4407:CREATE POLICY thread_msgs_rw ON public.thread_messages TO authenticated USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4420:CREATE POLICY unsub_tokens_deny_all ON public.notification_unsubscribe_tokens USING (false) WITH CHECK (false);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4479:CREATE POLICY ws_create_any_auth ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4544:CREATE POLICY avatars_read ON storage.objects FOR SELECT USING ((bucket_id = 'avatars'::text));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4551:CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND (owner = auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4558:CREATE POLICY avatars_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4565:CREATE POLICY brand_logos_read ON storage.objects FOR SELECT USING ((bucket_id = 'brand-logos'::text));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4572:CREATE POLICY brand_logos_write ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'brand-logos'::text));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4597:CREATE POLICY deliverables_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'project-deliverables'::text));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4604:CREATE POLICY deliverables_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'project-deliverables'::text) AND (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4653:CREATE POLICY refs_insert_authorized ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'project-references'::text) AND (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4662:CREATE POLICY refs_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'project-references'::text) AND (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4684:CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4691:CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4708:CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4715:CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4729:CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4736:CREATE POLICY "tc-attachments read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4743:CREATE POLICY "tc-attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4750:CREATE POLICY thread_attachments_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4759:CREATE POLICY thread_attachments_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4768:CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4778:CREATE POLICY thread_attachments_select ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4793:CREATE POLICY ws_logos_read ON storage.objects FOR SELECT USING ((bucket_id = 'workspace-logos'::text));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4800:CREATE POLICY ws_logos_write ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'workspace-logos'::text));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:229:CREATE POLICY creators_select ON public.creators
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:235:CREATE POLICY creators_insert_self ON public.creators
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:244:CREATE POLICY creators_update_self ON public.creators
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:253:CREATE POLICY studios_select ON public.studios
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:259:CREATE POLICY studios_insert_self ON public.studios
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:268:CREATE POLICY studios_update_self ON public.studios
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:274:CREATE POLICY challenges_select_public ON public.challenges
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:277:CREATE POLICY challenges_admin_insert ON public.challenges
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:280:CREATE POLICY challenges_admin_update ON public.challenges
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:284:CREATE POLICY challenges_admin_delete ON public.challenges
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:291:CREATE POLICY challenge_submissions_select ON public.challenge_submissions
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:294:CREATE POLICY challenge_submissions_insert_self ON public.challenge_submissions
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:307:CREATE POLICY challenge_submissions_update_self ON public.challenge_submissions
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:322:CREATE POLICY challenge_submissions_admin_update ON public.challenge_submissions
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:329:CREATE POLICY challenge_votes_select ON public.challenge_votes
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:332:CREATE POLICY challenge_votes_insert_self ON public.challenge_votes
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:344:CREATE POLICY challenge_judgments_admin_all ON public.challenge_judgments
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:351:CREATE POLICY showcase_challenge_winners_select ON public.showcase_challenge_winners
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:354:CREATE POLICY showcase_challenge_winners_admin_write ON public.showcase_challenge_winners
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:132:CREATE POLICY creators_update_self ON public.creators
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:150:CREATE POLICY studios_update_self ON public.studios
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:260:CREATE POLICY challenges_admin_insert ON public.challenges
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:268:CREATE POLICY challenge_judgments_admin_all ON public.challenge_judgments
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:277:CREATE POLICY showcase_challenge_winners_admin_write ON public.showcase_challenge_winners
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:35:CREATE POLICY challenge_judgments_admin_select ON public.challenge_judgments
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:39:CREATE POLICY challenge_judgments_admin_insert ON public.challenge_judgments
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:46:CREATE POLICY challenge_judgments_admin_update ON public.challenge_judgments
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:51:CREATE POLICY challenge_judgments_admin_delete ON public.challenge_judgments
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:58:CREATE POLICY showcase_challenge_winners_admin_insert ON public.showcase_challenge_winners
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:65:CREATE POLICY showcase_challenge_winners_admin_update ON public.showcase_challenge_winners
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:70:CREATE POLICY showcase_challenge_winners_admin_delete ON public.showcase_challenge_winners
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:45:CREATE POLICY handle_history_owner_select ON public.handle_history
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:51:CREATE POLICY handle_history_admin_select ON public.handle_history
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:15:CREATE POLICY challenge_submissions_select_public
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:28:CREATE POLICY challenge_submissions_select_owner
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:34:CREATE POLICY challenge_submissions_select_admin
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:45:CREATE POLICY challenge_votes_select_owner
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:50:CREATE POLICY challenge_votes_select_admin
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:139:CREATE POLICY clients_select_self_or_admin
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:149:CREATE POLICY clients_insert_self
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:162:CREATE POLICY clients_update_self_or_admin
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:182:CREATE POLICY commission_intakes_select_owner_or_admin
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:198:CREATE POLICY commission_intakes_insert_self_client
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:216:CREATE POLICY commission_intakes_update_owner_pre_response
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:231:CREATE POLICY commission_intakes_update_admin
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:24:--   - DROP POLICY IF EXISTS / CREATE POLICY (re-apply safe)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:185:CREATE POLICY project_briefs_select
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:201:CREATE POLICY project_briefs_insert
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:223:CREATE POLICY project_briefs_update_member
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:244:CREATE POLICY project_briefs_update_yagi
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:255:CREATE POLICY project_brief_versions_select
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:275:CREATE POLICY project_brief_versions_insert
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:297:CREATE POLICY project_brief_assets_select
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:313:CREATE POLICY project_brief_assets_insert
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:331:CREATE POLICY project_brief_assets_delete
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:344:CREATE POLICY embed_cache_select
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:570:CREATE POLICY psh_select_client ON public.project_status_history
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:582:CREATE POLICY psh_select_admin ON public.project_status_history
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:589:CREATE POLICY psh_insert_deny ON public.project_status_history
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:595:CREATE POLICY psh_update_deny ON public.project_status_history
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:601:CREATE POLICY psh_delete_deny ON public.project_status_history
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:620:CREATE POLICY pref_select_client ON public.project_references
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:633:CREATE POLICY pref_insert_client ON public.project_references
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:645:CREATE POLICY pref_update_client ON public.project_references
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:664:CREATE POLICY pref_delete_client ON public.project_references
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:691:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:28:CREATE POLICY projects_insert ON public.projects
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:21:--   ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS + CREATE POLICY,
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:51:CREATE POLICY projects_read ON public.projects
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:65:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:27:-- Both fixes are idempotent (DROP POLICY IF EXISTS + CREATE POLICY,
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:36:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:36:-- DROP POLICY IF EXISTS + CREATE POLICY, CREATE OR REPLACE TRIGGER.
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:77:CREATE POLICY meetings_insert ON public.meetings
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:93:CREATE POLICY meetings_update ON public.meetings
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:84:CREATE POLICY support_threads_select ON public.support_threads
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:93:CREATE POLICY support_threads_insert ON public.support_threads
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:105:CREATE POLICY support_threads_update ON public.support_threads
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:119:CREATE POLICY support_messages_select ON public.support_messages
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:134:CREATE POLICY support_messages_insert ON public.support_messages
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:43:-- All changes idempotent (DROP POLICY IF EXISTS + CREATE POLICY,
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:85:CREATE POLICY meetings_update ON public.meetings
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:110:CREATE POLICY support_threads_insert ON public.support_threads
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:126:CREATE POLICY support_messages_insert ON public.support_messages
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:148:CREATE POLICY support_threads_update ON public.support_threads
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:25:-- Idempotent (DROP POLICY IF EXISTS + CREATE POLICY).
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:31:CREATE POLICY support_threads_update ON public.support_threads
supabase/migrations\20260429113853_phase_3_1_project_board.sql:44:CREATE POLICY project_boards_select_client ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:56:CREATE POLICY project_boards_insert_via_rpc ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:60:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:92:CREATE POLICY project_board_versions_select ON project_board_versions
supabase/migrations\20260429113853_phase_3_1_project_board.sql:107:CREATE POLICY project_board_versions_insert_trigger ON project_board_versions
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:368:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:70:CREATE POLICY "project_licenses_select_admin" ON project_licenses
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:82:CREATE POLICY "project_licenses_select_owner" ON project_licenses
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:91:CREATE POLICY "project_licenses_write_admin" ON project_licenses
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:5:-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:47:-- Use has_table_privilege() / has_column_privilege() instead — those
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:59:  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'document', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:62:  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'updated_at', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:70:  IF has_column_privilege('authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:73:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:76:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:79:  IF has_column_privilege('authenticated', 'public.project_boards', 'is_locked', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:82:  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_by', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:85:  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_at', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:94:  IF has_column_privilege('authenticated', 'public.project_boards', 'id', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:97:  IF has_column_privilege('authenticated', 'public.project_boards', 'project_id', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:100:  IF has_column_privilege('authenticated', 'public.project_boards', 'schema_version', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:103:  IF has_column_privilege('authenticated', 'public.project_boards', 'source', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:109:  IF has_column_privilege('authenticated', 'public.project_boards', 'created_at', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:16:--   1. REVOKE UPDATE ON workspaces FROM authenticated  (table-level)
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:32:REVOKE UPDATE ON public.workspaces FROM authenticated;
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:34:GRANT UPDATE (
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:57:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'name', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:60:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'slug', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:63:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'logo_url', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:66:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'brand_guide', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:69:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'tax_id', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:72:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'tax_invoice_email', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:75:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'business_registration_number', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:78:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'representative_name', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:81:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'business_address', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:84:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'business_type', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:87:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'business_item', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:90:  IF NOT has_column_privilege('authenticated', 'public.workspaces', 'updated_at', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:95:  IF has_column_privilege('authenticated', 'public.workspaces', 'kind', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:98:  IF has_column_privilege('authenticated', 'public.workspaces', 'plan', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:101:  IF has_column_privilege('authenticated', 'public.workspaces', 'id', 'UPDATE') THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:104:  IF has_column_privilege('authenticated', 'public.workspaces', 'created_at', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:1:-- Phase 5 Wave A task_01 + sub_4 patch — briefing_documents table for the
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:20:--       has_column_privilege assertions in the DO block at the bottom
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:27:-- briefing_documents — Phase 5 신규 테이블
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:29:CREATE TABLE briefing_documents (
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:53:  CONSTRAINT briefing_documents_source_check CHECK (
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:59:CREATE INDEX idx_briefing_documents_project_kind ON briefing_documents(project_id, kind);
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:60:CREATE INDEX idx_briefing_documents_created ON briefing_documents(created_at DESC);
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:63:ALTER TABLE briefing_documents ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:66:CREATE POLICY "briefing_documents_select" ON briefing_documents
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:85:CREATE POLICY "briefing_documents_insert" ON briefing_documents
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:108:-- (REVOKE UPDATE + selective GRANT excludes created_at) so the 24h
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:110:CREATE POLICY "briefing_documents_update" ON briefing_documents
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:147:CREATE POLICY "briefing_documents_delete" ON briefing_documents
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:179:REVOKE UPDATE ON public.briefing_documents FROM authenticated;
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:180:GRANT UPDATE (note, category) ON public.briefing_documents TO authenticated;
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:185:  IF has_table_privilege('authenticated', 'public.briefing_documents', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:186:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has effective UPDATE on briefing_documents';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:191:  IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'note', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:192:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated lost UPDATE on briefing_documents.note';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:194:  IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'category', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:195:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated lost UPDATE on briefing_documents.category';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:201:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'created_at', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:202:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.created_at (24h window bypass)';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:204:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'created_by', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:205:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.created_by';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:207:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'project_id', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:208:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.project_id';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:210:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'id', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:211:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.id';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:213:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'kind', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:214:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.kind';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:216:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'source_type', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:217:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.source_type';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:219:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'storage_key', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:220:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.storage_key';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:222:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'url', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:223:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.url';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:231:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'filename', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:232:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.filename';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:234:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'size_bytes', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:235:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.size_bytes';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:237:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'mime_type', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:238:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.mime_type';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:240:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'provider', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:241:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.provider';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:243:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'thumbnail_url', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:244:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.thumbnail_url';
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:246:  IF has_column_privilege('authenticated', 'public.briefing_documents', 'oembed_html', 'UPDATE') THEN
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:247:    RAISE EXCEPTION 'sub_4 F3 assert failed: authenticated still has UPDATE on briefing_documents.oembed_html';
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:2:-- Phase 5 Wave A task_02 — Data migration: attached_pdfs/urls jsonb → briefing_documents
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:6:--   Back-fill the new briefing_documents table (created in task_01:
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:7:--   20260504052541_phase_5_briefing_documents.sql) from the legacy
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:11:--   MUST apply AFTER 20260504052541_phase_5_briefing_documents.sql.
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:12:--   The briefing_documents table must exist before this migration runs.
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:16:--   re-running would create duplicate rows in briefing_documents.
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:18:--   briefing_documents LIMIT 1) before executing. If the table already has
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:25:--   briefing_documents before re-applying; that case is called out in the
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:55:--   -- Confirm briefing_documents is empty before migration
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:56:--   SELECT COUNT(*) FROM briefing_documents;
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:62:--   -- Count rows in briefing_documents vs source jsonb element counts
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:66:--   FROM briefing_documents
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:72:--   -- Cross-check: no orphan rows (briefing_documents without a parent project)
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:73:--   SELECT COUNT(*) FROM briefing_documents bd
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:78:--   -- Check for NULL storage_key (would violate briefing_documents_source_check)
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:80:--   SELECT COUNT(*) FROM briefing_documents
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:84:--   -- Check for NULL url (would violate briefing_documents_source_check)
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:85:--   SELECT COUNT(*) FROM briefing_documents
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:93:  -- Idempotency guard: if any row already exists in briefing_documents,
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:95:  -- duplicates. Builder must TRUNCATE briefing_documents manually if a
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:97:  IF EXISTS (SELECT 1 FROM briefing_documents LIMIT 1) THEN
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:98:    RAISE NOTICE 'briefing_documents already populated; skipping migrate (task_02 idempotency guard)';
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:112:  -- the briefing_documents_source_check constraint and will raise on INSERT.
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:130:  INSERT INTO briefing_documents (
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:168:  -- Note: 'title' is stored in the jsonb element but briefing_documents has
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:175:  INSERT INTO briefing_documents (
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:201:  -- pass the ::uuid cast but violate briefing_documents.created_by REFERENCES
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:218:    FROM briefing_documents bd
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:223:        'sub_4 F4 assert failed: % orphan briefing_documents.created_by FK rows after migration',
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:234:--    cause INSERT to fail at the briefing_documents_source_check constraint
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:248:--    INSERT 1 and INSERT 2). In that case briefing_documents will have upload
supabase/migrations\20260504053641_phase_5_migrate_attached_to_briefing_documents.sql:250:--    must TRUNCATE briefing_documents and re-run. This is the accepted

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql' | ForEach-Object { if ("'$i -ge 32 -and $i -le 55) { '"'{0,4}: {1}' -f "'$i, $_ }; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql' | ForEach-Object { if ("'$i -ge 61 -and $i -le 76) { '"'{0,4}: {1}' -f "'$i, $_ }; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/workspace/active.ts' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"REVOKE .* ON public.projects|REVOKE .* ON projects|GRANT .* ON public.projects|GRANT .* ON projects|ALTER DEFAULT PRIVILEGES.*projects\" supabase/migrations -g '*.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 382ms:
  32: -- 1. projects_update ??tighten WITH CHECK ----------------------------
  33: 
  34: DROP POLICY IF EXISTS projects_update ON public.projects;
  35: 
  36: CREATE POLICY projects_update ON public.projects
  37:   FOR UPDATE TO authenticated
  38:   USING (
  39:     (
  40:       public.is_ws_admin(auth.uid(), workspace_id)
  41:       AND deleted_at IS NULL
  42:     )
  43:     OR public.is_yagi_admin(auth.uid())
  44:   )
  45:   WITH CHECK (
  46:     (
  47:       public.is_ws_admin(auth.uid(), workspace_id)
  48:       AND deleted_at IS NULL
  49:     )
  50:     OR public.is_yagi_admin(auth.uid())
  51:   );
  52: 
  53: -- 2. save_brief_version ??refuse trashed projects -------------------
  54: 
  55: CREATE OR REPLACE FUNCTION public.save_brief_version(

 succeeded in 391ms:
  61: -- 3. RLS ??replace projects_update ------------------------------------
  62: 
  63: DROP POLICY IF EXISTS projects_update ON public.projects;
  64: 
  65: CREATE POLICY projects_update ON public.projects
  66:   FOR UPDATE TO authenticated
  67:   USING (
  68:     (
  69:       public.is_ws_admin(auth.uid(), workspace_id)
  70:       AND deleted_at IS NULL
  71:     )
  72:     OR public.is_yagi_admin(auth.uid())
  73:   )
  74:   WITH CHECK (
  75:     public.is_ws_admin(auth.uid(), workspace_id)
  76:     OR public.is_yagi_admin(auth.uid())

 succeeded in 399ms:
// Phase 4.x task_06 ??Active workspace resolver.
//
// Decision lock-in (_decisions_locked.md section 2): cookie-based.
// The cookie 'yagi_active_workspace' carries a uuid. Every server-side
// page render that needs the active workspace must validate the
// cookie's uuid against workspace_members for the current user, then
// fall back to the first membership if invalid or absent.
//
// Cookie tampering is fully defended:
//   1. The cookie value is not trusted -- we always re-check
//      workspace_members membership on the server.
//   2. If the cookie's uuid is not a valid membership for this user,
//      we ignore it and use first-member fallback. (We do NOT trust
//      the cookie even for read-only display.)
//
// Phase 4 caveat: workspaces.kind column is added by task_01 migration
// (Wave D D.1 apply). Until apply, the SELECT returns undefined for
// kind; we coerce to 'brand' (matches task_01 UPDATE that sets every
// existing row to 'brand'). Post-apply, kind is one of 3 enum values.

import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";

export type WorkspaceKind = "brand" | "artist" | "yagi_admin";

export type ActiveWorkspaceMembership = {
  id: string;
  name: string;
  kind: WorkspaceKind;
};

export const ACTIVE_WORKSPACE_COOKIE = "yagi_active_workspace";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function narrowKind(value: unknown): WorkspaceKind {
  if (value === "brand" || value === "artist" || value === "yagi_admin") {
    return value;
  }
  return "brand";
}

/**
 * Returns the user's workspace memberships, joined with workspace name + kind.
 * Used by the workspace switcher dropdown to render full lists. The active
 * one is found by `id === activeWorkspaceId`.
 *
 * Cross-tenant guard: the SELECT joins through workspace_members for the
 * caller's user_id, so RLS scopes naturally. workspaces RLS already gates
 * SELECT to members.
 */
export async function listOwnWorkspaces(
  userId: string,
): Promise<ActiveWorkspaceMembership[]> {
  const supabase = await createSupabaseServer();
  // workspaces.kind not in generated types yet (Wave D D.1 apply -> regen).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
  const sb = supabase as any;
  const { data: rows } = (await sb
    .from("workspace_members")
    .select(
      `
      workspace_id,
      created_at,
      workspace:workspaces ( id, name, kind )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true })) as {
    data:
      | {
          workspace_id: string;
          workspace: { id: string; name: string; kind?: string } | null;
        }[]
      | null;
  };

  const list: ActiveWorkspaceMembership[] = [];
  for (const r of rows ?? []) {
    if (!r.workspace) continue;
    list.push({
      id: r.workspace.id,
      name: r.workspace.name,
      kind: narrowKind(r.workspace.kind),
    });
  }
  return list;
}

/**
 * Resolve the user's currently-active workspace. Reads the
 * 'yagi_active_workspace' cookie, validates membership against
 * workspace_members, and falls back to the first membership when
 * the cookie is absent, malformed, or doesn't correspond to a
 * valid membership for this user.
 *
 * Returns null when the user has no workspace memberships at all
 * (caller should redirect to /onboarding).
 */
export async function resolveActiveWorkspace(
  userId: string,
): Promise<ActiveWorkspaceMembership | null> {
  const memberships = await listOwnWorkspaces(userId);
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (cookieValue && UUID_RE.test(cookieValue)) {
    const match = memberships.find((m) => m.id === cookieValue);
    if (match) return match;
    // Fall through to first-membership fallback. We deliberately do NOT
    // attempt to clear the cookie here -- this resolver is read-only
    // (cookies() in next/headers is read in server components). The
    // setActiveWorkspace server action is the only writer; if a stale
    // cookie keeps arriving here, the resolver silently falls back
    // without leaking which workspace_id the user does NOT belong to.
  }

  return memberships[0];
}


2026-05-04T08:02:45.000866Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 407ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql' -Raw" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | ForEach-Object { if ("'$i -ge 675 -and $i -le 725) { '"'{0,4}: {1}' -f "'$i, $_ }; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"is_ws_admin\\(|is_ws_member\\(|CREATE OR REPLACE FUNCTION public.is_ws\" supabase/migrations/20260422120000_phase_2_0_baseline.sql supabase/migrations/*.sql" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 379ms:
-- =============================================================================
-- Phase 3.0 K-05 LOOP 1 fix ??HIGH-A: projects_insert RLS too restrictive
-- =============================================================================
-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
-- since Phase 2.0 baseline. A regular workspace member (client with
-- workspace_members.role != 'admin') cannot INSERT projects via the user-scoped
-- authenticated client. This blocks all project submissions from non-admin
-- workspace members ??the primary user class for project submission.
--
-- Root cause: Phase 2.0 baseline wrote the policy for the admin-only project
-- creation path (commission intake). Phase 3.0 submitProjectAction added a
-- client-facing path using the user-scoped client without catching that the
-- INSERT policy would reject non-admin clients.
--
-- In prod today (2026-04-28) workspace_members only has role='admin' rows
-- (2 rows, both Yagi internal), so the bug was masked during all Phase 2.x
-- development. A real client (role='member' or 'viewer') would hit RLS
-- rejection on every project submit.
--
-- Fix: extend WITH CHECK to is_ws_member (any workspace member), matching
-- the read policy (projects_read uses is_ws_member). The trigger guard
-- (trg_guard_projects_status) and is_valid_transition() continue to gate
-- all status transitions independently.
-- =============================================================================

DROP POLICY IF EXISTS projects_insert ON public.projects;

CREATE POLICY projects_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ws_member(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
  );

COMMENT ON POLICY projects_insert ON public.projects IS
  'K-05 LOOP 1 fix (20260427182456): any workspace member may INSERT projects. '
  'Previously restricted to ws_admin + yagi_admin, blocking all client-role '
  'project submissions. is_yagi_admin path preserved for admin console creates.';


 succeeded in 409ms:
 675:     -- Client: own project, draft only, not deleted
 676:     (
 677:       auth.uid() = created_by
 678:       AND status = 'draft'
 679:       AND deleted_at IS NULL
 680:     )
 681:     -- ws_admin: any non-deleted project in workspace
 682:     OR (
 683:       public.is_ws_admin(auth.uid(), workspace_id)
 684:       AND deleted_at IS NULL
 685:     )
 686:     -- yagi_admin: unrestricted (including trashed project restore)
 687:     OR public.is_yagi_admin(auth.uid())
 688:   )
 689:   WITH CHECK (
 690:     -- Client: own project, non-deleted only (no writing deleted_at)
 691:     (
 692:       auth.uid() = created_by
 693:       AND deleted_at IS NULL
 694:     )
 695:     -- ws_admin: non-deleted only (cannot self-trash via update)
 696:     OR (
 697:       public.is_ws_admin(auth.uid(), workspace_id)
 698:       AND deleted_at IS NULL
 699:     )
 700:     -- yagi_admin: unrestricted
 701:     OR public.is_yagi_admin(auth.uid())
 702:   );
 703: 
 704: COMMENT ON POLICY projects_update ON public.projects IS
 705:   'Phase 3.0 ??client may UPDATE own draft rows (wizard autosave). '
 706:   'ws_admin may UPDATE any non-deleted project in workspace. '
 707:   'yagi_admin unrestricted. Status column changes are additionally gated by '
 708:   'trg_guard_projects_status trigger ??only transition_project_status() RPC '
 709:   'or yagi_admin may change projects.status.';
 710: 
 711: COMMIT;

2026-05-04T08:02:54.783508Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
supabase/migrations/20260422120000_phase_2_0_baseline.sql:151:-- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:154:CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:166:-- Name: is_ws_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:169:CREATE FUNCTION public.is_ws_member(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4172:          WHERE ((p.id = s.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4210:  WHERE ((p.id = showcases.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4221:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4288:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND public.is_ws_member(auth.uid(), c.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4366:  WHERE ((tm.id = thread_message_attachments.message_id) AND (tm.author_id = auth.uid()) AND public.is_ws_member(auth.uid(), p.workspace_id)))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4628:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4637:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_member(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4646:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4694:  WHERE ((s.id = ((storage.foldername(objects.name))[1])::uuid) AND public.is_ws_member(auth.uid(), p.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4736:CREATE POLICY "tc-attachments read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4743:CREATE POLICY "tc-attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4761:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4780:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
rg: supabase/migrations/*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 exited 1 in 396ms:
supabase/migrations/20260422120000_phase_2_0_baseline.sql:151:-- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:154:CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:166:-- Name: is_ws_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:169:CREATE FUNCTION public.is_ws_member(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4172:          WHERE ((p.id = s.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4210:  WHERE ((p.id = showcases.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4221:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4288:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND public.is_ws_member(auth.uid(), c.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4366:  WHERE ((tm.id = thread_message_attachments.message_id) AND (tm.author_id = auth.uid()) AND public.is_ws_member(auth.uid(), p.workspace_id)))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4628:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4637:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_member(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4646:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4694:  WHERE ((s.id = ((storage.foldername(objects.name))[1])::uuid) AND public.is_ws_member(auth.uid(), p.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4736:CREATE POLICY "tc-attachments read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4743:CREATE POLICY "tc-attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4761:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4780:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
rg: supabase/migrations/*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

codex
## VERDICT: NEEDS-ATTENTION

[FINDING 1] HIGH: src/app/api/oembed/route.ts:140 — DNS rebinding window remains because `assertSafeUrl()` resolves the hostname before `fetch()`, but `fetch(validated.toString())` performs its own later DNS lookup — recommended fix: pin the validated IP into the actual request with an undici custom lookup/dispatcher per hop, or disable generic OG scraping behind a strict provider allowlist until fetch-time IP pinning is in place.

[FINDING 2] HIGH: src/app/[locale]/app/projects/new/briefing-step2-actions.ts:354 — `addBriefingDocumentAction` checks `status='draft'` only before the INSERT; if the project transitions to `in_review` between auth check and INSERT, briefing_documents RLS does not block the insert — recommended fix: add parent project `status='draft'` to the INSERT RLS policy or move the draft check + insert into a single locking RPC/transaction.

[FINDING 3] HIGH: src/app/[locale]/app/projects/new/briefing-step2-actions.ts:502 — `updateBriefingDocumentNoteAction` never checks the parent project draft status, and briefing_documents UPDATE RLS only enforces owner/member/24h, so note/category can mutate after `in_review` — recommended fix: enforce parent `projects.status='draft'` in UPDATE RLS and/or select `project_id` then call `assertProjectMutationAuth()` before updating.

[FINDING 4] MED: src/app/[locale]/app/projects/new/briefing-step2-actions.ts:590 — sidebar metadata autosave assumes user-scoped `projects.UPDATE` works for the callers admitted by `assertProjectMutationAuth`, but the latest `projects_update` RLS policy only permits ws_admin/yagi_admin, not regular member project creators — recommended fix: restore the intended own-draft/client branch in `projects_update`, or route metadata autosave through an explicit RPC with the same draft/member checks.

[FINDING 5] MED: src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx:221 — the AbortController only suppresses stale UI handling; it does not cancel the already-dispatched server action, so an older slow autosave can commit after a newer one and overwrite the last edit — recommended fix: serialize saves with a queued latest snapshot, or add a server-side revision/updated_at compare so stale commits are rejected.

Run log: task_05 v3 Wave B Step 2 is not ready for visual review/task_06 entry; blockers are SSRF fetch-time DNS pinning, draft-state write enforcement, projects RLS mismatch, and autosave stale-write protection.
tokens used
87,267
## VERDICT: NEEDS-ATTENTION

[FINDING 1] HIGH: src/app/api/oembed/route.ts:140 — DNS rebinding window remains because `assertSafeUrl()` resolves the hostname before `fetch()`, but `fetch(validated.toString())` performs its own later DNS lookup — recommended fix: pin the validated IP into the actual request with an undici custom lookup/dispatcher per hop, or disable generic OG scraping behind a strict provider allowlist until fetch-time IP pinning is in place.

[FINDING 2] HIGH: src/app/[locale]/app/projects/new/briefing-step2-actions.ts:354 — `addBriefingDocumentAction` checks `status='draft'` only before the INSERT; if the project transitions to `in_review` between auth check and INSERT, briefing_documents RLS does not block the insert — recommended fix: add parent project `status='draft'` to the INSERT RLS policy or move the draft check + insert into a single locking RPC/transaction.

[FINDING 3] HIGH: src/app/[locale]/app/projects/new/briefing-step2-actions.ts:502 — `updateBriefingDocumentNoteAction` never checks the parent project draft status, and briefing_documents UPDATE RLS only enforces owner/member/24h, so note/category can mutate after `in_review` — recommended fix: enforce parent `projects.status='draft'` in UPDATE RLS and/or select `project_id` then call `assertProjectMutationAuth()` before updating.

[FINDING 4] MED: src/app/[locale]/app/projects/new/briefing-step2-actions.ts:590 — sidebar metadata autosave assumes user-scoped `projects.UPDATE` works for the callers admitted by `assertProjectMutationAuth`, but the latest `projects_update` RLS policy only permits ws_admin/yagi_admin, not regular member project creators — recommended fix: restore the intended own-draft/client branch in `projects_update`, or route metadata autosave through an explicit RPC with the same draft/member checks.

[FINDING 5] MED: src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx:221 — the AbortController only suppresses stale UI handling; it does not cancel the already-dispatched server action, so an older slow autosave can commit after a newer one and overwrite the last edit — recommended fix: serialize saves with a queued latest snapshot, or add a server-side revision/updated_at compare so stale commits are rejected.

Run log: task_05 v3 Wave B Step 2 is not ready for visual review/task_06 entry; blockers are SSRF fetch-time DNS pinning, draft-state write enforcement, projects RLS mismatch, and autosave stale-write protection.

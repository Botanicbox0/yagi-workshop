import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "edge";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_BUCKET = "showcase-og";
const MEDIA_BUCKET = "showcase-media";
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=86400",
};

type FontSpec = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal" | "italic";
};

/**
 * Fetch Google Fonts webfonts as ArrayBuffers for satori. If any font fails
 * to load, the ImageResponse still renders with the system fallback.
 */
async function loadFonts(): Promise<FontSpec[]> {
  const entries = [
    {
      url: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,72,700&display=swap",
      name: "Fraunces",
      weight: 700 as const,
      style: "italic" as const,
    },
    {
      url: "https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap",
      name: "Inter",
      weight: 700 as const,
      style: "normal" as const,
    },
    {
      url: "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap",
      name: "Inter",
      weight: 400 as const,
      style: "normal" as const,
    },
  ];

  const fonts: FontSpec[] = [];
  for (const entry of entries) {
    try {
      const cssRes = await fetch(entry.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (!cssRes.ok) continue;
      const css = await cssRes.text();
      const match = css.match(/src:\s*url\((https:[^)]+\.woff2)\)/u);
      if (!match?.[1]) continue;
      const fontRes = await fetch(match[1]);
      if (!fontRes.ok) continue;
      const data = await fontRes.arrayBuffer();
      fonts.push({
        name: entry.name,
        data,
        weight: entry.weight,
        style: entry.style,
      });
    } catch {
      // fail silently — ImageResponse still renders with default font
    }
  }
  return fonts;
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "og route requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Fetch the cover image bytes as a base64 data-URL so satori can embed it
 * as a `<img src=...>`. Returns null on any failure — caller draws without
 * a background image.
 */
async function loadCoverDataUrl(
  svc: ReturnType<typeof createServiceClient>,
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;
  try {
    const { data, error } = await svc.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(storagePath, 60);
    if (error || !data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    // Only embed raster images — skip video frames / unknown types.
    if (!contentType.startsWith("image/")) return null;
    // Convert ArrayBuffer to base64 in an edge-safe way.
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    // btoa is available in the edge runtime.
    const b64 = btoa(binary);
    return `data:${contentType};base64,${b64}`;
  } catch {
    return null;
  }
}

function fallbackResponse(title: string, fonts: FontSpec[]): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          backgroundColor: "#0A0A0A",
          color: "#ffffff",
          fontFamily: "Inter, sans-serif",
          padding: "64px 72px",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 6,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          YAGI WORKSHOP
        </div>
        <div
          style={{
            fontFamily: "Fraunces, serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 72,
            lineHeight: 1.1,
            textAlign: "center",
            letterSpacing: "-0.02em",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}

type ShowcaseRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: string;
  cover_media_storage_path: string | null;
  cover_media_type: string | null;
  og_image_path: string | null;
  og_image_regenerated_at: string | null;
  updated_at: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  // Basic UUID shape check — avoid hitting the DB with garbage.
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  let svc: ReturnType<typeof createServiceClient>;
  try {
    svc = createServiceClient();
  } catch (err) {
    console.error("[og] service client init failed", err);
    return new Response("Internal error", { status: 500 });
  }

  const { data: showcaseData, error: loadError } = await svc
    .from("showcases")
    .select(
      "id, slug, title, subtitle, status, cover_media_storage_path, cover_media_type, og_image_path, og_image_regenerated_at, updated_at",
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (loadError) {
    console.error("[og] load error");
    return new Response("Internal error", { status: 500 });
  }

  if (!showcaseData) {
    return new Response("Not found", { status: 404 });
  }

  const showcase = showcaseData as ShowcaseRow;

  // Cache hit: OG already rendered and is newer than the last showcase edit.
  if (
    showcase.og_image_path &&
    showcase.og_image_regenerated_at &&
    new Date(showcase.og_image_regenerated_at).getTime() >=
      new Date(showcase.updated_at).getTime()
  ) {
    const { data: pub } = svc.storage
      .from(OG_BUCKET)
      .getPublicUrl(`${showcase.id}.png`);
    if (pub?.publicUrl) {
      return Response.redirect(pub.publicUrl, 302);
    }
  }

  const fonts = await loadFonts();

  // Only use a raster cover — skip video frames.
  const coverCandidate =
    showcase.cover_media_type === "image"
      ? showcase.cover_media_storage_path
      : null;
  const coverDataUrl = await loadCoverDataUrl(svc, coverCandidate);

  let imageResponse: ImageResponse;
  try {
    imageResponse = new ImageResponse(
      (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#0A0A0A",
            color: "#ffffff",
            padding: "56px 72px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {coverDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverDataUrl}
                alt=""
                width={OG_WIDTH}
                height={OG_HEIGHT}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  display: "flex",
                }}
              />
            </>
          ) : null}

          {/* Top row: wordmark right-aligned */}
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 16,
                letterSpacing: 4,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              YAGI WORKSHOP
            </div>
          </div>

          {/* Center: title + subtitle */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: 1000,
            }}
          >
            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontStyle: "italic",
                fontWeight: 700,
                fontSize: 72,
                lineHeight: 1.08,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                // satori doesn't support -webkit-line-clamp reliably; cap with
                // max-height + overflow hidden so extra lines get cut.
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "keep-all",
              }}
            >
              {showcase.title}
            </div>
            {showcase.subtitle ? (
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 400,
                  lineHeight: 1.3,
                  color: "rgba(255,255,255,0.8)",
                  wordBreak: "keep-all",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {showcase.subtitle}
              </div>
            ) : null}
          </div>

          {/* Bottom: slug link */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: 1,
              }}
            >
              studio.yagiworkshop.xyz/showcase/{showcase.slug}
            </div>
          </div>
        </div>
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts: fonts.length > 0 ? fonts : undefined,
        headers: CACHE_HEADERS,
      },
    );
  } catch (err) {
    console.error("[og] render error", err);
    return fallbackResponse(showcase.title, fonts);
  }

  // Fire-and-forget cache write: clone the response body, upload, and patch
  // the DB. If any of this fails we still return the image — the next hit
  // will retry.
  try {
    const pngBuffer = await imageResponse.clone().arrayBuffer();
    const pngPath = `${showcase.id}.png`;

    const { error: uploadError } = await svc.storage
      .from(OG_BUCKET)
      .upload(pngPath, pngBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (!uploadError) {
      const nowIso = new Date().toISOString();
      const { error: updateError } = await svc
        .from("showcases")
        .update({
          og_image_path: `${OG_BUCKET}/${pngPath}`,
          og_image_regenerated_at: nowIso,
        })
        .eq("id", showcase.id);

      if (updateError) {
        console.error("[og] db update failed");
      } else {
        console.log(`[og] generated ${showcase.id}`);
      }
    } else {
      console.error("[og] upload failed");
    }
  } catch (err) {
    console.error("[og] cache write failed", err);
  }

  return imageResponse;
}

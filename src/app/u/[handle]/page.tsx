import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getProfileByHandle } from "@/lib/profile/queries";
import { slugGradient } from "@/lib/ui/placeholder-gradient";
import type { ProfileRole } from "@/lib/app/context";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

function roleBadge(role: ProfileRole | null) {
  if (role === "creator") {
    return (
      <span className="inline-flex items-center rounded-full border border-foreground/20 bg-foreground/10 px-2.5 py-0.5 text-xs text-foreground keep-all">
        크리에이터
      </span>
    );
  }
  if (role === "studio") {
    return (
      <span className="inline-flex items-center rounded-full border border-foreground/20 bg-foreground/10 px-2.5 py-0.5 text-xs text-foreground keep-all">
        스튜디오
      </span>
    );
  }
  return null;
}

function getThumbnail(
  content: Record<string, unknown>,
  fallbackHandle: string,
): { type: "url"; url: string } | { type: "gradient"; gradient: string } {
  const native = content.native_video as Record<string, unknown> | undefined;
  if (typeof native?.url === "string" && native.url) {
    return { type: "url", url: native.url };
  }
  const images = content.images as unknown[] | undefined;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0] as Record<string, unknown>;
    if (typeof first?.url === "string" && first.url) {
      return { type: "url", url: first.url };
    }
  }
  return { type: "gradient", gradient: slugGradient(fallbackHandle) };
}

// ─── metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const data = await getProfileByHandle(handle);
  if (!data) {
    return { title: "YAGI", robots: { index: false } };
  }
  return {
    title: `@${data.profile.handle} · YAGI`,
    description: data.profile.bio ?? undefined,
    robots: { index: true, follow: true },
  };
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const data = await getProfileByHandle(handle);
  if (!data) notFound();

  const { profile, submissions } = data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === profile.id;

  const avatarGradient = slugGradient(profile.handle);
  const initial = profile.display_name?.[0]?.toUpperCase() ?? "?";

  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link
          href="/"
          aria-label="YAGI 홈"
          className="font-[family-name:var(--font-fraunces)] text-lg italic font-semibold tracking-tight"
        >
          YAGI
        </Link>
        {user ? (
          <Link
            href="/app"
            className="inline-flex items-center rounded-full border border-foreground px-4 py-1.5 text-xs uppercase tracking-[0.12em] hover:bg-foreground hover:text-background transition-colors"
          >
            앱으로
          </Link>
        ) : (
          <Link
            href="/signin"
            className="inline-flex items-center rounded-full border border-foreground px-4 py-1.5 text-xs uppercase tracking-[0.12em] hover:bg-foreground hover:text-background transition-colors"
          >
            참여 시작하기
          </Link>
        )}
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 space-y-10">
        {/* ── Hero ── */}
        <section className="flex flex-col items-center text-center space-y-4">
          {/* Avatar */}
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-32 h-32 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-3xl font-semibold text-white select-none"
              style={{ background: avatarGradient }}
              aria-hidden="true"
            >
              {initial}
            </div>
          )}

          {/* Name + badge */}
          <div className="space-y-1.5">
            <h1 className="font-[family-name:var(--font-fraunces)] text-2xl italic font-semibold keep-all">
              {profile.display_name}
            </h1>
            {roleBadge(profile.role)}
            <p className="text-sm text-muted-foreground">@{profile.handle}</p>
          </div>
        </section>

        {/* ── Meta ── */}
        {(profile.bio || profile.instagram_handle) && (
          <section className="space-y-3 text-center">
            {profile.bio && (
              <p className="text-sm leading-relaxed text-foreground keep-all max-w-md mx-auto">
                {profile.bio.slice(0, 200)}
              </p>
            )}
            {profile.instagram_handle && (
              <a
                href={`https://instagram.com/${profile.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                </svg>
                @{profile.instagram_handle}
              </a>
            )}
          </section>
        )}

        <hr className="border-border" />

        {/* ── Submissions ── */}
        <section className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground keep-all">
            참여한 작품
          </h2>

          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground keep-all text-center py-12">
              아직 참여한 챌린지가 없어요
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {submissions.map((sub) => {
                const thumb = getThumbnail(sub.content, profile.handle);
                const challengeHref = `/challenges/${sub.challenge.slug}/gallery#submission-${sub.id}`;
                return (
                  <Link
                    key={sub.id}
                    href={challengeHref}
                    className="group block rounded-xl overflow-hidden border border-border hover:border-foreground/40 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video w-full overflow-hidden">
                      {thumb.type === "url" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb.url}
                          alt={sub.challenge.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{ background: thumb.gradient }}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Card info */}
                    <div className="px-3 py-2.5 space-y-0.5">
                      <p className="text-xs text-muted-foreground keep-all">
                        챌린지
                      </p>
                      <p className="text-sm font-medium leading-snug keep-all line-clamp-2">
                        {sub.challenge.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(sub.created_at)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Owner edit affordance ── */}
        {isOwner && (
          <div className="flex justify-center pt-4">
            <Link
              href="/app/settings/profile"
              className="inline-flex items-center rounded-full border border-foreground px-5 py-2 text-sm hover:bg-foreground hover:text-background transition-colors"
            >
              프로필 편집
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

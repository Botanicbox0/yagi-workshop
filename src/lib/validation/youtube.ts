export type YouTubeUrlKind = "watch" | "shorts" | "embed" | "youtu.be";

export type ParsedYouTubeUrl = {
  kind: YouTubeUrlKind;
  videoId: string;
};

const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_PATTERNS = [
  // youtube.com/watch?v=<id> with www, m, or no subdomain
  {
    kind: "watch" as const,
    regex: /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})(?:[&?].*)?$/,
  },
  // m.youtube.com/watch?v=<id>
  {
    kind: "watch" as const,
    regex: /^https?:\/\/m\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})(?:[&?].*)?$/,
  },
  // youtu.be/<id> with optional ?t=
  {
    kind: "youtu.be" as const,
    regex: /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:\?.*)?$/,
  },
  // youtube.com/shorts/<id>
  {
    kind: "shorts" as const,
    regex: /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})$/,
  },
  // youtube.com/embed/<id>
  {
    kind: "embed" as const,
    regex: /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})$/,
  },
];

export function parseYouTubeUrl(raw: string): ParsedYouTubeUrl | null {
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }

  const trimmed = raw.trim();

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const videoId = match[1];
      if (VIDEO_ID_REGEX.test(videoId)) {
        return {
          kind: pattern.kind,
          videoId,
        };
      }
    }
  }

  return null;
}

export function isValidYouTubeUrl(raw: string): boolean {
  return parseYouTubeUrl(raw) !== null;
}
